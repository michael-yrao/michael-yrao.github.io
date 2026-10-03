import { Injectable, Signal, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Update, collab, getSyncedVersion, receiveUpdates, sendableUpdates } from '@codemirror/collab';
import { ChangeSet, Extension, Text } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

import { JOIN_PARAM } from './interview-params';
import { Authority, authorityVersion, createAuthority, receivePush } from './collab-authority';
import { Host, PEER_FACTORY, Transport } from './peer-transport';
import { InitMessage, NAME_MAX_LENGTH, SessionMessage, WireUpdate, parseSessionMessage } from './session-message';

export { JOIN_PARAM, isCandidateParams } from './interview-params';
export type InterviewRole = 'none' | 'interviewer' | 'candidate';
export type SessionStatus = 'idle' | 'connecting' | 'waiting' | 'open' | 'closed' | 'error';
export interface SharedDoc {
  readonly problem: number;
  readonly version: number;
  readonly doc: string;
}

const INTERVIEWER_START_VERSION = 0;
const NAME_STORAGE_KEY = 'po-interview-name';
export const CONNECT_TIMEOUT_MS = 20_000;

function loadName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY)?.trim().slice(0, NAME_MAX_LENGTH) ?? '';
  } catch (err) {
    console.error(`Interview name: could not read ${NAME_STORAGE_KEY}`, err);
    return '';
  }
}

function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch (err) {
    console.error(`Interview name: could not save ${NAME_STORAGE_KEY}`, err);
  }
}

function toWire(update: Update): WireUpdate {
  return { clientID: update.clientID, changes: update.changes.toJSON() };
}

function fromWire(wire: WireUpdate): Update {
  return { clientID: wire.clientID, changes: ChangeSet.fromJSON(wire.changes) };
}

/** Decodes peer updates; a changeset that will not decode is logged and the whole batch dropped. */
function decodeUpdates(wire: readonly WireUpdate[]): readonly Update[] | null {
  try {
    return wire.map(fromWire);
  } catch (error) {
    console.error('Dropped session updates that would not decode', error);
    return null;
  }
}

/**
 * One interview session. The interviewer's page is the `@codemirror/collab` authority; both
 * editors are collab clients. The service owns the PeerJS lifecycle (through `PEER_FACTORY`),
 * message routing and the extensions that wire an editor into the session.
 */
@Injectable({ providedIn: 'root' })
export class InterviewSessionService {
  private readonly factory = inject(PEER_FACTORY);
  private readonly router = inject(Router);
  private readonly clientID = crypto.randomUUID();

  private readonly roleState = signal<InterviewRole>('none');
  private readonly statusState = signal<SessionStatus>('idle');
  private readonly inviteUrlState = signal<string | null>(null);
  private readonly sharedDocState = signal<SharedDoc | null>(null);
  private readonly myNameState = signal<string>(loadName());
  private readonly peerNameState = signal<string | null>(null);

  readonly role: Signal<InterviewRole> = this.roleState.asReadonly();
  readonly status: Signal<SessionStatus> = this.statusState.asReadonly();
  readonly inviteUrl: Signal<string | null> = this.inviteUrlState.asReadonly();
  readonly sharedDoc: Signal<SharedDoc | null> = this.sharedDocState.asReadonly();
  readonly myName: Signal<string> = this.myNameState.asReadonly();
  /** Null until the other side has sent a name. */
  readonly peerName: Signal<string | null> = this.peerNameState.asReadonly();

  private host: Host | null = null;
  private transport: Transport | null = null;
  private authority: Authority | null = null;
  private joinedPeerId: string | null = null;
  private pageProblem = 0;

  /** Every accepted update from version `logBase` on. Never trimmed, so a re-created editor can replay it. */
  private log: readonly Update[] = [];
  private logBase = INTERVIEWER_START_VERSION;
  private view: EditorView | null = null;
  private isPushScheduled = false;
  private isPushInFlight = false;

  async start(problem: number, stub: string, inviteBase: string): Promise<void> {
    this.roleState.set('interviewer');
    this.statusState.set('connecting');
    this.peerNameState.set(null);
    this.authority = createAuthority(Text.of(stub.split('\n')));
    this.log = [];
    this.logBase = INTERVIEWER_START_VERSION;
    this.sharedDocState.set({ problem, version: INTERVIEWER_START_VERSION, doc: stub });
    try {
      this.host = await this.factory.host(
        (transport) => this.acceptConnection(transport, problem),
        (error) => this.fail('Peer error', error),
      );
    } catch (error) {
      this.fail('Could not open a peer', error);
      return;
    }
    const url = new URL(inviteBase);
    url.searchParams.set(JOIN_PARAM, this.host.id);
    this.inviteUrlState.set(url.toString());
    if (this.statusState() === 'connecting') {
      this.statusState.set('waiting');
    }
  }

