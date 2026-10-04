import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Update } from '@codemirror/collab';
import { Extension, Text } from '@codemirror/state';

import { isAwayNow, largePasteExtension } from './candidate-activity';
import { CandidateSide } from './candidate-side';
import { clearCandidateLock, writeCandidateLock } from './candidate-lock';
import { Authority } from './collab-authority';
import { InterviewerLoop, LoopIds } from './interviewer-loop';
import { HostKeys, generateHostKeys, parsePackedKey, parsePublicKey, signCustom } from './host-key';
import { HOST_PARAM, JOIN_PARAM } from './interview-params';
import { Host, PEER_FACTORY, Transport } from './peer-transport';
import { ClientConnection, ClientHooks, ClientIdentity, dialWithTimeout } from './session-client';
import { AuthorityChange, HostEvents, SessionHost } from './session-host';
import { EditorSync, sessionExtensions } from './session-editor';
import { sessionIdFromPublicKey } from './session-id';
import {
  CUSTOM_PROBLEM,
  CandidateSeat,
  CustomProblem,
  InitMessage,
  NAME_MAX_LENGTH,
  NO_MARKS,
  Participant,
  RevisedDoc,
  WireUpdate,
} from './session-message';
import { clearSession, loadSession, pruneExpiredSessions, saveSession } from './session-store';
import {
  RECONNECT_DELAY_MS,
  buildRoleUrl,
  deriveIds,
  navigateToSessionProblem,
  loadName,
  saveName,
  sessionPageUrl,
} from './session-support';
import { applyUpdates, decodeUpdates, textOf, toWire } from './wire-updates';

export { JOIN_PARAM, HOST_PARAM, isCandidateParams } from './interview-params';
export { CONNECT_TIMEOUT_MS } from './session-client';
export { RECLAIM_TIMEOUT_MS, RECONNECT_DELAY_MS } from './session-support';
export { CUSTOM_PROBLEM } from './session-message';
export type { CustomProblem } from './session-message';
/** What the interviewer writes; the service signs it into a `CustomProblem`. */
export type CustomDraft = Pick<CustomProblem, 'title' | 'statement'>;
export type InterviewRole = 'none' | 'interviewer' | 'candidate';
export type SessionStatus = 'idle' | 'connecting' | 'waiting' | 'open' | 'reconnecting' | 'closed' | 'error';
export interface SharedDoc {
  readonly problem: number;
  readonly version: number;
  readonly doc: string;
  /** 0 for the first doc a side sets; every later init or takeover adds 1, so the page can re-create its editor. */
  readonly epoch: number;
}

const INTERVIEWER_START_VERSION = 0;
const FIRST_EPOCH = 0;

type SessionRole = 'interviewer' | 'candidate';

/**
 * One interview session, with two PeerJS ids (see `session-id.ts`). Every interviewer tab runs the dial-or-host
 * loop on the host peer id (`InterviewerLoop`); the candidate registers the session id and listens
 * (`CandidateSide`), and the hosting tab dials it from a fresh Peer. The hosting tab's page is the
 * `@codemirror/collab` authority; every editor is a collab client. Each connection starts with a handshake in
 * which the client challenges and the host proves, so no code or name leaves a client before the host has proved
 * it holds the session's private key. The session survives a reload or a lost host: the link carries the key,
 * and each tab saves its synced document under its own role. After a drop the candidate stays read-only and
 * keeps listening; a newly verified host replaces its connection. An interviewer client re-runs its loop.
 */
@Injectable({ providedIn: 'root' })
export class InterviewSessionService {
  private readonly factory = inject(PEER_FACTORY);
  private readonly router = inject(Router);
  /** This tab's collab clientID, and its id in the roster. */
  readonly selfId = crypto.randomUUID();

  private readonly roleState = signal<InterviewRole>('none');
  private readonly statusState = signal<SessionStatus>('idle');
  private readonly inviteUrlState = signal<string | null>(null);
  private readonly hostUrlState = signal<string | null>(null);
  private readonly sharedDocState = signal<SharedDoc | null>(null);
  private readonly problemState = signal<number | null>(null);
  private readonly customState = signal<CustomProblem | null>(null);
  private readonly myNameState = signal<string>(loadName());
  private readonly rosterState = signal<readonly Participant[]>([]);

