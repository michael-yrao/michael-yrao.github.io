// Owns an interviewer tab's hosting: the dial-or-host loop, the SessionHost it wins, and the redial after a lost connection.
import { ClientConnection, dialWithTimeout } from '../client/session-client';
import { InterviewProblem } from '../interview-problem';
import { Host, PeerFactory, Transport } from '../peer-transport';
import { RevisedDoc } from '../session-message';
import { RECONNECT_DELAY_MS } from '../session-support';
import { InterviewerLoop, LoopIds } from './interviewer-loop';
import { HostConfig, HostEvents, SessionHost } from './session-host';

/** What a hosting attempt needs from its tab: everything in the host's config except the candidate dial, which the side owns. */
export type HostInputs = Omit<HostConfig, 'dialCandidate'>;

/** What the interviewer side needs from its tab. */
export interface InterviewerSideHooks {
  /** The ids to dial and host, or null while the tab has no identity. */
  ids(): LoopIds | null;
  /** The session's generation; a changed one means the work was superseded. */
  generation(): number;
  /** The inputs for one hosting attempt; null when the tab has no keys. */
  hostInputs(sessionId: string, takeover: RevisedDoc | null): HostInputs | null;
  /** Where the host reports its roster, authority, end requests and problem changes. */
  readonly hostEvents: HostEvents;
  /** The dial reached the host: the tab runs the client handshake on `transport`. */
  onClient(transport: Transport): void;
  /** This tab registered the host id and now hosts. */
  onHosting(): void;
  /** Another tab holds the session id: the tab supersedes its pending work and resets what hosting set up, before the host shuts down. */
  onDemote(): void;
  /** The tab's synced doc, handed to a loop that restarts after a drop or a demotion. */
  syncedDoc(): RevisedDoc | null;
  /** The tab's client connection to the host, when it has one. */
  connection(): ClientConnection | null;
  onFail(context: string, error?: unknown): void;
}

export class InterviewerSide {
  private readonly loop: InterviewerLoop;
  private sessionHost: SessionHost | null = null;
  /** The newest problem edit made before this tab hosted or had a ready host connection; null when none waits. */
  private pendingEdit: InterviewProblem | null = null;
  private redialTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly factory: PeerFactory,
    private readonly hooks: InterviewerSideHooks,
  ) {
    this.loop = new InterviewerLoop(factory, {
      ids: () => hooks.ids(),
      isCurrent: (generation) => generation === hooks.generation(),
      createHost: (sessionId, takeover) => this.createHost(sessionId, takeover),
      onClient: (transport) => hooks.onClient(transport),
      onHosting: (sessionHost, peer) => this.startHosting(sessionHost, peer),
      onHostError: (sessionHost, error) => this.handleHostError(sessionHost, error),
      onBrokerDisconnected: (sessionHost) => this.handleBrokerDisconnected(sessionHost),
      onFail: (context, error) => hooks.onFail(context, error),
    });
  }

  /** The host this tab runs, or null while it only dials. */
  get host(): SessionHost | null {
    return this.sessionHost;
  }

  run(generation: number, takeover: RevisedDoc | null): Promise<void> {
    return this.loop.run(generation, takeover);
  }

  clearFailures(): void {
    this.loop.clearFailures();
  }

  /** A new session starts: failures and any held problem edit belong to the old one. */
  reset(): void {
    this.clearFailures();
    this.pendingEdit = null;
  }

  /**
   * An interviewer's new version of the problem. The hosting tab signs and numbers it itself; any other tab asks the
   * host. Before there is a host to take it, the newest edit is kept and sent once this tab hosts or is initialised.
   */
  editProblem(problem: InterviewProblem): Promise<void> {
    if (this.sessionHost !== null) {
      return this.sessionHost.editLocal(problem);
    }
    const connection = this.hooks.connection();
    if (connection === null || !connection.isReady) {
      this.pendingEdit = problem;
      return Promise.resolve();
    }
    connection.sendEditProblem(problem);
    return Promise.resolve();
  }

  /** Sends the edit held while this tab had no host to take it; it is held again if there is still none. */
  flushPendingEdit(): void {
    const pending = this.pendingEdit;
    if (pending === null) {
      return;
    }
    this.pendingEdit = null;
    void this.editProblem(pending);
  }

  /** Cancels the pending retry wait and the re-dial timer. */
  cancel(): void {
    this.loop.cancelWait();
    if (this.redialTimer !== null) {
      clearTimeout(this.redialTimer);
      this.redialTimer = null;
    }
  }

  /** Hands the host over, so the caller can end or shut it down; this side no longer holds one. */
  release(): SessionHost | null {
    const { sessionHost } = this;
    this.sessionHost = null;
    return sessionHost;
  }

  /** At most one reconnect runs: a pending timer blocks another, and the old connection's late close is ignored. */
  scheduleReconnect(): void {
    if (this.redialTimer !== null) {
      return;
    }
    const generation = this.hooks.generation();
    this.redialTimer = setTimeout(() => {
      this.redialTimer = null;
      void this.reconnect(generation);
    }, RECONNECT_DELAY_MS);
  }

  private async reconnect(generation: number): Promise<void> {
    if (generation !== this.hooks.generation()) {
      return;
    }
    await this.run(generation, this.hooks.syncedDoc());
  }

  /** A fresh host for one hosting attempt; the candidate's own dial goes through a fresh Peer, never the hosting one. */
  private createHost(sessionId: string, takeover: RevisedDoc | null): SessionHost | null {
    const inputs = this.hooks.hostInputs(sessionId, takeover);
    if (inputs === null) {
      return null;
    }
    return new SessionHost({ ...inputs, dialCandidate: () => dialWithTimeout(this.factory, sessionId) }, this.hooks.hostEvents);
  }

  private startHosting(sessionHost: SessionHost, peer: Host): void {
    this.sessionHost = sessionHost;
    sessionHost.attach(peer);
    this.hooks.onHosting();
  }

  private handleHostError(sessionHost: SessionHost, error: unknown): void {
    if (this.sessionHost !== sessionHost) {
      return;
    }
    // Before the generic failure path: a taken id means another tab holds the lock, so this one steps down.
    const reaction = sessionHost.reactToPeerError(error);
    if (reaction === 'demote') {
      this.demote(sessionHost);
    } else if (reaction === 'fatal') {
      this.hooks.onFail('Peer error', error);
    }
  }

  private handleBrokerDisconnected(sessionHost: SessionHost): void {
    if (this.sessionHost === sessionHost) {
      sessionHost.reconnectBroker();
    }
  }

  /** Another tab holds the session id: close this host's transports (no `end`), drop the authority, rejoin as a client. */
  private demote(sessionHost: SessionHost): void {
    console.error('Interview host: another tab holds the session id; rejoining as a client');
    this.hooks.onDemote();
    this.sessionHost = null;
    sessionHost.shutdown();
    void this.run(this.hooks.generation(), this.hooks.syncedDoc());
  }
}