  async join(peerId: string, problem: number): Promise<void> {
    this.pageProblem = problem;
    if (this.joinedPeerId === peerId) {
      return;
    }
    this.joinedPeerId = peerId;
    this.peerNameState.set(null);
    this.roleState.set('candidate');
    this.statusState.set('connecting');
    try {
      const transport = await this.connectWithTimeout(peerId);
      this.transport = transport;
      transport.onMessage((data) => this.handleCandidateMessage(parseSessionMessage(data)));
      transport.onClose(() => this.handleCandidateClose(transport));
    } catch (error) {
      this.fail('Could not connect to the interviewer', error);
    }
  }

  end(): void {
    const isInterviewer = this.roleState() === 'interviewer';
    const transport = this.transport;
    this.transport = null;
    this.statusState.set('closed');
    transport?.send({ type: 'end' } satisfies SessionMessage);
    transport?.close();
    this.host?.destroy();
    this.host = null;
    if (isInterviewer) {
      this.resetToStart();
    }
  }

  /** Sets this side's name (trimmed, cut to the limit), stores it and sends it to the other side. */
  setMyName(name: string): void {
    const clean = name.trim().slice(0, NAME_MAX_LENGTH);
    this.myNameState.set(clean);
    saveName(clean);
    this.sendName();
  }

  collabExtensions(): readonly Extension[] {
    const startVersion = this.sharedDocState()?.version ?? INTERVIEWER_START_VERSION;
    const register = (view: EditorView) => this.registerView(view);
    const unregister = (view: EditorView) => this.unregisterView(view);
    const onUpdate = () => this.schedulePush();
    const plugin = ViewPlugin.fromClass(
      class {
        constructor(private readonly view: EditorView) {
          register(view);
        }
        update(): void {
          onUpdate();
        }
        destroy(): void {
          unregister(this.view);
        }
      },
    );
    return [collab({ startVersion, clientID: this.clientID }), plugin];
  }

