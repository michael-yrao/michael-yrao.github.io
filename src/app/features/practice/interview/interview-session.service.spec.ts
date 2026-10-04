import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { HostKeys, createNonce, generateHostKeys, signChallenge } from './host-key';
import {
  CONNECT_TIMEOUT_MS,
  InterviewSessionService,
  RECLAIM_TIMEOUT_MS,
  RECONNECT_DELAY_MS,
} from './interview-session.service';
import { Host, PEER_FACTORY, PeerFactory, Transport } from './peer-transport';
import { sessionIdFromPublicKey } from './session-id';
import { saveSession } from './session-store';

const STUB = 'stub';
const PROBLEM = 7;
const OTHER_PROBLEM = 3;
const PAGE_URL = 'https://site.test/practice/7';
/** Fake time one `settle` covers by default: enough steps for a handshake's crypto and 0 ms hops, under the reconnect delay. */
const SETTLE_MS = 1_000;
const SETTLE_STEP_MS = 20;
const COARSE_STEP_MS = 500;
/** A drop, the reconnect delay twice over (a lost race retries once), and a handshake. */
const TAKEOVER_MS = RECONNECT_DELAY_MS * 3 + SETTLE_MS;
/** Node's own setImmediate, left unfaked and untyped by the DOM lib. */
const realSetImmediate = (globalThis as unknown as { setImmediate: (callback: () => void) => void }).setImmediate;
const HOST_STRIP_ARGS = [[], { queryParams: { host: null }, queryParamsHandling: 'merge', replaceUrl: true }];

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
function useFakeClock(): void {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  trackCrypto();
}

