import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Update } from '@codemirror/collab';
import { Extension } from '@codemirror/state';

import { isAwayNow, largePasteExtension } from './client/candidate-activity';
import { CandidateSide } from './client/candidate-side';
import { ClientConnection, ClientHooks, ClientIdentity } from './client/session-client';
import { clearCandidateLock } from './candidate-lock';
import { SessionDocument, SharedDoc } from './collab/session-document';
import { toWire } from './collab/wire-updates';
import { parsePackedKey, parsePublicKey } from './crypto/host-key';
import { sessionIdFromPublicKey } from './crypto/session-id';
import { EndSummary, parseEndSummary } from './debrief';
import { EndedSession, endedSessionOf } from './ended-session';
import { HostInputs, InterviewerSide } from './host/interviewer-side';
import { HOST_PARAM } from './interview-params';
import { InterviewProblem } from './interview-problem';
import { PEER_FACTORY, Transport } from './peer-transport';
import { PreparedInterviewsService } from './prepared-interviews.service';
import { InitMessage, NAME_MAX_LENGTH, Participant, ParticipantRole, RevisedDoc } from './session-message';
import { SessionIdentity } from './session-identity';
import { SessionRecord } from './session-record';
import { SessionRoster } from './session-roster';
import { deriveIds, loadName, saveName } from './session-support';
import { loadPrepared } from './store/prepared-store';
import { clearSession, clearStartedAt, loadSession, pruneExpiredSessions, seedInterviewerSession } from './store/session-store';

export { JOIN_PARAM, HOST_PARAM } from './interview-params';
export { CONNECT_TIMEOUT_MS } from './client/session-client';
export { RECLAIM_TIMEOUT_MS, RECONNECT_DELAY_MS } from './session-support';
export type { EndedSession } from './ended-session';
export type { SharedDoc } from './collab/session-document';
export type InterviewRole = 'none' | 'interviewer' | 'candidate';
export type SessionStatus = 'idle' | 'connecting' | 'waiting' | 'open' | 'reconnecting' | 'closed' | 'error';