  readonly role: Signal<InterviewRole> = this.roleState.asReadonly();
  readonly status: Signal<SessionStatus> = this.statusState.asReadonly();
  readonly inviteUrl: Signal<string | null> = this.inviteUrlState.asReadonly();
  /** The interviewer's private link (it carries the key); null for the candidate. */
  readonly hostUrl: Signal<string | null> = this.hostUrlState.asReadonly();
  readonly sharedDoc: Signal<SharedDoc | null> = this.sharedDocState.asReadonly();
  /** The problem the session is pinned to; null when there is no session. */
  readonly problem: Signal<number | null> = this.problemState.asReadonly();
  /** The interviewer's own problem, when the session has one. */
  readonly custom: Signal<CustomProblem | null> = this.customState.asReadonly();
  /** False while a tab is waiting to reconnect: an edit then would be dropped by the next init. */
  readonly isEditable: Signal<boolean> = computed(() => this.statusState() !== 'reconnecting');
  readonly myName: Signal<string> = this.myNameState.asReadonly();
  /** Everyone in the session as the host last announced it; empty until the first roster arrives. */
  readonly roster: Signal<readonly Participant[]> = this.rosterState.asReadonly();

  private sessionHost: SessionHost | null = null;
  private connection: ClientConnection | null = null;
  private hostKeys: HostKeys | null = null;
  private publicKey: CryptoKey | null = null;
  private sessionId: string | null = null;
  /** The id interviewer tabs register and dial; null for a candidate, which must never learn it. */
  private hostPeerId: string | null = null;
  /** The raw `?host=` / `?join=` value this session was opened from. */
  private linkValue: string | null = null;
  private pageProblem = 0;
  /** The candidate's marks from the latest roster that had a candidate: the seed when this tab takes over as host. */
  private lastCandidateSeat: CandidateSeat = NO_MARKS;
  private stubFn: () => string = () => '';

  /** Bumped by every start, resume, join and end; async work that finds it changed has been superseded. */
  private generation = 0;
    private redialTimer: ReturnType<typeof setTimeout> | null = null;

  /** The document as of the last accepted update, advanced one batch at a time. */
  private syncedText: Text | null = null;
  /** The session revision of `syncedText`: the init's revision plus the updates applied since. */
  private syncedRev = 0;
  private readonly editor = new EditorSync({
    isReadOnly: () => !this.isEditable(),
    send: (version, updates) => this.sendPush(version, updates),
  });

  private readonly clientHooks: ClientHooks = {
    getName: () => this.myNameState(),
    getDoc: () => this.helloDoc(),
    getCustom: () => this.helloCustom(),
    onVerified: (connection) => this.handleVerified(connection),
    onInit: (init) => this.handleInit(init),
    onUpdates: (updates) => this.handleUpdates(updates),
    onRoster: (participants) => this.setRoster(participants),
    onEnd: () => this.handleEndFromHost(),
    onClosed: (connection) => this.handleClientClosed(connection),
  };

  private readonly loop = new InterviewerLoop(this.factory, {
    ids: () => this.loopIds(),
    isCurrent: (generation) => generation === this.generation,
    createHost: (sessionId, takeover) => this.createHost(sessionId, takeover),
    onClient: (transport) => this.attachClient(transport),
    onHosting: (sessionHost, peer) => this.startHosting(sessionHost, peer),
    onHostError: (sessionHost, error) => this.handleHostError(sessionHost, error),
    onBrokerDisconnected: (sessionHost) => this.handleBrokerDisconnected(sessionHost),
    onFail: (context, error) => this.fail(context, error),
  });

  private readonly candidate = new CandidateSide(this.factory, {
    openClient: (transport) => this.openClient(transport),
    hasVerifiedHost: () => this.connection !== null,
    onAway: (isAway) => this.connection?.sendAway(isAway),
    onError: (context) => this.fail(context),
  });

