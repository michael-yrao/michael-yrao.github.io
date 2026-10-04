import { createNonce, signChallenge, verifyChallenge } from './host-key';
import { PeerFactory, Transport } from './peer-transport';
import {
  HelloMessage,
  InitMessage,
  Participant,
  ParticipantRole,
  ProofMessage,
  RevisedDoc,
  SessionMessage,
  WireUpdate,
  parseSessionMessage,
} from './session-message';
import { END_GRACE_MS } from './session-support';

export const CONNECT_TIMEOUT_MS = 20_000;
/** How long a host may take to answer the challenge once the connection is open. */
const PROOF_TIMEOUT_MS = CONNECT_TIMEOUT_MS;

/** Dials `peerId`; a connect that outlasts `CONNECT_TIMEOUT_MS` fails, and a late transport is closed unused. */
export function dialWithTimeout(factory: PeerFactory, peerId: string): Promise<Transport> {
  return new Promise<Transport>((resolve, reject) => {
    let isTimedOut = false;
    const timer = setTimeout(() => {
      isTimedOut = true;
      reject(new Error(`No answer from the interviewer within ${CONNECT_TIMEOUT_MS} ms`));
    }, CONNECT_TIMEOUT_MS);
    factory.connect(peerId).then(
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

/** Who this side is and what it can prove; the private key is the interviewer's alone. */
export interface ClientIdentity {
  readonly sessionId: string;
  readonly publicKey: CryptoKey;
  readonly privateKey: CryptoKey | null;
  readonly clientId: string;
  readonly role: ParticipantRole;
}

export interface ClientHooks {
  getName(): string;
  /** This side's best current text for the hello, with the revision it belongs to, or null when it has none. */
  getDoc(): RevisedDoc | null;
  /** The host's proof verified: the connection is to the real session. */
  onVerified(): void;
  onInit(init: InitMessage): void;
  onUpdates(updates: readonly WireUpdate[]): void;
  onRoster(participants: readonly Participant[]): void;
  onEnd(): void;
  onClosed(connection: ClientConnection): void;
}

type ClientPhase = 'awaiting-proof' | 'verifying' | 'ready' | 'ending' | 'closed';

/**
 * One client-side connection to the host. It sends a challenge on open and ignores everything
 * but the proof until the proof verifies; only then does it send its hello (name and code), and
 * only then does it accept init, updates, roster and end. `endSession` moves it to an ending phase
 * that dispatches nothing and closes on the host's `end` echo or after `END_GRACE_MS`.
 */
export class ClientConnection {
  private phase: ClientPhase = 'awaiting-proof';
  private readonly nonce = createNonce();
  private readonly proofTimer: ReturnType<typeof setTimeout>;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private isEnding = false;

  constructor(
    private readonly transport: Transport,
    private readonly identity: ClientIdentity,
    private readonly hooks: ClientHooks,
  ) {
    transport.onMessage((data) => this.receive(data));
    transport.onClose(() => {
      this.stopWaiting();
      if (!this.isEnding) {
        this.hooks.onClosed(this);
      }
    });
    this.proofTimer = setTimeout(() => this.abandonUnansweredHost(), PROOF_TIMEOUT_MS);
    transport.send({ type: 'challenge', nonce: this.nonce } satisfies SessionMessage);
  }

  get isReady(): boolean {
    return this.phase === 'ready';
  }

  sendPush(version: number, updates: readonly WireUpdate[]): void {
    this.sendWhenReady({ type: 'push', version, updates });
  }

  sendName(name: string): void {
    this.sendWhenReady({ type: 'name', name });
  }

  /**
   * Asks the host to end the session, then waits for its `end` echo (or `END_GRACE_MS`) before closing,
   * because closing at once can drop the `end`. A connection that is not ready just closes.
   */
  endSession(): void {
    if (this.phase !== 'ready') {
      this.close();
      return;
    }
    this.transport.send({ type: 'end' } satisfies SessionMessage);
    this.phase = 'ending';
    this.isEnding = true;
    this.endTimer = setTimeout(() => this.close(), END_GRACE_MS);
  }

  close(): void {
    this.stopWaiting();
    this.transport.close();
  }

  private stopWaiting(): void {
    this.phase = 'closed';
    clearTimeout(this.proofTimer);
    if (this.endTimer !== null) {
      clearTimeout(this.endTimer);
      this.endTimer = null;
    }
  }

  private abandonUnansweredHost(): void {
    if (this.phase !== 'awaiting-proof') {
      return;
    }
    console.error('Interview: the host did not answer the challenge in time; closing');
    this.close();
  }

  private sendWhenReady(message: SessionMessage): void {
    if (this.phase === 'ready') {
      this.transport.send(message);
    }
  }

  private receive(data: unknown): void {
    if (this.phase === 'closed') {
      return;
    }
    const message = parseSessionMessage(data);
    if (message === null) {
      return;
    }
    if (this.phase === 'ending') {
      if (message.type === 'end') {
        this.close();
      }
      return;
    }
    if (this.phase === 'ready') {
      this.dispatch(message);
      return;
    }
    // Before the proof verifies, every message but the first proof is ignored.
    if (message.type === 'proof' && this.phase === 'awaiting-proof') {
      void this.handleProof(message);
    }
  }

  private dispatch(message: SessionMessage): void {
    switch (message.type) {
      case 'init':
        this.hooks.onInit(message);
        return;
      case 'updates':
        this.hooks.onUpdates(message.updates);
        return;
      case 'roster':
        this.hooks.onRoster(message.participants);
        return;
      case 'end':
        this.hooks.onEnd();
        return;
      default:
        console.error('Unexpected message from the host', message.type);
    }
  }

  private async handleProof(proof: ProofMessage): Promise<void> {
    this.phase = 'verifying';
    const { publicKey, sessionId } = this.identity;
    const isValid = await verifyChallenge(publicKey, 'proof', this.nonce, sessionId, proof.signature);
    if (this.phase !== 'verifying') {
      return;
    }
    if (!isValid) {
      console.error('Interview: the host failed the proof check; closing');
      this.close();
      return;
    }
    this.phase = 'ready';
    clearTimeout(this.proofTimer);
    this.hooks.onVerified();
    await this.sendHello(proof.nonce);
  }

  private async sendHello(hostNonce: string): Promise<void> {
    const { privateKey, sessionId, clientId, role } = this.identity;
    try {
      const signature = privateKey === null ? undefined : await signChallenge(privateKey, 'hello', hostNonce, sessionId);
      if (this.phase !== 'ready') {
        return;
      }
      const revised = this.hooks.getDoc();
      const hello: HelloMessage = {
        type: 'hello',
        id: clientId,
        role,
        name: this.hooks.getName(),
        doc: revised?.doc ?? null,
        rev: revised?.rev ?? 0,
        ...(signature === undefined ? {} : { signature }),
      };
      this.transport.send(hello);
    } catch (error) {
      console.error('Interview: could not send the hello', error);
      this.close();
    }
  }
}