async function settle(ms: number = SETTLE_MS, step: number = SETTLE_STEP_MS): Promise<void> {
  let remaining = ms;
  do {
    const advance = Math.min(step, remaining);
    await vi.advanceTimersByTimeAsync(advance);
    await yieldToEventLoop();
    await drainCrypto();
    remaining -= advance;
  } while (remaining > 0);
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
function createNetwork() {
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

  return {
    factory,
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

type Network = ReturnType<typeof createNetwork>;

/** Every service a test made, ended in cleanup so no re-dial timer outlives its test. */
const services: InterviewSessionService[] = [];

function createPeer(factory: PeerFactory) {
  const navigate = vi.fn().mockResolvedValue(true);
  const injector = Injector.create({
    providers: [
      { provide: PEER_FACTORY, useValue: factory },
      { provide: Router, useValue: { navigate } },
      { provide: InterviewSessionService, useClass: InterviewSessionService },
    ],
  });
  const service = injector.get(InterviewSessionService);
  services.push(service);
  return { service, navigate };
}

function linkParam(url: string | null, name: 'join' | 'host'): string {
  const value = new URL(url ?? '').searchParams.get(name);
  if (value === null) {
    throw new Error(`the link has no ${name} value`);
  }
  return value;
}

/** An interviewer who started the session and, with no other host, hosts it. */
async function startHost(factory: PeerFactory, problem: number = PROBLEM) {
  const peer = createPeer(factory);
  await peer.service.start(problem, STUB, PAGE_URL);
  const joinValue = linkParam(peer.service.inviteUrl(), 'join');
  return {
    ...peer,
    joinValue,
    hostValue: linkParam(peer.service.hostUrl(), 'host'),
    sessionId: await sessionIdFromPublicKey(joinValue),
  };
}

async function resumeInterviewer(factory: PeerFactory, hostValue: string) {
  const peer = createPeer(factory);
  await peer.service.resume(hostValue, PROBLEM, () => STUB);
  return peer;
}

async function joinCandidate(factory: PeerFactory, joinValue: string, problem: number = PROBLEM) {
  const peer = createPeer(factory);
  await peer.service.join(joinValue, problem);
  return peer;
}

/** The host puts itself first in every roster, so its id is the first entry on every tab. */
function hostIdOf(service: InterviewSessionService): string | undefined {
  return service.roster()[0]?.id;
}

function mountEditor(service: InterviewSessionService): EditorView {
  const shared = service.sharedDoc();
  if (shared === null) {
    throw new Error('no shared doc to mount');
  }
  return new EditorView({
    state: EditorState.create({ doc: shared.doc, extensions: service.collabExtensions() }),
    parent: document.body,
  });
}

/** A holder that answers a challenge with a proof signed by `wrongKeys` and records everything it receives. */
function holdAsImpostor(network: Network, sessionId: string, wrongKeys: HostKeys): { received: unknown[] } {
  const received: unknown[] = [];
  network.hold(sessionId, (transport) => {
    transport.onMessage((data) => {
      received.push(data);
      const message = data as { type?: string; nonce?: string };
      if (message.type === 'challenge' && message.nonce !== undefined) {
        void signChallenge(wrongKeys.privateKey, 'proof', message.nonce, sessionId).then((signature) =>
          transport.send({ type: 'proof', signature, nonce: createNonce() }),
        );
      }
    });
  });
  return { received };
}

interface Scenario {
  readonly name: string;
  readonly run: () => Promise<void>;
}

const SCENARIOS: readonly Scenario[] = [
  {
    // plan test 9
    name: 'converges after an update made in the mount gap and concurrent edits',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, interviewer.joinValue);
      await settle();

      const interviewerView = mountEditor(interviewer.service);
      interviewerView.dispatch({ changes: { from: 0, insert: 'gap-' } });
      await settle();

      const candidateView = mountEditor(candidate.service);
      await settle();
      expect(candidateView.state.doc.toString()).toBe('gap-stub');

      interviewerView.dispatch({ changes: { from: 0, insert: 'I:' } });
      candidateView.dispatch({ changes: { from: candidateView.state.doc.length, insert: ':C' } });
      await settle();

      const text = interviewerView.state.doc.toString();
      expect(candidateView.state.doc.toString()).toBe(text);
      expect(text).toContain('I:');
      expect(text).toContain(':C');
    },
  },
  {
    // plan test 9
    name: 'a reconnecting candidate is sent the current text, not the stub',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      await joinCandidate(network.factory, interviewer.joinValue);
      await settle();
      mountEditor(interviewer.service).dispatch({ changes: { from: 0, insert: 'edit-' } });
      await settle();

      network.dropAll();
      await settle();
      expect(interviewer.service.status()).toBe('waiting');

      const second = await joinCandidate(network.factory, interviewer.joinValue);
      await settle();
      expect(second.service.sharedDoc()).toEqual({ problem: PROBLEM, version: 1, doc: 'edit-stub', epoch: 0 });
      expect(interviewer.service.status()).toBe('open');
    },
  },
  {
    // plan test 9
    name: 'a candidate on another problem is told the session problem and navigates to it',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, interviewer.joinValue, OTHER_PROBLEM);
      await settle();

      expect(candidate.service.sharedDoc()?.problem).toBe(PROBLEM);
      expect(candidate.navigate).toHaveBeenCalledWith(['/practice', PROBLEM], { queryParamsHandling: 'preserve' });
    },
  },
  {
    // plan test 9
    name: 'each side sees the other side name, and a later change',
    run: async () => {
      const network = createNetwork();
      const interviewer = createPeer(network.factory);
      const candidate = createPeer(network.factory);
      await interviewer.service.start(PROBLEM, STUB, PAGE_URL);
      interviewer.service.setMyName('  Ada  ');
      const joinValue = linkParam(interviewer.service.inviteUrl(), 'join');
      await candidate.service.join(joinValue, PROBLEM);
      await settle();

      const expected = [
        { id: interviewer.service.selfId, role: 'interviewer', name: 'Ada' },
        { id: candidate.service.selfId, role: 'candidate', name: '' },
      ];
      expect(interviewer.service.roster()).toEqual(expected);
      expect(candidate.service.roster()).toEqual(expected);

      candidate.service.setMyName('Grace');
      await settle();
      const renamed = [expected[0], { ...expected[1], name: 'Grace' }];
      expect(interviewer.service.roster()).toEqual(renamed);
      expect(candidate.service.roster()).toEqual(renamed);
    },
  },
  {
    // plan test 9
    name: 'a connect that never settles keeps the candidate connecting after the time limit, and a late transport is closed',
    run: async () => {
      const keys = await generateHostKeys();
      const lateTransport = { send: vi.fn(), onMessage: vi.fn(), onClose: vi.fn(), close: vi.fn() };
      let settleConnect: (transport: Transport) => void = () => undefined;
      let dialedAt: number | null = null;
      const factory: PeerFactory = {
        host: async () => {
          throw new Error('unused');
        },
        connect: () =>
          new Promise<Transport>((resolve) => {
            dialedAt = Date.now();
            settleConnect = resolve;
          }),
      };
      const candidate = createPeer(factory).service;
      void candidate.join(keys.publicRaw, PROBLEM);
      await settle();
      if (dialedAt === null) {
        throw new Error('the candidate never dialled');
      }

      await settle(dialedAt + CONNECT_TIMEOUT_MS - 1 - Date.now());
      expect(candidate.status()).toBe('connecting');
      await settle(1);
      expect(candidate.status()).toBe('connecting');

      settleConnect(lateTransport);
      await settle(0);
      expect(lateTransport.close).toHaveBeenCalledTimes(1);
      expect(lateTransport.onMessage).not.toHaveBeenCalled();
    },
  },
  {
    name: 'a candidate who arrives before any host keeps connecting, then connects once a host appears',
    run: async () => {
      const network = createNetwork();
      const keys = await generateHostKeys();
      const candidate = await joinCandidate(network.factory, keys.publicRaw);
      await settle();
      expect(candidate.service.status()).toBe('connecting');

      await resumeInterviewer(network.factory, keys.packed);
      await settle(RECONNECT_DELAY_MS + SETTLE_MS);

      expect(candidate.service.status()).toBe('open');
      expect(candidate.service.sharedDoc()).toMatchObject({ problem: PROBLEM, doc: STUB });
    },
  },
  {
    // plan test 9
    name: 'ending as the interviewer returns the service to its starting state',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      await joinCandidate(network.factory, interviewer.joinValue);
      await settle();

      interviewer.service.end();
      expect([
        interviewer.service.role(),
        interviewer.service.status(),
        interviewer.service.sharedDoc(),
        interviewer.service.inviteUrl(),
      ]).toEqual(['none', 'idle', null, null]);
      expect(interviewer.navigate).toHaveBeenCalledWith(...HOST_STRIP_ARGS);
    },
  },
  {
    // plan test 9
    name: 'a dropped candidate reconnects read-only, then a second init bumps the epoch and resets the log',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, interviewer.joinValue);
      await settle();
      const interviewerView = mountEditor(interviewer.service);
      interviewerView.dispatch({ changes: { from: 0, insert: 'edit-' } });
      await settle();
      mountEditor(candidate.service);
      await settle();

      network.dropAll();
      await settle();
      expect([candidate.service.status(), candidate.service.isEditable()]).toEqual(['reconnecting', false]);

      await settle(RECONNECT_DELAY_MS);
      expect([candidate.service.status(), candidate.service.isEditable()]).toEqual(['open', true]);
      expect(candidate.service.sharedDoc()).toEqual({ problem: PROBLEM, version: 1, doc: 'edit-stub', epoch: 1 });

      const secondView = mountEditor(candidate.service);
      interviewerView.dispatch({ changes: { from: 0, insert: 'I:' } });
      await settle();
      expect(secondView.state.doc.toString()).toBe('I:edit-stub');
    },
  },
  {
    // plan test 9
    name: 'ending a reconnecting candidate stops the re-dial',
    run: async () => {
      const network = createNetwork();
      const connect = vi.spyOn(network.factory, 'connect');
      const interviewer = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, interviewer.joinValue);
      await settle();

      network.dropAll();
      await settle();
      expect(candidate.service.status()).toBe('reconnecting');

      const dialsBeforeEnd = connect.mock.calls.length;
      candidate.service.end();
      await settle(RECONNECT_DELAY_MS * 2);
      expect([candidate.service.status(), connect.mock.calls.length]).toEqual(['closed', dialsBeforeEnd]);
    },
  },
  {
    // plan test 7
    name: 'End from an interviewer client: every participant gets end',
    run: async () => {
      const network = createNetwork();
      const host = await startHost(network.factory);
      const client = await resumeInterviewer(network.factory, host.hostValue);
      const candidate = await joinCandidate(network.factory, host.joinValue);
      await settle();
      expect(candidate.service.status()).toBe('open');

      client.service.end();
      await settle();

      expect([host.service.role(), client.service.role(), candidate.service.status()]).toEqual(['none', 'none', 'closed']);
      expect(host.navigate).toHaveBeenCalledWith(...HOST_STRIP_ARGS);
      expect(client.navigate).toHaveBeenCalledWith(...HOST_STRIP_ARGS);
    },
  },
];

