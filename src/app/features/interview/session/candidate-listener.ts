import { Host, PeerFactory, Transport } from './peer-transport';
import { RECLAIM_TIMEOUT_MS, RECONNECT_DELAY_MS, errorType, isUnavailableId } from './session-support';

/** How a candidate's listener hands things to its tab. */
export interface ListenerEvents {
  /** A connection reached the candidate's id and is open; the tab runs the handshake on it. */
  onConnection(transport: Transport): void;
  /** The id stayed taken for `RECLAIM_TIMEOUT_MS`: the listener has given up. */
  onUnavailable(): void;
}

/**
 * The candidate's side of the connection: it registers the session id and waits for the hosting tab to dial.
 * A taken id is retried until `RECLAIM_TIMEOUT_MS`; any other registration error is logged and retried, so a
 * broker blip never ends the session. A lost broker registration is re-won, and if that finds the id taken the
 * registration loop starts over. `stop` releases the id and ends every loop.
 */
export class CandidateListener {
  private peer: Host | null = null;
  private isStopped = false;
  private takenSince: number | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private wakeWait: (() => void) | null = null;

  constructor(
    private readonly factory: PeerFactory,
    private readonly sessionId: string,
    private readonly events: ListenerEvents,
  ) {}

  /** Resolves once the id is registered, or when the listener is stopped or has given up. */
  async start(): Promise<void> {
    while (!this.isStopped) {
      const peer = await this.tryRegister();
      if (peer === 'unavailable') {
        return;
      }
      if (peer !== null) {
        this.peer = peer;
        return;
      }
      await this.wait();
    }
  }

  stop(): void {
    this.isStopped = true;
    this.wakeWait?.();
    this.clearRetryTimer();
    this.peer?.destroy();
    this.peer = null;
  }

  /** The registered Peer, a null for "retry after the delay", or 'unavailable' once the listener has given up. */
  private async tryRegister(): Promise<Host | null | 'unavailable'> {
    let peer: Host;
    try {
      peer = await this.factory.host(
        this.sessionId,
        (transport) => this.acceptConnection(transport),
        (error) => this.handlePeerError(error),
        () => this.reconnectBroker(),
      );
    } catch (error) {
      return this.handleRegistrationError(error);
    }
    if (this.isStopped) {
      peer.destroy();
      return null;
    }
    this.takenSince = null;
    return peer;
  }

  private handleRegistrationError(error: unknown): null | 'unavailable' {
    if (this.isStopped) {
      return null;
    }
    if (!isUnavailableId(error)) {
      console.error('Interview candidate: could not register the session id; will retry', error);
      this.takenSince = null;
      return null;
    }
    this.takenSince ??= Date.now();
    if (Date.now() - this.takenSince >= RECLAIM_TIMEOUT_MS) {
      this.events.onUnavailable();
      return 'unavailable';
    }
    return null;
  }

  private acceptConnection(transport: Transport): void {
    if (this.isStopped) {
      transport.close();
      return;
    }
    this.events.onConnection(transport);
  }

  private handlePeerError(error: unknown): void {
    if (this.isStopped) {
      return;
    }
    if (isUnavailableId(error)) {
      this.reRegister();
      return;
    }
    console.error(`Interview candidate: the broker connection reported "${String(errorType(error))}"`, error);
    this.scheduleBrokerReconnect();
  }

  /** The registration was lost and re-winning it found the id taken: drop this Peer and run the loop again. */
  private reRegister(): void {
    this.peer?.destroy();
    this.peer = null;
    this.takenSince = null;
    void this.start();
  }

  /** The broker dropped this Peer: win the id back now, so the candidate stays dialable. */
  private reconnectBroker(): void {
    if (!this.isStopped && this.retryTimer === null) {
      this.peer?.reconnect();
    }
  }

  private scheduleBrokerReconnect(): void {
    if (this.retryTimer !== null || this.peer?.isDisconnected() !== true) {
      return;
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (!this.isStopped) {
        this.peer?.reconnect();
      }
    }, RECONNECT_DELAY_MS);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /** Resolves after `RECONNECT_DELAY_MS`, or at once when `stop` wakes it. */
  private wait(): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.wakeWait = null;
        resolve();
      }, RECONNECT_DELAY_MS);
      this.wakeWait = () => {
        clearTimeout(timer);
        this.wakeWait = null;
        resolve();
      };
    });
  }
}

/** What a hosting tab's dialer needs to know and do. */
export interface DialerConfig {
  /** Dials the candidate through a fresh Peer; never from the hosting Peer, so the candidate cannot learn the host's id. */
  readonly dial: () => Promise<Transport>;
  /** True while the roster has no candidate and no earlier dial is still waiting on its handshake. */
  readonly isNeeded: () => boolean;
  /** An open transport to hand to the host; its handshake decides whether it is the candidate. */
  readonly onTransport: (transport: Transport) => void;
}

/**
 * The hosting tab's dial loop: one attempt now and then every `RECONNECT_DELAY_MS`, while a candidate is
 * needed. At most one dial is in flight (an unanswered stranger would otherwise pile up one transport per
 * tick); the host's `isNeeded` covers a transport that is open but not yet ready. `peer-unavailable` is
 * silent: no candidate is listening yet. `stop` ends it for good.
 */
export class CandidateDialer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private isStopped = false;
  private isDialing = false;

  constructor(private readonly config: DialerConfig) {}

  start(): void {
    if (this.isStopped || this.timer !== null) {
      return;
    }
    void this.attempt();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.start();
    }, RECONNECT_DELAY_MS);
  }

  stop(): void {
    this.isStopped = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async attempt(): Promise<void> {
    if (this.isDialing || !this.config.isNeeded()) {
      return;
    }
    this.isDialing = true;
    try {
      const transport = await this.config.dial();
      if (this.isStopped) {
        transport.close();
        return;
      }
      this.config.onTransport(transport);
    } catch (error) {
      if (errorType(error) !== 'peer-unavailable') {
        console.error('Interview host: could not dial the candidate', error);
      }
    } finally {
      this.isDialing = false;
    }
  }
}
