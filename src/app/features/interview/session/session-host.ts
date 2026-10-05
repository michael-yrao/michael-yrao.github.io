import { Update } from '@codemirror/collab';

import { Authority, authorityVersion, createAuthority, receivePush } from './collab-authority';
import { HostKeys, createNonce, signChallenge, signProblem, verifyChallenge, verifyProblem } from './host-key';
import { InterviewProblem, SignedProblem, parseInterviewProblem } from './interview-problem';
import { CandidateDialer } from './candidate-listener';
import { Host, Transport } from './peer-transport';
import {
  CandidateSeat,
  EditProblemMessage,
  HelloMessage,
  InitMessage,
  NAME_MAX_LENGTH,
  NO_MARKS,
  Participant,
  RevisedDoc,
  SessionMessage,
  parseSessionMessage,
} from './session-message';
import { CONNECT_TIMEOUT_MS } from './session-client';
import { END_GRACE_MS, RECONNECT_DELAY_MS, isBrokerError, isUnavailableId } from './session-support';
import { decodeUpdates, textOf, toWire } from './wire-updates';

/** What the host knows when it must decide which text becomes the canonical document. */
export interface AuthorityInputs {
  /** The doc saved for the interviewer role in this browser. */
  readonly saved: RevisedDoc | null;
  /** A tab that took over: its own synced doc. */
  readonly takeover: RevisedDoc | null;
  /** The doc of each hello received so far, in arrival order; null when that side had none. */
  readonly hellos: readonly (RevisedDoc | null)[];
  /** True while a connected peer has not finished its handshake: its doc may still arrive, so the stub must wait. */
  readonly hasPendingHandshake: boolean;
}

/** A connection that has not reached `ready` by now is closed, so one stuck peer cannot block every init. */
const HANDSHAKE_TIMEOUT_MS = CONNECT_TIMEOUT_MS;

/**
 * The text the session starts from: the candidate with the highest revision among the saved doc, the
 * takeover doc and the hellos (a tie keeps that order, so the first hello wins among hellos), else (every hello
 * was empty and no handshake is pending) the stub at revision 0. Null while there is nothing to decide on yet.
 */
export function chooseAuthorityDoc(inputs: AuthorityInputs, stubFn: () => string): RevisedDoc | null {
  const candidates = [inputs.saved, inputs.takeover, ...inputs.hellos].filter((entry) => entry !== null);
  const newest = candidates.reduce<RevisedDoc | null>((best, entry) => (best === null || entry.rev > best.rev ? entry : best), null);
  if (newest !== null) {
    return newest;
  }
  return inputs.hellos.length > 0 && !inputs.hasPendingHandshake ? { doc: stubFn(), rev: 0 } : null;
}

export interface HostConfig {
  readonly sessionId: string;
  readonly keys: HostKeys;
  /** The hosting tab's own collab clientID: the first roster entry. */
  readonly selfId: string;
  readonly savedDoc: string | null;
  /** The revision of `savedDoc`; 0 when there is none. */
  readonly savedRev: number;
  readonly takeoverDoc: string | null;
  /** The revision of `takeoverDoc`; 0 when there is none. */
  readonly takeoverRev: number;
  readonly getName: () => string;
  readonly stubFn: () => string;
  /** The candidate's marks as the last host knew them, so a takeover keeps the counts. */
  readonly candidateSeat: CandidateSeat;
  /** The signed problem this tab holds, already verified against the session key, or null. */
  readonly problem: SignedProblem | null;
  /** Dials the candidate's listening id through a fresh Peer (never the hosting one) and resolves with the open transport. */
  readonly dialCandidate: () => Promise<Transport>;
}

export type AuthorityChange = 'adopted' | 'advanced';

export interface HostEvents {
  onRoster(participants: readonly Participant[]): void;
  /** The canonical doc now exists (`adopted`), or an accepted push moved it on (`advanced`); `rev` is its session revision. */
  onAuthority(authority: Authority, change: AuthorityChange, rev: number): void;
  /** A ready interviewer asked to end the session. */
  onEndRequested(): void;
  /** The session's problem changed: the host signed an edit, or took a higher revision from a hello. */
  onProblem(signed: SignedProblem, problem: InterviewProblem): void;
}

/** What the service should do about a Peer error. */
export type PeerErrorReaction = 'demote' | 'handled' | 'fatal';

type ConnectionPhase = 'new' | 'challenged' | 'verifying' | 'ready';