describe('InterviewSessionService peer contract', () => {
  it.each(SCENARIOS)('$name', async ({ run }) => {
    await run();
  });
});

interface ImpostorCase {
  readonly name: string;
  readonly dial: (network: Network, keys: HostKeys) => Promise<unknown>;
}

const IMPOSTOR_CASES: readonly ImpostorCase[] = [
  { name: 'a candidate', dial: (network, keys) => joinCandidate(network.factory, keys.publicRaw) },
  { name: 'an interviewer', dial: (network, keys) => resumeInterviewer(network.factory, keys.packed) },
];

describe('InterviewSessionService handshake (plan test 4)', () => {
  it.each(IMPOSTOR_CASES)(
    'an impostor holding the session id: $name closes, sends no hello, and re-dials',
    async ({ dial }) => {
      const network = createNetwork();
      const keys = await generateHostKeys();
      const impostor = holdAsImpostor(network, await sessionIdFromPublicKey(keys.publicRaw), await generateHostKeys());
      const connect = vi.spyOn(network.factory, 'connect');

      await dial(network, keys);
      await settle();
      const dialsBeforeRedial = connect.mock.calls.length;
      expect(impostor.received.map((message) => (message as { type: string }).type)).toEqual(['challenge']);

      await settle(RECONNECT_DELAY_MS);
      expect(connect.mock.calls.length).toBe(dialsBeforeRedial + 1);
      expect(impostor.received.some((message) => (message as { type: string }).type === 'hello')).toBe(false);
    },
  );
});

