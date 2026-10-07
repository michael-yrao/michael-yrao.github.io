import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { vi } from 'vitest';

import { InterviewDirectoryService } from '../../directory/interview-directory.service';
import { HostKeys, createNonce, parsePackedKey, signChallenge } from '../crypto/host-key';
import { InterviewProblem } from '../interview-problem';
import { InterviewSessionService, RECONNECT_DELAY_MS } from '../interview-session.service';
import { Host, PEER_FACTORY, PeerFactory, Transport } from '../peer-transport';
import { PreparedInterviewsService } from '../prepared-interviews.service';
import { hostPeerIdFromPacked, sessionIdFromPublicKey } from '../crypto/session-id';

export const STUB = 'stub';
export const PROBLEM: InterviewProblem = {
  title: 'Pair sum',
  statement: 'Find a pair.',
  starter: STUB,
  entry: null,
  compare: 'exact',
  cases: [],
  result: null,
  types: null,
  figure: null,
  source: null,
};
export const PAGE_URL = 'https://site.test/interview';
/** Fake time one `settle` covers by default: enough steps for a handshake's crypto and 0 ms hops, under the reconnect delay. */
export const SETTLE_MS = 1_000;
export const SETTLE_STEP_MS = 20;
export const COARSE_STEP_MS = 500;
/**
 * Fake time that reaches a candidate who registered after the hosting tab's first dial: that dial found nobody,
 * so the next one is `RECONNECT_DELAY_MS` later, then a handshake.
 */
export const REACH_MS = RECONNECT_DELAY_MS + SETTLE_MS;
/** Node's own setImmediate, left unfaked and untyped by the DOM lib. */
const realSetImmediate = (globalThis as unknown as { setImmediate: (callback: () => void) => void }).setImmediate;

/** The WebCrypto calls the handshake makes; each is counted while it is in flight. */
const CRYPTO_METHODS = ['generateKey', 'exportKey', 'importKey', 'sign', 'verify', 'digest'] as const;
/** Real time a settle waits for in-flight crypto before failing: a hung call, not a slow machine. */
const CRYPTO_WAIT_CAP_MS = 10_000;
let pendingCrypto = 0;

/** Counts every in-flight WebCrypto call, so `settle` can wait for a condition instead of a fixed number of yields. */
function trackCrypto(): void {
  pendingCrypto = 0;
  const subtle = crypto.subtle as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  CRYPTO_METHODS.forEach((method) => {
    const original = subtle[method].bind(subtle);
    vi.spyOn(subtle, method).mockImplementation(async (...args: unknown[]) => {
      pendingCrypto += 1;
      try {
        return await original(...args);
      } finally {
        pendingCrypto -= 1;
      }
    });
  });
}

const yieldToEventLoop = (): Promise<void> => new Promise<void>((resolve) => realSetImmediate(resolve));

/** Yields to the real event loop until no WebCrypto call is in flight; fails clearly if one never returns. */
async function drainCrypto(): Promise<void> {
  const startedAt = performance.now();
  while (pendingCrypto > 0) {
    if (performance.now() - startedAt > CRYPTO_WAIT_CAP_MS) {
      throw new Error(`${pendingCrypto} WebCrypto call(s) still in flight after ${CRYPTO_WAIT_CAP_MS} ms of real time`);
    }
    await yieldToEventLoop();
  }
}

/**
 * WebCrypto settles on the real event loop, so only timers and the clock are faked. `settle` advances fake time
 * in steps and, after each, waits (in real time) until every in-flight crypto call has returned, so how long the
 * machine takes to run crypto never changes how many handshake hops fit in the fake time.
 */
export function useFakeClock(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  trackCrypto();
}

export async function settle(ms: number = SETTLE_MS, step: number = SETTLE_STEP_MS): Promise<void> {
  let remaining = ms;
  do {
    const advance = Math.min(step, remaining);
    await vi.advanceTimersByTimeAsync(advance);
    await yieldToEventLoop();
    await drainCrypto();
    remaining -= advance;
  } while (remaining > 0);
}

/**
 * Settles to just after the hosting tab's next dial tick. Its dials fall `RECONNECT_DELAY_MS` apart from `since`
 * (when it began hosting), so a test that needs a gap before the next dial starts from here.
 */
export async function settleJustAfterDial(since: number): Promise<void> {
  const untilNextDial = RECONNECT_DELAY_MS - ((Date.now() - since) % RECONNECT_DELAY_MS);
  await settle(untilNextDial + SETTLE_STEP_MS);
}

/** An open connection's two ends; delivery is a macrotask, and a message undelivered at close is discarded. */
interface Pair {
  readonly hostSide: Transport;
  readonly clientSide: Transport;
  readonly close: () => void;
  readonly isClosed: () => boolean;
}

