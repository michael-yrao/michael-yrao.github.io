import { InjectionToken } from '@angular/core';

/** One open connection to the other browser. */
export interface Transport {
  send(message: unknown): void;
  onMessage(handler: (data: unknown) => void): void;
  onClose(handler: () => void): void;
  close(): void;
}

/** An open Peer waiting for a candidate. */
export interface Host {
  readonly id: string;
  destroy(): void;
}

export interface PeerFactory {
  /** Opens a Peer and hands over each incoming connection once it is open. */
  host(onConnection: (transport: Transport) => void, onError: (error: unknown) => void): Promise<Host>;
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
  connect(id: string, options: { serialization: 'json' }): PeerConnection;
  destroy(): void;
  on(event: 'open', handler: (id: string) => void): void;
  on(event: 'connection', handler: (connection: PeerConnection) => void): void;
  on(event: 'error', handler: (error: unknown) => void): void;
}

const SERIALIZATION = 'json' as const;

async function openPeer(): Promise<{ peer: PeerLike; id: string }> {
  const { Peer } = await import('peerjs');
  const peer = new Peer() as unknown as PeerLike;
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
  async host(onConnection, onError) {
    const { peer, id } = await openPeer();
    peer.on('error', onError);
    peer.on('connection', (connection) => {
      connection.on('open', () => onConnection(wrap(connection, () => undefined)));
    });
    return { id, destroy: () => peer.destroy() };
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