const TAKEOVER: readonly Scenario[] = [
  {
    // plan test 5
    name: 'the host drops: one interviewer client hosts with its synced doc; the other clients reconnect and get init',
    run: async () => {
      const network = createNetwork();
      const a = await startHost(network.factory);
      const b = await resumeInterviewer(network.factory, a.hostValue);
      const d = await resumeInterviewer(network.factory, a.hostValue);
      const c = await joinCandidate(network.factory, a.joinValue);
      await settle();
      mountEditor(a.service).dispatch({ changes: { from: 0, insert: 'edit-' } });
      await settle();
      const clients = [b.service, d.service, c.service];
      const epochsBefore = clients.map((client) => client.sharedDoc()?.epoch);

      // So the new host starts from its synced doc, not a saved one.
      localStorage.clear();
      network.holder(a.sessionId)?.host.destroy();
      await settle(TAKEOVER_MS);

      expect(network.holders()).toBe(1);
      const hostId = hostIdOf(b.service);
      expect([b.service.selfId, d.service.selfId]).toContain(hostId);
      clients.forEach((client, index) => {
        expect(hostIdOf(client)).toBe(hostId);
        expect(client.roster().map((participant) => participant.id).sort()).toEqual(
          clients.map((other) => other.selfId).sort(),
        );
        expect(client.sharedDoc()?.doc).toBe('edit-stub');
        expect(client.sharedDoc()?.epoch).toBeGreaterThan(epochsBefore[index] ?? 0);
      });
    },
  },
  {
    name: 'a host that returns with a stale saved doc takes the candidate newer text instead of overwriting it',
    run: async () => {
      const network = createNetwork();
      const a = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, a.joinValue);
      await settle();

      // A drops; B takes over from the saved doc, and the candidate re-dials B and keeps coding.
      network.holder(a.sessionId)?.host.destroy();
      await resumeInterviewer(network.factory, a.hostValue);
      await settle(TAKEOVER_MS);
      mountEditor(candidate.service).dispatch({ changes: { from: 0, insert: 'newer-' } });
      await settle();

      // B leaves; A comes back with its own stale saved doc (this browser's storage held B's, so A's is put back).
      saveSession('interviewer', a.sessionId, PROBLEM, STUB, 0);
      network.holder(a.sessionId)?.host.destroy();
      const returned = await resumeInterviewer(network.factory, a.hostValue);
      await settle(TAKEOVER_MS);

      expect(returned.service.sharedDoc()?.doc).toBe('newer-stub');
      expect(candidate.service.sharedDoc()?.doc).toBe('newer-stub');
    },
  },
  {
    // plan test 5
    name: 'two interviewer tabs racing with no host: exactly one hosts, the loser becomes a client',
    run: async () => {
      const network = createNetwork();
      const keys = await generateHostKeys();
      const b = createPeer(network.factory).service;
      const d = createPeer(network.factory).service;
      void b.resume(keys.packed, PROBLEM, () => STUB);
      void d.resume(keys.packed, PROBLEM, () => STUB);
      await settle(TAKEOVER_MS);

      expect(network.holders()).toBe(1);
      const hostId = hostIdOf(b);
      expect([b.selfId, d.selfId]).toContain(hostId);
      expect(hostIdOf(d)).toBe(hostId);
      expect(b.roster().map((participant) => participant.id).sort()).toEqual([b.selfId, d.selfId].sort());
      expect([b.sharedDoc()?.doc, d.sharedDoc()?.doc]).toEqual([STUB, STUB]);
    },
  },
  {
    // plan test 5
    name: 'a host that loses its broker registration demotes itself',
    run: async () => {
      const network = createNetwork();
      const a = await startHost(network.factory);
      const c = await joinCandidate(network.factory, a.joinValue);
      await settle();
      const formerHost = network.holder(a.sessionId);
      expect(a.service.sharedDoc()?.epoch).toBe(0);

      formerHost?.dropRegistration();
      const b = await resumeInterviewer(network.factory, a.hostValue);
      await settle(TAKEOVER_MS);

      const holder = network.holder(a.sessionId);
      expect(network.holders()).toBe(1);
      expect(holder).not.toBe(formerHost);
      expect(formerHost?.openTransports()).toBe(0);
      expect(hostIdOf(a.service)).toBe(b.service.selfId);
      expect(hostIdOf(c.service)).toBe(b.service.selfId);
      expect(a.service.sharedDoc()?.epoch).toBe(1);
    },
  },
];