interface ConnectionRecord {
  readonly transport: Transport;
  /** Issued with the proof; single use, cleared when the hello is checked. */
  readonly hostNonce: string | null;
  readonly phase: ConnectionPhase;
  readonly participant: Participant | null;
  readonly hello: RevisedDoc | null;
  /** Closes the connection if it never reaches `ready`; null once it has. */
  readonly handshakeTimer: ReturnType<typeof setTimeout> | null;
  /** True when this host dialed the connection (to the candidate's id) rather than received it. */
  readonly isDialed: boolean;
}

function cleanName(name: string): string {
  return name.trim().slice(0, NAME_MAX_LENGTH);
}

/** The seat after the candidate's `away` report: a repeat changes nothing, and only a new absence is counted. */
function withAway(seat: CandidateSeat, isAway: boolean): CandidateSeat {
  if (seat.isAway === isAway) {
    return seat;
  }
  return { ...seat, isAway, awayCount: isAway ? seat.awayCount + 1 : seat.awayCount };
}

/**
 * The authority side of a session: it answers each connection's challenge, admits participants
 * whose hello checks out, keeps the roster, owns the canonical document and relays accepted updates.
 * Interviewers dial it; it dials the candidate, for as long as the roster has none (see `CandidateDialer`).
 */
export class SessionHost {
  private peer: Host | null = null;
  private authority: Authority | null = null;
  /** The session revision the current authority started from; its current revision is this plus its version. */
  private revBase = 0;
  private records: readonly ConnectionRecord[] = [];
  private isClosed = false;
  private brokerRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private endGraceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Held outside the connection records, so it survives the candidate reconnecting. */
  private candidateSeat: CandidateSeat;
  /** The newest problem, signed by the interviewer key; changed only inside enqueue. */
  private signedProblem: SignedProblem | null;
  /** Every change to the problem runs through this chain, so revisions are assigned in arrival order. */
  private problemChain: Promise<void> = Promise.resolve();

  private readonly dialer: CandidateDialer;

  constructor(
    private readonly config: HostConfig,
    private readonly events: HostEvents,
  ) {
    this.candidateSeat = config.candidateSeat;
    this.signedProblem = config.problem;
    this.dialer = new CandidateDialer({
      dial: config.dialCandidate,
      isNeeded: () => this.isCandidateNeeded(),
      onTransport: (transport) => this.accept(transport, true),
    });
  }

  /** The Peer is registered: from here the host is live, so it adopts a doc if it can, announces the roster and looks for the candidate. */
  attach(peer: Host): void {
    this.peer = peer;
    this.adoptIfPossible();
    this.events.onRoster(this.roster());
    this.dialer.start();
  }

  /** No candidate in the roster, and no dialed connection still mid-handshake. */
  private isCandidateNeeded(): boolean {
    const hasCandidate = this.records.some((record) => record.participant?.role === 'candidate');
    const hasPendingDial = this.records.some((record) => record.isDialed && record.phase !== 'ready');
    return !hasCandidate && !hasPendingDial;
  }

  /** Takes an open connection, received or dialed; either way the other side starts with its challenge. */
  accept(transport: Transport, isDialed = false): void {
    if (this.isClosed) {
      transport.close();
      return;
    }
    const handshakeTimer = setTimeout(() => this.abandonStuckHandshake(transport), HANDSHAKE_TIMEOUT_MS);
    this.records = [
      ...this.records,
      { transport, hostNonce: null, phase: 'new', participant: null, hello: null, handshakeTimer, isDialed },
    ];
    transport.onMessage((data) => this.handleMessage(transport, data));
    transport.onClose(() => this.handleClose(transport));
  }

  private abandonStuckHandshake(transport: Transport): void {
    const record = this.find(transport);
    if (this.isClosed || record === undefined || record.phase === 'ready') {
      return;
    }
    console.error(`Interview host: closed a connection still in phase "${record.phase}" after ${HANDSHAKE_TIMEOUT_MS} ms`);
    transport.close();
  }

  /** The Peer lost its broker registration: win it back now, unless a delayed retry is already pending. */
  reconnectBroker(): void {
    if (!this.isClosed && this.brokerRetryTimer === null) {
      this.peer?.reconnect();
    }
  }

  /** A taken id means another tab holds the lock (demote); a broker or disconnect error is retried; anything else is fatal. */
  reactToPeerError(error: unknown): PeerErrorReaction {
    if (isUnavailableId(error)) {
      return 'demote';
    }
    if (!isBrokerError(error) && this.peer?.isDisconnected() !== true) {
      return 'fatal';
    }
    console.error('Interview host: the broker connection failed; will reconnect', error);
    this.scheduleBrokerReconnect();
    return 'handled';
  }