  private readonly hostEvents: HostEvents = {
    onRoster: (participants) => this.setRoster(participants),
    onAuthority: (authority, change, rev) => this.applyAuthority(authority, change, rev),
    onEndRequested: () => this.end(),
    onCustomAdopted: (custom) => this.adoptCustom(custom),
  };

  async start(problem: number, stub: string, inviteBase: string, draft: CustomDraft | null = null): Promise<void> {
    const generation = this.beginSession('interviewer', problem, null);
    this.pageProblem = problem;
    this.stubFn = () => stub;
    try {
      const keys = await generateHostKeys();
      const { sessionId, hostPeerId } = await deriveIds(keys);
      if (generation !== this.generation) {
        return;
      }
      const custom = await this.signedCustom(keys, sessionId, problem, draft);
      if (generation !== this.generation) {
        return;
      }
      this.customState.set(custom);
      this.adoptIdentity(keys, sessionId, hostPeerId, inviteBase);
      pruneExpiredSessions();
      // The stub is saved as the authority source: the host loop reads it back as the saved doc.
      saveSession('interviewer', sessionId, problem, stub, 0, custom);
    } catch (error) {
      if (generation === this.generation) {
        this.fail('Could not create the interview keys', error);
      }
      return;
    }
    await this.loop.run(generation, null);
  }

  /** The draft signed with the interviewer key; null for a numbered problem, which has no custom problem. */
  private async signedCustom(keys: HostKeys, sessionId: string, problem: number, draft: CustomDraft | null): Promise<CustomProblem | null> {
    if (draft === null || problem !== CUSTOM_PROBLEM) {
      return null;
    }
    const signature = await signCustom(keys.privateKey, sessionId, draft.title, draft.statement);
    return { title: draft.title, statement: draft.statement, signature };
  }

  /** Joins as an interviewer from a host link: hosts the session if nobody does, otherwise joins the host. */
  async resume(packed: string, problem: number, stubFn: () => string): Promise<void> {
    if (this.linkValue === packed && this.roleState() === 'interviewer') {
      return;
    }
    const generation = this.generation;
    const keys = await parsePackedKey(packed);
    if (generation !== this.generation) {
      return;
    }
    if (keys === null) {
      console.error('Interview resume: the host link is not a valid interviewer key');
      return;
    }
    const { sessionId, hostPeerId } = await deriveIds(keys);
    if (generation !== this.generation) {
      return;
    }
    const pageUrl = window.location.href;
    this.stubFn = stubFn;
    const begun = this.beginSession('interviewer', problem, packed);
    this.pageProblem = problem;
    pruneExpiredSessions();
    // The saved problem, not the page's, decides which problem the links name.
    const saved = loadSession('interviewer', sessionId);
    const sessionProblem = saved?.problem ?? problem;
    this.problemState.set(sessionProblem);
    this.customState.set(sessionProblem === CUSTOM_PROBLEM ? (saved?.custom ?? null) : null);
    this.adoptIdentity(keys, sessionId, hostPeerId, sessionPageUrl(pageUrl, sessionProblem));
    await this.loop.run(begun, null);
  }

  async join(publicRaw: string, problem: number): Promise<void> {
    this.pageProblem = problem;
    if (this.linkValue === publicRaw && this.roleState() === 'candidate') {
      return;
    }
    const generation = this.beginSession('candidate', problem, publicRaw);
    try {
      const publicKey = await parsePublicKey(publicRaw);
      if (publicKey === null) {
        this.fail('Interview join: the link is not a valid interview key');
        return;
      }
      const sessionId = await sessionIdFromPublicKey(publicRaw);
      if (generation !== this.generation) {
        return;
      }
      this.publicKey = publicKey;
      this.sessionId = sessionId;
      writeCandidateLock(problem);
    } catch (error) {
      if (generation === this.generation) {
        this.fail('Could not read the interview link', error);
      }
      return;
    }
    // No host yet is not a failure: the candidate listens until one dials in or the session is superseded.
    await this.listen();
  }