/**
 * One interview session, with two PeerJS ids (see `session-id.ts`). Every interviewer tab runs the dial-or-host
 * loop on the host peer id (`InterviewerSide`); the candidate registers the session id and listens
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
  private readonly prepared = inject(PreparedInterviewsService);
  /** This tab's collab clientID, and its id in the roster. */
  readonly selfId = crypto.randomUUID();

  private readonly identity = new SessionIdentity();
  private readonly people = new SessionRoster();
  private readonly doc = new SessionDocument({
    isReadOnly: () => !this.isEditable(),
    send: (version, updates) => this.sendPush(version, updates),
    persist: () => this.held.persist(),
  });

  /** The session's verified problem and the saved copy of its doc; a held problem is mirrored to the prepared list. */
  private readonly held = new SessionRecord({
    sessionId: () => this.identity.sessionId(),
    publicKey: () => this.identity.publicKey,
    generation: () => this.generation,
    isCandidate: () => this.roleState() === 'candidate',
    synced: () => this.doc.current(),
    mirror: (sessionId, signed) => this.prepared.mirror(sessionId, signed, this.interviewer.host !== null),
  });

  private readonly roleState = signal<InterviewRole>('none');
  private readonly statusState = signal<SessionStatus>('idle');
  private readonly myNameState = signal<string>(loadName());
  private readonly endedState = signal<EndedSession | null>(null);

  readonly sessionId: Signal<string | null> = this.identity.sessionId;
  /** When a candidate first connected to this session, as the host knows it; null before that and for a candidate. Survives a host reload. */
  readonly startedAt: Signal<number | null> = this.people.startedAt;
  /** Set once when a session that had a candidate ends, on both sides; null otherwise. The page saves the debrief from it. */
  readonly ended: Signal<EndedSession | null> = this.endedState.asReadonly();
  /** The page has saved the debrief for the ended session; `ended` goes back to null. */
  clearEnded(): void { this.endedState.set(null); }
  readonly role: Signal<InterviewRole> = this.roleState.asReadonly();
  readonly status: Signal<SessionStatus> = this.statusState.asReadonly();
  readonly inviteUrl: Signal<string | null> = this.identity.inviteUrl;
  /** The interviewer's private link (it carries the key); null for the candidate. */
  readonly hostUrl: Signal<string | null> = this.identity.hostUrl;
  readonly sharedDoc: Signal<SharedDoc | null> = this.doc.shared;
  /** The session's problem as last verified against the session key; null until this tab holds one. */
  readonly problem: Signal<InterviewProblem | null> = this.held.problem;
  /** False while a tab is waiting to reconnect: an edit then would be dropped by the next init. */
  readonly isEditable: Signal<boolean> = computed(() => this.statusState() !== 'reconnecting');
  readonly myName: Signal<string> = this.myNameState.asReadonly();
  /** Everyone in the session as the host last announced it; empty until the first roster arrives. */
  readonly roster: Signal<readonly Participant[]> = this.people.participants;

  private connection: ClientConnection | null = null;
  /** Bumped by every start, resume, join and end; async work that finds it changed has been superseded. */
  private generation = 0;

  private readonly clientHooks: ClientHooks = {
    getName: () => this.myNameState(),
    getDoc: () => this.doc.hello(() => this.held.savedDoc()),
    getProblem: () => this.held.signed,
    onVerified: (connection) => this.handleVerified(connection),
    onInit: (init) => this.handleInit(init),
    onProblem: (signed) => void this.held.adopt(signed),
    onUpdates: (updates) => this.doc.applyWire(updates),
    onRoster: (participants) => this.setRoster(participants),
    onEnd: (summary) => this.handleEndFromHost(summary),
    onClosed: (connection) => this.handleClientClosed(connection),
  };

  private readonly interviewer = new InterviewerSide(this.factory, {
    ids: () => this.identity.loopIds(),
    generation: () => this.generation,
    hostInputs: (sessionId, takeover) => this.hostInputs(sessionId, takeover),
    hostEvents: {
      onRoster: (participants) => this.setRoster(participants),
      onAuthority: (authority, change, rev) => this.doc.adoptAuthority(authority, change, rev),
      onEndRequested: () => this.end(),
      onProblem: (signed, problem) => this.held.hold(signed, problem),
    },
    onClient: (transport) => this.attachClient(transport),
    onHosting: () => this.handleHosting(),
    onDemote: () => this.handleDemote(),
    syncedDoc: () => this.doc.current(),
    connection: () => this.connection,
    onFail: (context, error) => this.fail(context, error),
  });

  private readonly candidate = new CandidateSide(this.factory, {
    openClient: (transport) => this.openClient(transport),
    hasVerifiedHost: () => this.connection !== null,
    onAway: (isAway) => this.connection?.sendAway(isAway),
    onError: (context) => this.fail(context),
  });

  /** Joins as an interviewer from a host link: hosts the session if nobody does, otherwise joins the host. */
  async resume(packed: string): Promise<void> {
    if (this.identity.isOpenedWith(packed) && this.roleState() === 'interviewer') {
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
    const begun = this.beginSession('interviewer', packed);
    pruneExpiredSessions();
    this.identity.adoptInterviewer(keys, sessionId, hostPeerId, pageUrl);
    this.people.restoreStart(sessionId);
    await this.held.adoptStored();
    await this.held.adopt(loadPrepared(sessionId)?.problem);
    if (begun !== this.generation) {
      return;
    }
    // The host loop reads the saved doc at attach, and `persist()` returns while no doc has synced, so seed it here.
    const signedProblem = this.held.signed;
    const problem = this.held.problem();
    if (signedProblem !== null && problem !== null) {
      seedInterviewerSession(sessionId, problem.starter, signedProblem);
    }
    await this.interviewer.run(begun, null);
  }

  async join(publicRaw: string): Promise<void> {
    if (this.identity.isOpenedWith(publicRaw) && this.roleState() === 'candidate') {
      return;
    }
    const generation = this.beginSession('candidate', publicRaw);
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
      this.identity.adoptCandidate(publicKey, sessionId);
      await this.held.adoptStored();
    } catch (error) {
      if (generation === this.generation) {
        this.fail('Could not read the interview link', error);
      }
      return;
    }
    if (generation !== this.generation) {
      return;
    }
    // No host yet is not a failure: the candidate listens until one dials in or the session is superseded.
    await this.listen();
  }

  /** Ends the session for everyone. An interviewer's End also resets this tab and strips `?host=` from the address. */
  end(): void {
    const role = this.roleState();
    const { connection } = this;
    const sessionId = this.identity.sessionId();
    const summary = role === 'interviewer' && this.interviewer.host !== null ? this.people.summary(sessionId) : null;
    this.recordEnd(role, sessionId, summary);
    this.cancelPending();
    const sessionHost = this.interviewer.release();
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
      sessionHost.end(summary ?? undefined);
    } else {
      connection?.endSession();
    }
    this.finishInterviewerSession(sessionId);
    if (sessionId !== null) {
      void this.prepared.flush(sessionId);
    }
  }

  /** Sets `ended` from this side's own state, before the role goes back to none; a null summary leaves it as it is. */
  private recordEnd(role: InterviewRole, sessionId: string | null, summary: EndSummary | null): void {
    if (role === 'none' || sessionId === null || summary === null) {
      return;
    }
    this.endedState.set(endedSessionOf(sessionId, role, this.held.problem(), summary, this.doc.current()?.doc ?? ''));
  }

  /** Sets this side's name (trimmed, cut to the limit), stores it and tells the session. */
  setMyName(name: string): void {
    const clean = name.trim().slice(0, NAME_MAX_LENGTH);
    this.myNameState.set(clean);
    saveName(clean);
    this.interviewer.host?.refreshRoster();
    this.connection?.sendName(clean);
  }

  /** The query params that reopen this session on `/interview`: `?host=` for an interviewer, `?join=` for the candidate; none without a session. */
  linkParams(): Readonly<Record<string, string>> {
    return this.identity.linkParams(this.roleState());
  }

  /**
   * An interviewer's new version of the problem: the hosting tab signs and numbers it itself, any other tab asks the
   * host. Either way the verified problem comes back through `problem`. A candidate's edit is ignored.
   */
  editProblem(problem: InterviewProblem): Promise<void> {
    if (this.roleState() !== 'interviewer') {
      console.error('Interview: only an interviewer can edit the problem');
      return Promise.resolve();
    }
    return this.interviewer.editProblem(problem);
  }

  collabExtensions(): readonly Extension[] {
    const session = this.doc.extensions(this.selfId, !this.isEditable());
    return this.roleState() === 'candidate' ? [...session, largePasteExtension(() => this.connection?.sendPaste())] : session;
  }

  // ---- session lifecycle ----

  /** Resets to a fresh session of `role` and returns its generation; the identity-dependent work follows. */
  private beginSession(role: ParticipantRole, linkValue: string | null): number {
    this.cancelPending();
    this.closeTransports();
    this.resetSessionState(linkValue);
    this.endedState.set(null);
    this.roleState.set(role);
    this.setStatus('connecting');
    return this.generation;
  }

  /** Cancels the pending retry wait and re-dial timer and supersedes any in-flight async work. */
  private cancelPending(): void {
    this.generation += 1;
    this.interviewer.cancel();
  }

  /** Closes the client connection, the candidate's listener and the hosted Peer without telling anyone the session ended. */
  private closeTransports(): void {
    const { connection } = this;
    const sessionHost = this.interviewer.release();
    this.connection = null;
    this.candidate.stop();
    connection?.close();
    sessionHost?.shutdown();
  }

  /** Everything a session owns except its role and status; `linkValue` is the link the next identity is opened from. */
  private resetSessionState(linkValue: string | null = null): void {
    this.identity.reset(linkValue);
    this.doc.reset();
    this.people.reset();
    this.held.reset();
    this.interviewer.reset();
  }

  /** Puts the service back in its starting state, as after construction. */
  private resetToStart(): void {
    this.closeTransports();
    this.resetSessionState();
    this.roleState.set('none');
    this.setStatus('idle');
  }

  /** An interviewer's session is over: forget its saved doc, reset, and drop `?host=` so a reload no longer resumes it. */
  private finishInterviewerSession(sessionId: string | null): void {
    if (sessionId !== null) {
      clearSession('interviewer', sessionId);
      clearStartedAt(sessionId);
    }
    this.resetToStart();
    this.router
      .navigate([], { queryParams: { [HOST_PARAM]: null }, queryParamsHandling: 'merge', replaceUrl: true })
      .catch((err: unknown) => console.error('Interview end: could not drop the host link from the address', err));
  }

  private setStatus(status: SessionStatus): void {
    this.statusState.set(status);
    this.doc.applyReadOnly();
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
    this.setStatus(this.people.hasCandidate() ? 'open' : 'waiting');
  }

  private setRoster(participants: readonly Participant[]): void {
    this.people.update(participants);
    this.people.stampStart(this.identity.sessionId(), this.roleState() === 'interviewer');
    this.refreshInterviewerStatus();
  }

  private fail(context: string, error?: unknown): void {
    console.error(...(error === undefined ? [context] : [context, error]));
    this.setStatus('error');
  }

  // ---- the hosting tab ----

  /** What one hosting attempt starts from; null when this tab has no keys. */
  private hostInputs(sessionId: string, takeover: RevisedDoc | null): HostInputs | null {
    const keys = this.identity.hostKeys();
    if (keys === null) {
      return null;
    }
    const saved = loadSession('interviewer', sessionId);
    return {
      sessionId,
      keys,
      selfId: this.selfId,
      savedDoc: saved?.doc ?? null,
      savedRev: saved?.rev ?? 0,
      takeoverDoc: takeover?.doc ?? null,
      takeoverRev: takeover?.rev ?? 0,
      getName: () => this.myNameState(),
      stubFn: () => this.held.problem()?.starter ?? '',
      candidateSeat: this.people.candidateSeat,
      problem: this.held.signed,
    };
  }

  private handleHosting(): void {
    if (this.statusState() === 'connecting' || this.statusState() === 'reconnecting') {
      this.setStatus('waiting');
    }
    this.refreshInterviewerStatus();
    this.interviewer.flushPendingEdit();
  }

  /** Another tab holds the session id: this tab drops the authority's editor log and roster and waits to rejoin as a client. */
  private handleDemote(): void {
    this.cancelPending();
    this.doc.restartEditor();
    this.people.clear();
    this.setStatus('reconnecting');
  }

  // ---- the client side (candidate or interviewer) ----

  private attachClient(transport: Transport): void {
    this.connection = this.openClient(transport);
  }

  /** Starts the handshake on `transport`; with no identity the transport is closed and the result is null. */
  private openClient(transport: Transport): ClientConnection | null {
    const identity: ClientIdentity | null = this.identity.clientIdentity(this.selfId, this.roleState());
    if (identity === null) {
      transport.close();
      return null;
    }
    return new ClientConnection(transport, identity, this.clientHooks);
  }

  /** The candidate registers the session id and waits; each dialer runs the handshake, and only a verified one is kept. */
  private async listen(): Promise<void> {
    const sessionId = this.identity.sessionId();
    if (sessionId !== null) {
      await this.candidate.listen(sessionId);
    }
  }

  /** A proof verified: an interviewer client has nothing more to do; the candidate switches to the newly verified host. */
  private handleVerified(connection: ClientConnection): void {
    this.candidate.release(connection);
    this.interviewer.clearFailures();
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
    this.doc.restartEditor();
    previous?.close();
  }

  private handleInit(init: InitMessage): void {
    this.doc.adoptInit(init);
    void this.held.adopt(init.problem);
    const isCandidate = this.roleState() === 'candidate';
    if (isCandidate) {
      // The host's seat may be stale after a reconnect or a takeover, so every init is followed by the real state.
      this.connection?.sendAway(isAwayNow());
    }
    this.setStatus(isCandidate ? 'open' : 'waiting');
    this.refreshInterviewerStatus();
    this.held.persist();
    this.interviewer.flushPendingEdit();
  }

  /** The host ended the session: the candidate lands on Ended, an interviewer client resets like the one who ended it. */
  private handleEndFromHost(rawSummary: unknown): void {
    const role = this.roleState();
    const { connection } = this;
    const sessionId = this.identity.sessionId();
    this.recordEnd(role, sessionId, parseEndSummary(rawSummary));
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
    this.doc.clearPending();
    this.people.clear();
    if (this.candidate.hasGivenUp) {
      // Nobody listens for the host any more, so waiting to reconnect would never end.
      this.fail('Interview join: the host connection closed and the session id could not be reclaimed');
      return;
    }
    this.setStatus('reconnecting');
    // A candidate does not dial: it keeps listening and the host dials it again.
    if (this.roleState() === 'interviewer') {
      this.interviewer.scheduleReconnect();
    }
  }

  // ---- pushing local edits ----

  /** Hands the view's pending updates to the host: applied at once on the hosting tab, sent and awaited on a client. */
  private sendPush(version: number, updates: readonly Update[]): boolean {
    const sessionHost = this.interviewer.host;
    if (sessionHost !== null) {
      sessionHost.pushLocal(version, updates);
      return false;
    }
    if (this.connection === null || !this.isSynced()) {
      return false;
    }
    this.connection.sendPush(version, updates.map(toWire));
    return true;
  }
}
