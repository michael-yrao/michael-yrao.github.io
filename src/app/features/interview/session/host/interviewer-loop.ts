import { dialWithTimeout } from '../client/session-client';
import { Host, PeerFactory, Transport } from '../peer-transport';
import { RevisedDoc } from '../session-message';
import { RECLAIM_TIMEOUT_MS, RECONNECT_DELAY_MS, errorType, isUnavailableId } from '../session-support';
import { SessionHost } from './session-host';

type AttemptOutcome = 'done' | 'retry' | 'superseded';

/** The two peer ids an interviewer tab dials and hosts. */
export interface LoopIds {
  readonly sessionId: string;
  readonly hostPeerId: string;
}

/** What the interviewer loop needs from its tab. */
export interface InterviewerLoopHooks {
  /** The ids to dial and host, or null while the tab has no identity. */
  ids(): LoopIds | null;
  /** False once the session this run belongs to was superseded. */
  isCurrent(generation: number): boolean;
  /** A fresh host for one attempt; null when the tab has no keys. */
  createHost(sessionId: string, takeover: RevisedDoc | null): SessionHost | null;
  /** The dial reached the host: the tab runs the client handshake on `transport`. */
  onClient(transport: Transport): void;
  /** This tab registered the host id. */
  onHosting(sessionHost: SessionHost, peer: Host): void;
  onHostError(sessionHost: SessionHost, error: unknown): void;
  onBrokerDisconnected(sessionHost: SessionHost): void;
  onFail(context: string, error?: unknown): void;
}

/**
 * An interviewer tab's loop: dial the host peer id; failing that, try to host it; on `unavailable-id` wait and
 * start over. It ends when this tab hosts or is connected, when superseded, or once `RECLAIM_TIMEOUT_MS` of
 * failures (counted across handshake failures too) has run out.
 */
export class InterviewerLoop {
  /** When the current run of failures began; cleared only by a verified proof or by hosting. */
  private failingSince: number | null = null;
  private wakeRetryWait: (() => void) | null = null;

  constructor(
    private readonly factory: PeerFactory,
    private readonly hooks: InterviewerLoopHooks,
  ) {}

  clearFailures(): void {
    this.failingSince = null;
  }

  /** Ends the pending retry wait at once. */
  cancelWait(): void {
    this.wakeRetryWait?.();
    this.wakeRetryWait = null;
  }

  async run(generation: number, takeover: RevisedDoc | null): Promise<void> {
    this.failingSince ??= Date.now();
    try {
      for (;;) {
        if (this.hasReclaimExpired()) {
          this.hooks.onFail('Interview: could not reach or host the session before the time limit');
          return;
        }
        const outcome = await this.attemptDialOrHost(generation, takeover);
        if (outcome !== 'retry') {
          return;
        }
        await this.waitBeforeRetry();
        if (!this.hooks.isCurrent(generation)) {
          return;
        }
      }
    } catch (error) {
      if (this.hooks.isCurrent(generation)) {
        this.hooks.onFail('Could not open a peer', error);
      }
    }
  }

  private hasReclaimExpired(): boolean {
    return this.failingSince !== null && Date.now() - this.failingSince >= RECLAIM_TIMEOUT_MS;
  }

  private async attemptDialOrHost(generation: number, takeover: RevisedDoc | null): Promise<AttemptOutcome> {
    const ids = this.hooks.ids();
    if (ids === null) {
      return 'superseded';
    }
    const transport = await this.tryDial(ids.hostPeerId);
    if (!this.hooks.isCurrent(generation)) {
      transport?.close();
      return 'superseded';
    }
    if (transport !== null) {
      this.hooks.onClient(transport);
      return 'done';
    }
    return this.tryHost(generation, ids, takeover);
  }

  private async tryDial(hostPeerId: string): Promise<Transport | null> {
    try {
      return await dialWithTimeout(this.factory, hostPeerId);
    } catch (error) {
      if (errorType(error) !== 'peer-unavailable') {
        console.error('Interview: could not dial the session', error);
      }
      return null;
    }
  }

  private async tryHost(generation: number, ids: LoopIds, takeover: RevisedDoc | null): Promise<AttemptOutcome> {
    const sessionHost = this.hooks.createHost(ids.sessionId, takeover);
    if (sessionHost === null) {
      return 'superseded';
    }
    let peer: Host;
    try {
      peer = await this.factory.host(
        ids.hostPeerId,
        (transport) => sessionHost.accept(transport),
        (error) => this.hooks.onHostError(sessionHost, error),
        () => this.hooks.onBrokerDisconnected(sessionHost),
      );
    } catch (error) {
      if (!this.hooks.isCurrent(generation)) {
        return 'superseded';
      }
      if (isUnavailableId(error)) {
        return 'retry';
      }
      throw error;
    }
    if (!this.hooks.isCurrent(generation)) {
      peer.destroy();
      return 'superseded';
    }
    this.failingSince = null;
    this.hooks.onHosting(sessionHost, peer);
    return 'done';
  }

  /** Resolves after `RECONNECT_DELAY_MS`, or at once when `cancelWait` wakes it. */
  private waitBeforeRetry(): Promise<void> {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.wakeRetryWait = null;
        resolve();
      }, RECONNECT_DELAY_MS);
      this.wakeRetryWait = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }
}