  private scheduleBrokerReconnect(): void {
    if (this.brokerRetryTimer !== null) {
      return;
    }
    this.brokerRetryTimer = setTimeout(() => {
      this.brokerRetryTimer = null;
      if (!this.isClosed) {
        this.peer?.reconnect();
      }
    }, RECONNECT_DELAY_MS);
  }

  /** The hosting tab's own edit. */
  pushLocal(version: number, updates: readonly Update[]): void {
    this.acceptPush(version, updates);
  }

  /** The problem as the host holds it, or null before there is one. */
  getProblem(): SignedProblem | null {
    return this.signedProblem;
  }

  /** The hosting tab's own problem edit: validated, then signed and published in turn with every other edit. */
  editLocal(problem: InterviewProblem): Promise<void> {
    const valid = parseInterviewProblem(problem);
    if (valid === null) {
      console.error('Interview host: dropped a local problem edit that is not a valid problem');
      return Promise.resolve();
    }
    return this.enqueue(() => this.publishEdit(valid));
  }

  /** The hosting tab's name changed. */
  refreshRoster(): void {
    this.broadcastRoster();
  }

  /**
   * Tells every ready participant the session ended and stops accepting anything at once; the transports
   * and the Peer stay up for `END_GRACE_MS` so the `end` is delivered, then `shutdown` closes them.
   */
  end(): void {
    this.broadcast({ type: 'end' });
    this.markClosed();
    this.endGraceTimer = setTimeout(() => this.shutdown(), END_GRACE_MS);
  }

  /** Closes every transport without an `end` and gives the id up. */
  shutdown(): void {
    this.markClosed();
    if (this.endGraceTimer !== null) {
      clearTimeout(this.endGraceTimer);
      this.endGraceTimer = null;
    }
    const records = this.records;
    this.records = [];
    records.forEach((record) => {
      clearTimeout(record.handshakeTimer ?? undefined);
      record.transport.close();
    });
    this.peer?.destroy();
    this.peer = null;
  }

  /** Marked closed before the Peer is destroyed: destroying it emits 'disconnected', which must not re-register the id. */
  private markClosed(): void {
    this.isClosed = true;
    this.dialer.stop();
    if (this.brokerRetryTimer !== null) {
      clearTimeout(this.brokerRetryTimer);
      this.brokerRetryTimer = null;
    }
  }

  private roster(): readonly Participant[] {
    const self: Participant = { id: this.config.selfId, role: 'interviewer', name: this.config.getName(), ...NO_MARKS };
    const others = this.records.flatMap((record) =>
      record.participant === null ? [] : [record.participant.role === 'candidate' ? { ...record.participant, ...this.candidateSeat } : record.participant],
    );
    return [self, ...others];
  }

  private broadcastRoster(): void {
    const participants = this.roster();
    this.events.onRoster(participants);
    this.broadcast({ type: 'roster', participants });
  }

  private broadcast(message: SessionMessage): void {
    this.records.forEach((record) => {
      if (record.phase === 'ready') {
        record.transport.send(message);
      }
    });
  }

  private find(transport: Transport): ConnectionRecord | undefined {
    return this.records.find((record) => record.transport === transport);
  }

  private patch(transport: Transport, change: Partial<ConnectionRecord>): void {
    this.records = this.records.map((record) => (record.transport === transport ? { ...record, ...change } : record));
  }

  private handleClose(transport: Transport): void {
    if (this.isClosed) {
      return;
    }
    const record = this.find(transport);
    if (record === undefined) {
      return;
    }
    clearTimeout(record.handshakeTimer ?? undefined);
    this.records = this.records.filter((other) => other !== record);
    if (record.participant !== null) {
      this.broadcastRoster();
    }
    // A pending peer that drops can unblock the stub.
    this.adoptIfPossible();
  }

  private handleMessage(transport: Transport, data: unknown): void {
    const record = this.find(transport);
    const message = this.isClosed || record === undefined ? null : parseSessionMessage(data);
    if (message === null || record === undefined) {
      return;
    }
    if (message.type === 'challenge') {
      void this.handleChallenge(transport, record, message.nonce);
      return;
    }
    if (message.type === 'hello') {
      void this.handleHello(transport, record, message);
      return;
    }
    if (record.phase !== 'ready') {
      console.error('Interview host: dropped a message that came before the hello', message.type);
      return;
    }
    this.handleReadyMessage(record, message);
  }