  /** Ends the session for everyone. An interviewer's End also resets this tab and strips `?host=` from the address. */
  end(): void {
    const role = this.roleState();
    const { sessionHost, connection, sessionId } = this;
    this.cancelPending();
    this.sessionHost = null;
    this.connection = null;
    this.candidate.stop();
    if (role !== 'interviewer') {
      if (role === 'candidate') {
        clearCandidateLock();
      }
      this.setStatus('closed');
      connection?.close();
      return;
    }
    if (sessionHost !== null) {
      sessionHost.end();
    } else {
      connection?.endSession();
    }
    this.finishInterviewerSession(sessionId);
  }

  /** Sets this side's name (trimmed, cut to the limit), stores it and tells the session. */
  setMyName(name: string): void {
    const clean = name.trim().slice(0, NAME_MAX_LENGTH);
    this.myNameState.set(clean);
    saveName(clean);
    this.sessionHost?.refreshRoster();
    this.connection?.sendName(clean);
  }

  collabExtensions(): readonly Extension[] {
    const startVersion = this.sharedDocState()?.version ?? INTERVIEWER_START_VERSION;
    const session = sessionExtensions(startVersion, this.selfId, !this.isEditable(), {
      onRegister: (view) => this.editor.register(view),
      onUnregister: (view) => this.editor.unregister(view),
      onUpdate: () => this.editor.schedulePush(),
    });
    return this.roleState() === 'candidate' ? [...session, largePasteExtension(() => this.connection?.sendPaste())] : session;
  }

  // ---- session lifecycle ----

  /** Resets to a fresh session of `role` and returns its generation; the identity-dependent work follows. */
  private beginSession(role: SessionRole, problem: number, linkValue: string | null): number {
    this.cancelPending();
    this.closeTransports();
    this.resetSessionState();
    this.linkValue = linkValue;
    this.problemState.set(problem);
    this.roleState.set(role);
    this.setStatus('connecting');
    return this.generation;
  }

  /** Takes the keys and session id as this session's identity and builds the two links on `pageUrl`. */
  private adoptIdentity(keys: HostKeys, sessionId: string, hostPeerId: string, pageUrl: string): void {
    this.hostKeys = keys;
    this.publicKey = keys.publicKey;
    this.sessionId = sessionId;
    this.hostPeerId = hostPeerId;
    this.linkValue = keys.packed;
    this.hostUrlState.set(buildRoleUrl(pageUrl, HOST_PARAM, keys.packed, JOIN_PARAM));
    this.inviteUrlState.set(buildRoleUrl(pageUrl, JOIN_PARAM, keys.publicRaw, HOST_PARAM));
  }

  /** Cancels the pending retry wait and re-dial timer and supersedes any in-flight async work. */
  private cancelPending(): void {
    this.generation += 1;
    this.loop.cancelWait();
    if (this.redialTimer !== null) {
      clearTimeout(this.redialTimer);
      this.redialTimer = null;
    }
  }

  /** Closes the client connection, the candidate's listener and the hosted Peer without telling anyone the session ended. */
  private closeTransports(): void {
    const { connection, sessionHost } = this;
    this.connection = null;
    this.sessionHost = null;
    this.candidate.stop();
    connection?.close();
    sessionHost?.shutdown();
  }

  /** Everything a session owns except its role, status and problem. */
  private resetSessionState(): void {
    this.editor.reset(INTERVIEWER_START_VERSION);
    this.inviteUrlState.set(null);
    this.hostUrlState.set(null);
    this.sharedDocState.set(null);
    this.rosterState.set([]);
    this.customState.set(null);
    this.lastCandidateSeat = NO_MARKS;
    this.hostKeys = null;
    this.publicKey = null;
    this.sessionId = null;
    this.hostPeerId = null;
    this.linkValue = null;
    this.syncedText = null;
    this.syncedRev = 0;
    this.loop.clearFailures();
  }

  /** Puts the service back in its starting state, as after construction. */
  private resetToStart(): void {
    this.closeTransports();
    this.resetSessionState();
    this.roleState.set('none');
    this.problemState.set(null);
    this.setStatus('idle');
  }