function createPair(): Pair {
  const handlers = [
    { message: null as null | ((data: unknown) => void), close: null as null | (() => void) },
    { message: null as null | ((data: unknown) => void), close: null as null | (() => void) },
  ];
  let isClosed = false;
  const close = () => {
    if (isClosed) {
      return;
    }
    isClosed = true;
    handlers.forEach((side) => setTimeout(() => side.close?.()));
  };
  const endpoint = (self: number): Transport => ({
    send: (message) => {
      const data = JSON.parse(JSON.stringify(message));
      setTimeout(() => {
        if (!isClosed) {
          handlers[1 - self].message?.(data);
        }
      });
    },
    onMessage: (handler) => (handlers[self].message = handler),
    onClose: (handler) => (handlers[self].close = handler),
    close,
  });
  return { hostSide: endpoint(0), clientSide: endpoint(1), close, isClosed: () => isClosed };
}

interface Registration {
  readonly onConnection: (transport: Transport) => void;
  readonly onError: (error: unknown) => void;
  readonly onDisconnected: () => void;
}

/** One id's registration with the fake broker. */
interface FakeHost {
  readonly host: Host;
  /** The broker forgets the id and tells the host; open transports stay up. */
  dropRegistration(): void;
  openTransports(): number;
}

/** An in-memory stand-in for the PeerJS broker: one holder per id, as the real broker grants it. */
export function createNetwork() {
  interface Entry extends FakeHost {
    readonly pairs: Pair[];
    readonly registration: Registration;
  }
  const registry = new Map<string, Entry>();
  const allPairs: Pair[] = [];

  function register(id: string, registration: Registration): Entry {
    const pairs: Pair[] = [];
    let isDisconnected = false;
    let isDestroyed = false;
    const release = () => {
      if (registry.get(id) === entry) {
        registry.delete(id);
      }
    };
    const reconnectNow = () => {
      if (!isDisconnected || isDestroyed) {
        return;
      }
      if (registry.has(id)) {
        registration.onError({ type: 'unavailable-id' });
        return;
      }
      registry.set(id, entry);
      isDisconnected = false;
    };
    const host: Host = {
      id,
      destroy: () => {
        isDestroyed = true;
        release();
        pairs.forEach((pair) => pair.close());
      },
      reconnect: () => {
        setTimeout(reconnectNow);
      },
      isDisconnected: () => isDisconnected,
    };
    const entry: Entry = {
      host,
      pairs,
      registration,
      dropRegistration: () => {
        release();
        isDisconnected = true;
        registration.onDisconnected();
      },
      openTransports: () => pairs.filter((pair) => !pair.isClosed()).length,
    };
    registry.set(id, entry);
    return entry;
  }

  const factory: PeerFactory = {
    host: async (id, onConnection, onError, onDisconnected) => {
      if (registry.has(id)) {
        throw { type: 'unavailable-id' };
      }
      return register(id, { onConnection, onError, onDisconnected }).host;
    },
    connect: async (id) => {
      const target = registry.get(id);
      if (target === undefined) {
        throw { type: 'peer-unavailable' };
      }
      const pair = createPair();
      target.pairs.push(pair);
      allPairs.push(pair);
      target.registration.onConnection(pair.hostSide);
      return pair.clientSide;
    },
  };

  /** A browser tab's view of the network: `kill` drops everything the tab opened, as closing the tab would. */
  function tab() {
    const hosts: Host[] = [];
    const transports: Transport[] = [];
    let isDead = false;
    const tabFactory: PeerFactory = {
      host: async (...args) => {
        if (isDead) {
          throw { type: 'network' };
        }
        const host = await factory.host(...args);
        hosts.push(host);
        return host;
      },
      connect: async (id) => {
        if (isDead) {
          throw { type: 'peer-unavailable' };
        }
        const transport = await factory.connect(id);
        transports.push(transport);
        return transport;
      },
    };
    const kill = () => {
      isDead = true;
      hosts.forEach((host) => host.destroy());
      transports.forEach((transport) => transport.close());
    };
    return { factory: tabFactory, kill };
  }

  return {
    factory,
    tab,
    /** Closes every open transport; registrations stay. */
    dropAll: () => allPairs.forEach((pair) => pair.close()),
    holder: (id: string): FakeHost | undefined => registry.get(id),
    holders: (): number => registry.size,
    /** Registers `id` for a scripted holder that is not a service. */
    hold: (id: string, onConnection: (transport: Transport) => void): void => {
      register(id, { onConnection, onError: () => undefined, onDisconnected: () => undefined });
    },
  };
}

export type Network = ReturnType<typeof createNetwork>;

/** Every service a test made, ended in cleanup so no re-dial timer outlives its test. */
const services: InterviewSessionService[] = [];

/** Ends every service a test made. */
export function endAllServices(): void {
  services.splice(0).forEach((service) => service.end());
}

/** A directory that is switched off: nothing leaves the test, and every entry stays in this browser. */
const DISABLED_DIRECTORY = {
  isEnabled: false,
  lookupCandidate: () => Promise.resolve({ status: 'disabled' }),
  fetchInterviewer: () => Promise.resolve({ status: 'disabled' }),
  push: () => Promise.resolve({ outcome: 'disabled' }),
  remove: () => Promise.resolve('disabled'),
} as unknown as InterviewDirectoryService;