  private handleReadyMessage(record: ConnectionRecord, message: SessionMessage): void {
    switch (message.type) {
      case 'push': {
        const updates = decodeUpdates(message.updates);
        if (updates !== null) {
          this.acceptPush(message.version, updates);
        }
        return;
      }
      case 'edit-problem':
        this.handleEditProblem(record, message);
        return;
      case 'name':
        this.renameParticipant(record, message.name);
        return;
      case 'away':
        this.updateSeat(record, withAway(this.candidateSeat, message.isAway), message.type);
        return;
      case 'paste':
        this.updateSeat(record, { ...this.candidateSeat, pasteCount: this.candidateSeat.pasteCount + 1 }, message.type);
        return;
      case 'end':
        if (record.participant?.role === 'interviewer') {
          this.events.onEndRequested();
        } else {
          console.error('Interview host: only an interviewer can end the session');
        }
        return;
      default:
        console.error('Unexpected message from a participant', message.type);
    }
  }

  /** Only an interviewer may change the problem; the message already passed parseInterviewProblem. */
  private handleEditProblem(record: ConnectionRecord, message: EditProblemMessage): void {
    if (record.participant?.role !== 'interviewer') {
      console.error('Interview host: dropped a problem edit from a connection that is not an interviewer');
      return;
    }
    void this.enqueue(() => this.publishEdit(message.problem));
  }

  /** Runs `task` after every earlier task; a failure is logged, so the chain never rejects. */
  private enqueue(task: () => Promise<void>): Promise<void> {
    this.problemChain = this.problemChain
      .then(task)
      .catch((error: unknown) => console.error('Interview host: a problem change failed', error));
    return this.problemChain;
  }

  /** Numbers, signs and publishes problem; the revision is read here, inside the chain, so it is current. */
  private async publishEdit(problem: InterviewProblem): Promise<void> {
    if (this.isClosed) {
      return;
    }
    const rev = (this.signedProblem?.rev ?? 0) + 1;
    const json = JSON.stringify(problem);
    try {
      const { keys, sessionId } = this.config;
      const signature = await signProblem(keys.privateKey, sessionId, rev, json);
      if (!this.isClosed) {
        this.publishProblem({ rev, json, signature }, problem);
      }
    } catch (error) {
      console.error('Interview host: could not sign a problem edit', error);
    }
  }

  /** Makes signed the held problem, tells the hosting tab and sends it to every ready participant. */
  private publishProblem(signed: SignedProblem, problem: InterviewProblem): void {
    this.signedProblem = signed;
    this.events.onProblem(signed, problem);
    this.broadcast({ type: 'problem', problem: signed });
  }

  /** Takes the candidate's report into the seat and tells everyone; a report from anyone else is ignored. */
  private updateSeat(record: ConnectionRecord, seat: CandidateSeat, type: string): void {
    if (record.participant?.role !== 'candidate') {
      console.error('Interview host: ignored a candidate mark from a connection that is not the candidate', type);
      return;
    }
    if (seat !== this.candidateSeat) {
      this.candidateSeat = seat;
      this.broadcastRoster();
    }
  }

  private async handleChallenge(transport: Transport, record: ConnectionRecord, nonce: string): Promise<void> {
    if (record.phase !== 'new') {
      console.error('Interview host: ignored a repeated challenge');
      return;
    }
    const hostNonce = createNonce();
    this.patch(transport, { phase: 'challenged', hostNonce });
    try {
      const { keys, sessionId } = this.config;
      const signature = await signChallenge(keys.privateKey, 'proof', nonce, sessionId);
      if (this.isClosed || this.find(transport) === undefined) {
        return;
      }
      transport.send({ type: 'proof', signature, nonce: hostNonce } satisfies SessionMessage);
    } catch (error) {
      console.error('Interview host: could not answer a challenge', error);
      transport.close();
    }
  }

  private async handleHello(transport: Transport, record: ConnectionRecord, hello: HelloMessage): Promise<void> {
    const hostNonce = record.hostNonce;
    if (record.phase !== 'challenged' || hostNonce === null) {
      console.error('Interview host: closed a connection whose hello did not follow the challenge');
      transport.close();
      return;
    }
    // The nonce is spent now, so a replayed hello cannot be checked against it again.
    this.patch(transport, { phase: 'verifying', hostNonce: null });
    if (hello.role === 'interviewer' && !(await this.isInterviewerHelloValid(hello, hostNonce))) {
      console.error('Interview host: closed a connection that claimed to be an interviewer without a valid signature');
      transport.close();
      return;
    }
    await this.adoptHelloProblem(hello.problem);
    if (this.isClosed || this.find(transport) === undefined) {
      return;
    }
    if (this.isHelloRefused(hello)) {
      console.error('Interview host: closed a connection that cannot join as', hello.role);
      transport.close();
      return;
    }
    this.markReady(transport, hello);
  }

