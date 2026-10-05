import { InjectionToken } from '@angular/core';

/** One open connection to the other browser. */
export interface Transport {
  send(message: unknown): void;
  onMessage(handler: (data: unknown) => void): void;
  onClose(handler: () => void): void;
  close(): void;
}

/** An open Peer waiting for connections. */
export interface Host {
  readonly id: string;
  destroy(): void;
  /** Re-registers the id with the broker after it was lost. A no-op unless the Peer is disconnected. */
  reconnect(): void;
  /** True while the Peer has lost its broker registration. */
  isDisconnected(): boolean;
}

export interface PeerFactory {
  /**
   * Opens a Peer registered under `id` and hands over each incoming connection once it is open.
   * An id that is already taken rejects with an error whose `type` is `'unavailable-id'`; the same
   * error reaches `onError` when a `reconnect()` finds the id taken. `onDisconnected` fires when the
   * Peer loses its broker registration (open connections stay up).
   */
  host(
    id: string,
    onConnection: (transport: Transport) => void,
    onError: (error: unknown) => void,
    onDisconnected: () => void,
  ): Promise<Host>;
  /** Opens a Peer and dials `peerId`; closing the transport also destroys that Peer. */
  connect(peerId: string): Promise<Transport>;
}

// The structural slices of PeerJS used here, so no PeerJS type leaks out of this file.
interface PeerConnection {
  send(data: unknown): void;
  close(): void;
  on(event: 'open' | 'close', handler: () => void): void;
  on(event: 'data', handler: (data: unknown) => void): void;
  on(event: 'error', handler: (error: unknown) => void): void;
}
interface PeerLike {
  readonly disconnected: boolean;
  readonly destroyed: boolean;
  connect(id: string, options: { serialization: 'json' }): PeerConnection;
  destroy(): void;
  reconnect(): void;
  on(event: 'open', handler: (id: string) => void): void;
  on(event: 'disconnected', handler: () => void): void;
  on(event: 'connection', handler: (connection: PeerConnection) => void): void;
  on(event: 'error', handler: (error: unknown) => void): void;
}

const SERIALIZATION = 'json' as const;

/** Opens a Peer under `requestedId`, or under a random id the broker picks when none is given. */
async function openPeer(requestedId?: string): Promise<{ peer: PeerLike; id: string }> {
  const { Peer } = await import('peerjs');
  const peer = (requestedId === undefined ? new Peer() : new Peer(requestedId)) as unknown as PeerLike;
  try {
    const id = await new Promise<string>((resolve, reject) => {
      peer.on('open', resolve);
      peer.on('error', reject);
    });
    return { peer, id };
  } catch (error) {
    peer.destroy();
    throw error;
  }
}

function wrap(connection: PeerConnection, onClosed: () => void): Transport {
  const closeHandlers: (() => void)[] = [];
  const notifyClosed = () => {
    onClosed();
    closeHandlers.forEach((handler) => handler());
  };
  connection.on('close', notifyClosed);
  connection.on('error', (error) => {
    console.error('Peer connection error', error);
    notifyClosed();
  });
  return {
    send: (message) => connection.send(message),
    onMessage: (handler) => connection.on('data', handler),
    onClose: (handler) => closeHandlers.push(handler),
    close: () => connection.close(),
  };
}

const peerjsFactory: PeerFactory = {
  async host(requestedId, onConnection, onError, onDisconnected) {
    const { peer, id } = await openPeer(requestedId);
    peer.on('error', onError);
    peer.on('disconnected', onDisconnected);
    peer.on('connection', (connection) => {
      connection.on('open', () => onConnection(wrap(connection, () => undefined)));
    });
    return {
      id,
      destroy: () => peer.destroy(),
      // PeerJS throws when the Peer is not disconnected or is already destroyed.
      reconnect: () => {
        if (peer.disconnected && !peer.destroyed) {
          peer.reconnect();
        }
      },
      isDisconnected: () => peer.disconnected,
    };
  },

  async connect(peerId) {
    const { peer } = await openPeer();
    const connection = peer.connect(peerId, { serialization: SERIALIZATION });
    try {
      await new Promise<void>((resolve, reject) => {
        connection.on('open', resolve);
        connection.on('error', reject);
        // An unknown peer id is reported on the Peer, not on the connection.
        peer.on('error', reject);
      });
    } catch (error) {
      peer.destroy();
      throw error;
    }
    return wrap(connection, () => peer.destroy());
  },
};

export const PEER_FACTORY = new InjectionToken<PeerFactory>('PEER_FACTORY', {
  providedIn: 'root',
  factory: () => peerjsFactory,
});