export function createPeer(factory: PeerFactory) {
  const navigate = vi.fn().mockResolvedValue(true);
  const injector = Injector.create({
    providers: [
      { provide: PEER_FACTORY, useValue: factory },
      { provide: Router, useValue: { navigate } },
      { provide: InterviewDirectoryService, useValue: DISABLED_DIRECTORY },
      { provide: PreparedInterviewsService, useClass: PreparedInterviewsService },
      { provide: InterviewSessionService, useClass: InterviewSessionService },
    ],
  });
  const service = injector.get(InterviewSessionService);
  services.push(service);
  return { service, navigate };
}

export function linkParam(url: string | null, name: 'join' | 'host'): string {
  const value = new URL(url ?? '').searchParams.get(name);
  if (value === null) {
    throw new Error(`the link has no ${name} value`);
  }
  return value;
}

/** An interviewer who started the session and, with no other host, hosts it. */
export async function startHost(factory: PeerFactory, problem: InterviewProblem = PROBLEM) {
  const prepared = await prepareInterview(problem);
  const peer = createPeer(factory);
  await peer.service.resume(prepared.hostValue);
  const joinValue = linkParam(peer.service.inviteUrl(), 'join');
  const hostValue = linkParam(peer.service.hostUrl(), 'host');
  return {
    ...peer,
    joinValue,
    hostValue,
    sessionId: await sessionIdFromPublicKey(joinValue),
    hostPeerId: await hostPeerIdFromPacked(hostValue),
    /** The fake time at which this tab began hosting. */
    hostedAt: Date.now(),
  };
}

/**
 * An interview prepared ahead of time, with no session started: both link values, and the service that holds it. Its
 * `localStorage` is the one every tab shares, so a fresh device is `localStorage.clear()` then `savePrepared`.
 */
export async function prepareInterview(problem: InterviewProblem = PROBLEM) {
  const service = Injector.create({
    providers: [
      { provide: InterviewDirectoryService, useValue: DISABLED_DIRECTORY },
      { provide: PreparedInterviewsService, useClass: PreparedInterviewsService },
    ],
  }).get(PreparedInterviewsService);
  const sessionId = await service.prepare(problem);
  const packed = sessionId === null ? null : service.packedOf(sessionId);
  const keys = packed === null ? null : await parsePackedKey(packed);
  if (sessionId === null || packed === null || keys === null) {
    throw new Error('could not prepare an interview');
  }
  return { service, sessionId, hostValue: packed, joinValue: keys.publicRaw };
}

export async function resumeInterviewer(factory: PeerFactory, hostValue: string) {
  const peer = createPeer(factory);
  await peer.service.resume(hostValue);
  return peer;
}

export async function joinCandidate(factory: PeerFactory, joinValue: string) {
  const peer = createPeer(factory);
  await peer.service.join(joinValue);
  return peer;
}

/** The host puts itself first in every roster, so its id is the first entry on every tab. */
export function hostIdOf(service: InterviewSessionService): string | undefined {
  return service.roster()[0]?.id;
}

export function mountEditor(service: InterviewSessionService): EditorView {
  const shared = service.sharedDoc();
  if (shared === null) {
    throw new Error('no shared doc to mount');
  }
  return new EditorView({
    state: EditorState.create({ doc: shared.doc, extensions: service.collabExtensions() }),
    parent: document.body,
  });
}

/** Answers a challenge with a proof signed by `wrongKeys`, bound to `sessionId`, and records everything it receives. */
function scriptImpostor(transport: Transport, sessionId: string, wrongKeys: HostKeys, received: unknown[]): void {
  transport.onMessage((data) => {
    received.push(data);
    const message = data as { type?: string; nonce?: string };
    if (message.type === 'challenge' && message.nonce !== undefined) {
      void signChallenge(wrongKeys.privateKey, 'proof', message.nonce, sessionId).then((signature) =>
        transport.send({ type: 'proof', signature, nonce: createNonce() }),
      );
    }
  });
}

/** A holder of `holdId` that plays the host with `wrongKeys` for a session whose id is `sessionId`. */
export function holdAsImpostor(network: Network, holdId: string, sessionId: string, wrongKeys: HostKeys): { received: unknown[] } {
  const received: unknown[] = [];
  network.hold(holdId, (transport) => scriptImpostor(transport, sessionId, wrongKeys, received));
  return { received };
}

/** A dialer that reaches `sessionId` and answers the candidate's challenge with a proof signed by `wrongKeys`. */
export async function dialAsImpostor(
  network: Network,
  sessionId: string,
  wrongKeys: HostKeys,
): Promise<{ received: unknown[]; isClosed: () => boolean }> {
  const transport = await network.factory.connect(sessionId);
  const received: unknown[] = [];
  let isClosed = false;
  transport.onClose(() => (isClosed = true));
  scriptImpostor(transport, sessionId, wrongKeys, received);
  return { received, isClosed: () => isClosed };
}