  /**
   * A hello's problem is taken only when its revision is higher than the held one and the interviewer key signed
   * it for this session. Runs in the chain, so it never interleaves with an edit being signed. The hello is
   * admitted either way.
   */
  private adoptHelloProblem(signed: SignedProblem | undefined): Promise<void> {
    if (signed === undefined) {
      return Promise.resolve();
    }
    return this.enqueue(async () => {
      if (this.isClosed || signed.rev <= (this.signedProblem?.rev ?? 0)) {
        return;
      }
      const { keys, sessionId } = this.config;
      const problem = await verifyProblem(keys.publicKey, sessionId, signed);
      if (this.isClosed) {
        return;
      }
      if (problem === null) {
        console.error('Interview host: ignored a problem that the interviewer key did not sign for this session');
        return;
      }
      this.publishProblem(signed, problem);
    });
  }

  private async isInterviewerHelloValid(hello: HelloMessage, hostNonce: string): Promise<boolean> {
    if (hello.signature === undefined) {
      return false;
    }
    const { keys, sessionId } = this.config;
    return verifyChallenge(keys.publicKey, 'hello', hostNonce, sessionId, hello.signature);
  }

  /** One candidate at most, and no id twice (the host's own included). */
  private isHelloRefused(hello: HelloMessage): boolean {
    const ready = this.records.flatMap((record) => (record.participant === null ? [] : [record.participant]));
    const isIdTaken = hello.id === this.config.selfId || ready.some((participant) => participant.id === hello.id);
    const isSecondCandidate = hello.role === 'candidate' && ready.some((participant) => participant.role === 'candidate');
    return isIdTaken || isSecondCandidate;
  }

  private markReady(transport: Transport, hello: HelloMessage): void {
    const participant: Participant = { id: hello.id, role: hello.role, name: cleanName(hello.name), ...NO_MARKS };
    clearTimeout(this.find(transport)?.handshakeTimer ?? undefined);
    const revised = hello.doc === null ? null : { doc: hello.doc, rev: hello.rev };
    this.patch(transport, { phase: 'ready', participant, hello: revised, handshakeTimer: null });
    if (this.authority === null) {
      this.adoptIfPossible();
    } else if (revised !== null && revised.rev > this.currentRev(this.authority)) {
      this.adopt(revised);
    } else {
      this.sendInit(transport, this.authority);
    }
    this.broadcastRoster();
  }

  private currentRev(authority: Authority): number {
    return this.revBase + authorityVersion(authority);
  }

  private renameParticipant(record: ConnectionRecord, name: string): void {
    if (record.participant === null) {
      return;
    }
    this.patch(record.transport, { participant: { ...record.participant, name: cleanName(name) } });
    this.broadcastRoster();
  }

  /** Builds the authority once a doc can be chosen, and sends the init to every ready participant. */
  private adoptIfPossible(): void {
    if (this.authority !== null || this.peer === null) {
      return;
    }
    const readyRecords = this.records.filter((record) => record.phase === 'ready');
    const { savedDoc, savedRev, takeoverDoc, takeoverRev } = this.config;
    const chosen = chooseAuthorityDoc(
      {
        saved: savedDoc === null ? null : { doc: savedDoc, rev: savedRev },
        takeover: takeoverDoc === null ? null : { doc: takeoverDoc, rev: takeoverRev },
        hellos: readyRecords.map((record) => record.hello),
        hasPendingHandshake: this.records.some((record) => record.phase !== 'ready'),
      },
      this.config.stubFn,
    );
    if (chosen !== null) {
      this.adopt(chosen);
    }
  }

  /** Makes `chosen` the canonical doc, and sends a fresh init to every ready participant. */
  private adopt(chosen: RevisedDoc): void {
    const authority = createAuthority(textOf(chosen.doc));
    this.authority = authority;
    this.revBase = chosen.rev;
    this.events.onAuthority(authority, 'adopted', chosen.rev);
    this.records.filter((record) => record.phase === 'ready').forEach((record) => this.sendInit(record.transport, authority));
  }

  private sendInit(transport: Transport, authority: Authority): void {
    const problem = this.signedProblem;
    transport.send({
      type: 'init',
      version: authorityVersion(authority),
      rev: this.currentRev(authority),
      doc: authority.doc.toString(),
      ...(problem === null ? {} : { problem }),
    } satisfies InitMessage);
  }

  /** Pushes into the authority; what it accepts goes to every ready participant, the sender included. */
  private acceptPush(version: number, updates: readonly Update[]): void {
    const authority = this.authority;
    if (authority === null || this.isClosed) {
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
    this.events.onAuthority(result.authority, 'advanced', this.currentRev(result.authority));
    this.broadcast({ type: 'updates', updates: result.accepted.map(toWire) });
  }
}