describe('InterviewSessionService takeover (plan test 5)', () => {
  it.each(TAKEOVER)('$name', async ({ run }) => {
    await run();
  });
});

interface ReclaimCase {
  readonly name: string;
  /** What each `host` call does, in order; the last entry repeats. */
  readonly outcomes: readonly ('ok' | 'taken' | 'other')[];
  readonly expectedStatus: 'waiting' | 'error';
  readonly expectedCalls: number;
}

const RECLAIM_CASES: readonly ReclaimCase[] = [
  { name: 'first try succeeds', outcomes: ['ok'], expectedStatus: 'waiting', expectedCalls: 1 },
  { name: 'unavailable-id twice, then succeeds', outcomes: ['taken', 'taken', 'ok'], expectedStatus: 'waiting', expectedCalls: 3 },
  { name: 'another error fails at once', outcomes: ['other'], expectedStatus: 'error', expectedCalls: 1 },
  {
    name: 'unavailable-id past the timeout errors',
    outcomes: ['taken'],
    expectedStatus: 'error',
    expectedCalls: RECLAIM_TIMEOUT_MS / RECONNECT_DELAY_MS,
  },
];

describe('InterviewSessionService host reclaim (plan test 9)', () => {
  it.each(RECLAIM_CASES)('$name', async ({ outcomes, expectedStatus, expectedCalls }) => {
    let calls = 0;
    const host = vi.fn(async (): Promise<Host> => {
      const outcome = outcomes[Math.min(calls++, outcomes.length - 1)];
      if (outcome === 'ok') {
        return { id: 'any', destroy: () => undefined, reconnect: () => undefined, isDisconnected: () => false };
      }
      throw outcome === 'taken' ? { type: 'unavailable-id' } : new Error('network down');
    });
    const service = createPeer({ host, connect: async () => Promise.reject({ type: 'peer-unavailable' }) }).service;
    void service.start(PROBLEM, STUB, PAGE_URL);
    // Fine steps first so key generation lands early; the loop then runs on the coarse clock.
    await settle();
    await settle(RECLAIM_TIMEOUT_MS + RECONNECT_DELAY_MS, COARSE_STEP_MS);

    expect([service.status(), host.mock.calls.length]).toEqual([expectedStatus, expectedCalls]);
  });
});