  /** An interviewer's session is over: forget its saved doc, reset, and drop `?host=` so a reload no longer resumes it. */
  private finishInterviewerSession(sessionId: string | null): void {
    if (sessionId !== null) {
      clearSession('interviewer', sessionId);
    }
    this.resetToStart();
    this.router
      .navigate([], { queryParams: { [HOST_PARAM]: null }, queryParamsHandling: 'merge', replaceUrl: true })
      .catch((err: unknown) => console.error('Interview end: could not drop the host link from the address', err));
  }

  private setStatus(status: SessionStatus): void {
    this.statusState.set(status);
    this.editor.applyReadOnly();
  }

  private isSynced(): boolean {
    const status = this.statusState();
    return status === 'open' || status === 'waiting';
  }

  /** An interviewer who is synced shows Connected while a candidate is in the roster, Waiting otherwise. */
  private refreshInterviewerStatus(): void {
    if (this.roleState() !== 'interviewer' || !this.isSynced()) {
      return;
    }
    this.setStatus(this.rosterState().some((participant) => participant.role === 'candidate') ? 'open' : 'waiting');
  }

  private setRoster(participants: readonly Participant[]): void {
    const { isAway, awayCount, pasteCount } = participants.find((participant) => participant.role === 'candidate') ?? this.lastCandidateSeat;
    this.lastCandidateSeat = { isAway, awayCount, pasteCount };
    this.rosterState.set(participants);
    this.refreshInterviewerStatus();
  }

  private fail(context: string, error?: unknown): void {
    console.error(...(error === undefined ? [context] : [context, error]));
    this.setStatus('error');
  }

  // ---- the interviewer loop ----

  private loopIds(): LoopIds | null {
    const { sessionId, hostPeerId } = this;
    return sessionId === null || hostPeerId === null ? null : { sessionId, hostPeerId };
  }

  /** A fresh host for one hosting attempt; the candidate's own dial goes through a fresh Peer, never the hosting one. */
  private createHost(sessionId: string, takeover: RevisedDoc | null): SessionHost | null {
    const keys = this.hostKeys;
    if (keys === null) {
      return null;
    }
    const saved = loadSession('interviewer', sessionId);
    return new SessionHost(
      {
        sessionId,
        keys,
        selfId: this.selfId,
        savedDoc: saved?.doc ?? null,
        savedRev: saved?.rev ?? 0,
        takeoverDoc: takeover?.doc ?? null,
        takeoverRev: takeover?.rev ?? 0,
        getName: () => this.myNameState(),
        getProblem: () => this.problemState(),
        stubFn: () => this.stubFn(),
        candidateSeat: this.lastCandidateSeat,
        getCustom: () => this.customState(),
        // A fresh Peer per dial, so the candidate never sees the host peer id.
        dialCandidate: () => dialWithTimeout(this.factory, sessionId),
      },
      this.hostEvents,
    );
  }

  private startHosting(sessionHost: SessionHost, peer: Host): void {
    this.sessionHost = sessionHost;
    sessionHost.attach(peer);
    if (this.statusState() === 'connecting' || this.statusState() === 'reconnecting') {
      this.setStatus('waiting');
    }
    this.refreshInterviewerStatus();
  }

  // ---- the hosting tab ----

  private handleHostError(sessionHost: SessionHost, error: unknown): void {
    if (this.sessionHost !== sessionHost) {
      return;
    }
    // Before the generic failure path: a taken id means another tab holds the lock, so this one steps down.
    const reaction = sessionHost.reactToPeerError(error);
    if (reaction === 'demote') {
      this.demote();
    } else if (reaction === 'fatal') {
      this.fail('Peer error', error);
    }
  }

  private handleBrokerDisconnected(sessionHost: SessionHost): void {
    if (this.sessionHost === sessionHost) {
      sessionHost.reconnectBroker();
    }
  }

  /** Another tab holds the session id: close this host's transports (no `end`), drop the authority, rejoin as a client. */
  private demote(): void {
    const sessionHost = this.sessionHost;
    if (sessionHost === null) {
      return;
    }
    console.error('Interview host: another tab holds the session id; rejoining as a client');
    this.cancelPending();
    this.sessionHost = null;
    sessionHost.shutdown();
    this.editor.reset(INTERVIEWER_START_VERSION);
    this.rosterState.set([]);
    this.setStatus('reconnecting');
    void this.loop.run(this.generation, this.syncedDoc());
  }