  /** Dials the interviewer; a connect that outlasts `CONNECT_TIMEOUT_MS` fails, and a late transport is closed unused. */
  private connectWithTimeout(peerId: string): Promise<Transport> {
    return new Promise<Transport>((resolve, reject) => {
      let isTimedOut = false;
      const timer = setTimeout(() => {
        isTimedOut = true;
        reject(new Error(`No answer from the interviewer within ${CONNECT_TIMEOUT_MS} ms`));
      }, CONNECT_TIMEOUT_MS);
      this.factory.connect(peerId).then(
        (transport) => {
          clearTimeout(timer);
          if (isTimedOut) {
            transport.close();
            return;
          }
          resolve(transport);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  /** Puts the service back in its starting state, as after construction. */
  private resetToStart(): void {
    this.roleState.set('none');
    this.statusState.set('idle');
    this.inviteUrlState.set(null);
    this.sharedDocState.set(null);
    this.peerNameState.set(null);
    this.authority = null;
    this.log = [];
    this.logBase = INTERVIEWER_START_VERSION;
    this.isPushScheduled = false;
    this.isPushInFlight = false;
    this.transport = null;
  }

  private sendName(): void {
    this.transport?.send({ type: 'name', name: this.myNameState() } satisfies SessionMessage);
  }

  // ---- editor wiring ----

  private registerView(view: EditorView): void {
    this.view = view;
    // A dispatch is not allowed while the view is still being built; replay the gap right after.
    queueMicrotask(() => this.syncView());
  }

  private unregisterView(view: EditorView): void {
    if (this.view === view) {
      this.view = null;
    }
  }

  /** Brings the registered view up to the log. Idempotent: it applies only what the view has not yet seen. */
  private syncView(): void {
    const view = this.view;
    if (view === null) {
      return;
    }
    const behind = this.log.slice(getSyncedVersion(view.state) - this.logBase);
    if (behind.length === 0) {
      return;
    }
    try {
      view.dispatch(receiveUpdates(view.state, behind));
    } catch (error) {
      console.error('Could not apply session updates to the editor', error);
    }
  }

  private schedulePush(): void {
    if (this.isPushScheduled) {
      return;
    }
    this.isPushScheduled = true;
    // An editor update listener must not dispatch, so the push runs on the next microtask.
    queueMicrotask(() => {
      this.isPushScheduled = false;
      this.pushLocalUpdates();
    });
  }

  private pushLocalUpdates(): void {
    const view = this.view;
    if (view === null || this.isPushInFlight) {
      return;
    }
    const updates = sendableUpdates(view.state);
    if (updates.length === 0) {
      return;
    }
    const version = getSyncedVersion(view.state);
    if (this.roleState() === 'interviewer') {
      this.acceptPush(version, updates);
      return;
    }
    if (this.transport === null || this.statusState() !== 'open') {
      return;
    }
    this.isPushInFlight = true;
    this.transport.send({ type: 'push', version, updates: updates.map(toWire) } satisfies SessionMessage);
  }

  // ---- interviewer ----

  private acceptConnection(transport: Transport, problem: number): void {
    if (this.transport !== null) {
      transport.close();
      return;
    }
    const authority = this.authority;
    if (authority === null) {
      transport.close();
      return;
    }
    this.transport = transport;
    this.statusState.set('open');
    transport.onMessage((data) => this.handleInterviewerMessage(parseSessionMessage(data)));
    transport.onClose(() => this.handleInterviewerClose(transport));
    transport.send({
      type: 'init',
      problem,
      version: authorityVersion(authority),
      doc: authority.doc.toString(),
    } satisfies InitMessage);
    this.sendName();
  }

  private handleInterviewerClose(transport: Transport): void {
    if (this.transport !== transport) {
      return;
    }
    this.transport = null;
    // The host stays alive, so a reconnecting candidate flips the status back to open.
    this.statusState.set('closed');
  }

  private handleInterviewerMessage(message: SessionMessage | null): void {
    if (message === null) {
      return;
    }
    if (message.type === 'name') {
      this.peerNameState.set(message.name);
      return;
    }
    if (message.type !== 'push') {
      console.error('Unexpected message from the candidate', message.type);
      return;
    }
    const updates = decodeUpdates(message.updates);
    if (updates !== null) {
      this.acceptPush(message.version, updates);
    }
  }

  /** Pushes into the authority; what it accepts goes to the candidate and back into the interviewer's own editor. */
  private acceptPush(version: number, updates: readonly Update[]): void {
    const authority = this.authority;
    if (authority === null) {
      return;
    }
    let result;
    try {
      result = receivePush(authority, version, updates);
    } catch (error) {
      console.error('Dropped a push that does not fit the document', error);
      return;
    }
    if (result.accepted.length === 0) {
      return;
    }
    this.authority = result.authority;
    this.log = result.authority.updates;
    this.transport?.send({ type: 'updates', updates: result.accepted.map(toWire) } satisfies SessionMessage);
    this.syncView();
  }

  // ---- candidate ----

  private handleCandidateMessage(message: SessionMessage | null): void {
    if (message === null) {
      return;
    }
    switch (message.type) {
      case 'init':
        this.receiveInit(message);
        return;
      case 'updates':
        this.receiveUpdateBatch(message.updates);
        return;
      case 'name':
        this.peerNameState.set(message.name);
        return;
      case 'end':
        this.endFromPeer();
        return;
      default:
        console.error('Unexpected message from the interviewer', message.type);
    }
  }

  private receiveInit(init: InitMessage): void {
    if (this.sharedDocState() !== null) {
      console.error('Dropped a second init');
      return;
    }
    this.logBase = init.version;
    this.log = [];
    this.sharedDocState.set({ problem: init.problem, version: init.version, doc: init.doc });
    this.statusState.set('open');
    this.sendName();
    if (init.problem !== this.pageProblem) {
      Promise.resolve(this.router.navigate(['/practice', init.problem], { queryParamsHandling: 'preserve' })).catch(
        (error) => console.error('Could not navigate to the session problem', error),
      );
    }
  }

  private receiveUpdateBatch(wire: readonly WireUpdate[]): void {
    const updates = decodeUpdates(wire);
    if (updates === null) {
      return;
    }
    this.log = [...this.log, ...updates];
    this.isPushInFlight = false;
    this.syncView();
    this.schedulePush();
  }

  private endFromPeer(): void {
    const transport = this.transport;
    this.transport = null;
    this.statusState.set('closed');
    transport?.close();
  }

  private handleCandidateClose(transport: Transport): void {
    if (this.transport === transport) {
      this.transport = null;
      this.statusState.set('closed');
    }
  }

  private fail(context: string, error: unknown): void {
    console.error(context, error);
    this.statusState.set('error');
  }
}