interface ResumeCase {
  readonly name: string;
  /** The problem saved with the doc, and the problem the page URL is on when resuming. */
  readonly savedProblem: number;
  readonly pageProblem: number;
}

const RESUME_CASES: readonly ResumeCase[] = [
  {
    name: 'a saved entry for another problem than the page: both links name the saved problem',
    savedProblem: OTHER_PROBLEM,
    pageProblem: PROBLEM,
  },
];

describe('InterviewSessionService resume (plan test 9)', () => {
  it.each(RESUME_CASES)('$name', async ({ savedProblem, pageProblem }) => {
    const originalUrl = window.location.href;
    const keys = await generateHostKeys();
    window.history.replaceState(null, '', `/practice/${pageProblem}?host=${keys.packed}`);
    onTestFinished(() => window.history.replaceState(null, '', originalUrl));
    const sessionId = await sessionIdFromPublicKey(keys.publicRaw);
    saveSession('interviewer', sessionId, savedProblem, 'saved', 0);
    const network = createNetwork();
    const stubFn = vi.fn(() => 'from-stub');
    const interviewer = createPeer(network.factory).service;
    await interviewer.resume(keys.packed, pageProblem, stubFn);

    const candidate = await joinCandidate(network.factory, linkParam(interviewer.inviteUrl(), 'join'), pageProblem);
    await settle();

    expect(candidate.service.sharedDoc()).toMatchObject({ problem: savedProblem, doc: 'saved' });
    const hostUrl = new URL(interviewer.hostUrl() ?? '');
    const inviteUrl = new URL(interviewer.inviteUrl() ?? '');
    expect([hostUrl.pathname, inviteUrl.pathname]).toEqual([`/practice/${savedProblem}`, `/practice/${savedProblem}`]);
    expect([hostUrl.searchParams.has('host'), hostUrl.searchParams.has('join')]).toEqual([true, false]);
    expect([inviteUrl.searchParams.has('host'), inviteUrl.searchParams.has('join')]).toEqual([false, true]);
    expect(stubFn).not.toHaveBeenCalled();
  });
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  useFakeClock();
});

afterEach(() => {
  services.splice(0).forEach((service) => service.end());
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
});