  /** The authority was adopted or moved on: keep the log, the synced text and the saved copy in step. */
  private applyAuthority(authority: Authority, change: AuthorityChange, rev: number): void {
    this.syncedText = authority.doc;
    this.syncedRev = rev;
    this.editor.setLog(authority.updates);
    if (change === 'adopted') {
      this.adoptSharedDoc(authority);
    }
    this.persist();
    this.editor.syncView();
  }

  private adoptSharedDoc(authority: Authority): void {
    const problem = this.problemState();
    if (problem === null) {
      return;
    }
    const previous = this.sharedDocState();
    this.editor.dropView();
    this.editor.reset(INTERVIEWER_START_VERSION);
    this.sharedDocState.set({
      problem,
      version: INTERVIEWER_START_VERSION,
      doc: authority.doc.toString(),
      epoch: previous === null ? FIRST_EPOCH : previous.epoch + 1,
    });
  }

  // ---- the client side (candidate or interviewer) ----

  private attachClient(transport: Transport): void {
    this.connection = this.openClient(transport);
  }

  /** Starts the handshake on `transport`; with no identity the transport is closed and the result is null. */
  private openClient(transport: Transport): ClientConnection | null {
    const identity = this.clientIdentity();
    if (identity === null) {
      transport.close();
      return null;
    }
    return new ClientConnection(transport, identity, this.clientHooks);
  }

  /** The candidate registers the session id and waits; each dialer runs the handshake, and only a verified one is kept. */
  private async listen(): Promise<void> {
    const sessionId = this.sessionId;
    if (sessionId !== null) {
      await this.candidate.listen(sessionId);
    }
  }

  /** A proof verified: an interviewer client has nothing more to do; the candidate switches to the newly verified host. */
  private handleVerified(connection: ClientConnection): void {
    this.candidate.release(connection);
    this.loop.clearFailures();
    if (this.roleState() !== 'candidate' || this.connection === connection) {
      return;
    }
    if (!this.candidate.isListening) {
      connection.close();
      return;
    }
    const previous = this.connection;
    // The new connection is current before the old one closes, so the old one's close is ignored as stale.
    this.connection = connection;
    this.editor.reset(INTERVIEWER_START_VERSION);
    previous?.close();
  }

  private clientIdentity(): ClientIdentity | null {
    const { sessionId, publicKey } = this;
    const role = this.roleState();
    if (sessionId === null || publicKey === null || role === 'none') {
      return null;
    }
    return { sessionId, publicKey, privateKey: this.hostKeys?.privateKey ?? null, clientId: this.selfId, role };
  }

  /** The synced text with its revision, or null before the first init or adoption. */
  private syncedDoc(): RevisedDoc | null {
    return this.syncedText === null ? null : { doc: this.syncedText.toString(), rev: this.syncedRev };
  }

  /**
   * What the hello carries: the live editor's text, else the synced doc, else the saved doc for this role, else
   * nothing. The revision is the synced one even when the live text has unsynced local edits.
   */
  private helloDoc(): RevisedDoc | null {
    const liveText = this.editor.liveText();
    if (liveText !== null) {
      return { doc: liveText, rev: this.syncedRev };
    }
    const synced = this.syncedDoc();
    if (synced !== null) {
      return synced;
    }
    const sessionId = this.sessionId;
    const saved = sessionId === null ? null : loadSession(this.storedRole(), sessionId);
    return saved === null ? null : { doc: saved.doc, rev: saved.rev };
  }

  /** The interviewer's own problem for a hello: the live one, else the saved entry's. */
  private helloCustom(): CustomProblem | null {
    const sessionId = this.sessionId;
    return this.customState() ?? (sessionId === null ? null : (loadSession(this.storedRole(), sessionId)?.custom ?? null));
  }

  /** The host had no custom problem and took the first hello's: keep it with the saved copy. */
  private adoptCustom(custom: CustomProblem): void {
    this.customState.set(custom);
    this.persist();
  }

  private storedRole(): SessionRole {
    return this.roleState() === 'candidate' ? 'candidate' : 'interviewer';
  }

