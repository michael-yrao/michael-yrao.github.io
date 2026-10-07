import { watchAway } from './candidate-activity';
import { CandidateListener } from './candidate-listener';
import { PeerFactory, Transport } from '../peer-transport';
import { ClientConnection } from './session-client';

/** The most incoming connections that may be mid-handshake at once; a stranger cannot hold more slots than this. */
export const MAX_PENDING_HANDSHAKES = 3;

/** What the candidate's side needs from its tab. */
export interface CandidateSideHooks {
  /** Starts the handshake on `transport`; null when the tab cannot (the transport is closed then). */
  openClient(transport: Transport): ClientConnection | null;
  /** True while a verified host connection is the current one. */
  hasVerifiedHost(): boolean;
  /** The tab went away or came back. */
  onAway(isAway: boolean): void;
  onError(context: string): void;
}

/**
 * The candidate tab's side of a session: it registers the session id and listens for the hosting tab's dial,
 * runs at most `MAX_PENDING_HANDSHAKES` handshakes at once, and reports when the tab goes away. `stop` releases
 * the id and the tab listeners; a stopped side calls nothing back.
 */
export class CandidateSide {
  private listener: CandidateListener | null = null;
  private stopWatchingAway: (() => void) | null = null;
  private pending: ReadonlySet<ClientConnection> = new Set();
  private isGivenUp = false;

  constructor(
    private readonly factory: PeerFactory,
    private readonly hooks: CandidateSideHooks,
  ) {}

  get isListening(): boolean {
    return this.listener !== null;
  }

  /** True once the id stayed taken past the time limit: nobody is listening for a host any more. */
  get hasGivenUp(): boolean {
    return this.isGivenUp;
  }

  /** Registers `sessionId` and resolves once it is held, the side is stopped, or the listener has given up. */
  async listen(sessionId: string): Promise<void> {
    this.isGivenUp = false;
    this.stopWatchingAway = watchAway((isAway) => this.hooks.onAway(isAway));
    const listener = new CandidateListener(this.factory, sessionId, {
      onConnection: (transport) => this.acceptDialer(transport),
      onUnavailable: () => this.giveUp(),
    });
    this.listener = listener;
    await listener.start();
  }

  stop(): void {
    this.listener?.stop();
    this.listener = null;
    this.stopWatchingAway?.();
    this.stopWatchingAway = null;
    this.pending = new Set();
  }

  /** A handshake verified or its connection closed: its slot is free again. */
  release(connection: ClientConnection): void {
    this.pending = new Set([...this.pending].filter((other) => other !== connection));
  }

  private acceptDialer(transport: Transport): void {
    if (this.pending.size >= MAX_PENDING_HANDSHAKES) {
      console.error('Interview candidate: closed a connection, too many handshakes are already pending');
      transport.close();
      return;
    }
    const connection = this.hooks.openClient(transport);
    if (connection !== null) {
      this.pending = new Set([...this.pending, connection]);
    }
  }

  private giveUp(): void {
    this.isGivenUp = true;
    if (this.hooks.hasVerifiedHost()) {
      console.error('Interview candidate: the session id stayed taken, but a host is connected; keeping the session');
      return;
    }
    this.hooks.onError('Interview join: the session id stayed taken until the time limit');
  }
}