  /** Saves the synced text under this tab's role so a reloaded tab can send it in its hello. */
  private persist(): void {
    const { syncedText, sessionId } = this;
    const problem = this.problemState();
    if (syncedText === null || sessionId === null || problem === null) {
      return;
    }
    saveSession(this.storedRole(), sessionId, problem, syncedText.toString(), this.syncedRev, this.customState());
  }

  private handleInit(init: InitMessage): void {
    const previous = this.sharedDocState();
    const epoch = previous === null ? FIRST_EPOCH : previous.epoch + 1;
    this.editor.dropView();
    this.editor.reset(init.version);
    this.syncedText = textOf(init.doc);
    this.syncedRev = init.rev;
    this.sharedDocState.set({ problem: init.problem, version: init.version, doc: init.doc, epoch });
    this.problemState.set(init.problem);
    if (init.custom !== undefined) {
      this.customState.set(init.custom);
    }
    const isCandidate = this.roleState() === 'candidate';
    if (isCandidate) {
      writeCandidateLock(init.problem);
      // The host's seat may be stale after a reconnect or a takeover, so every init is followed by the real state.
      this.connection?.sendAway(isAwayNow());
    }
    this.setStatus(isCandidate ? 'open' : 'waiting');
    this.refreshInterviewerStatus();
    this.persist();
    navigateToSessionProblem(this.router, init.problem, this.pageProblem);
  }

  private handleUpdates(wire: readonly WireUpdate[]): void {
    const updates = decodeUpdates(wire);
    const base = this.syncedText;
    if (updates === null || base === null) {
      return;
    }
    try {
      this.syncedText = applyUpdates(base, updates);
    } catch (error) {
      console.error('Dropped session updates that do not fit the document', error);
      return;
    }
    this.syncedRev += updates.length;
    this.editor.appendAccepted(updates);
    this.persist();
    this.editor.syncView();
    this.editor.schedulePush();
  }

  /** The host ended the session: the candidate lands on Ended, an interviewer client resets like the one who ended it. */
  private handleEndFromHost(): void {
    const role = this.roleState();
    const { connection, sessionId } = this;
    this.cancelPending();
    this.connection = null;
    this.candidate.stop();
    connection?.close();
    if (role === 'interviewer') {
      this.finishInterviewerSession(sessionId);
      return;
    }
    clearCandidateLock();
    if (sessionId !== null) {
      clearSession('candidate', sessionId);
    }
    this.setStatus('closed');
  }

  private handleClientClosed(connection: ClientConnection): void {
    this.candidate.release(connection);
    if (this.connection !== connection) {
      return;
    }
    this.connection = null;
    this.editor.clearPending();
    this.rosterState.set([]);
    if (this.candidate.hasGivenUp) {
      // Nobody listens for the host any more, so waiting to reconnect would never end.
      this.fail('Interview join: the host connection closed and the session id could not be reclaimed');
      return;
    }
    this.setStatus('reconnecting');
    // A candidate does not dial: it keeps listening and the host dials it again.
    if (this.roleState() === 'interviewer') {
      this.scheduleReconnect();
    }
  }

  /** At most one reconnect runs: a pending timer blocks another, and the old connection's late close is ignored. */
  private scheduleReconnect(): void {
    if (this.redialTimer !== null) {
      return;
    }
    const generation = this.generation;
    this.redialTimer = setTimeout(() => {
      this.redialTimer = null;
      void this.reconnect(generation);
    }, RECONNECT_DELAY_MS);
  }

  private async reconnect(generation: number): Promise<void> {
    if (generation !== this.generation) {
      return;
    }
    await this.loop.run(generation, this.syncedDoc());
  }

  // ---- pushing local edits ----

  /** Hands the view's pending updates to the host: applied at once on the hosting tab, sent and awaited on a client. */
  private sendPush(version: number, updates: readonly Update[]): boolean {
    if (this.sessionHost !== null) {
      this.sessionHost.pushLocal(version, updates);
      return false;
    }
    if (this.connection === null || !this.isSynced()) {
      return false;
    }
    this.connection.sendPush(version, updates.map(toWire));
    return true;
  }
}
