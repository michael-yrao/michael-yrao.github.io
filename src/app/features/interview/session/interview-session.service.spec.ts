import { generateHostKeys, parsePackedKey } from './host-key';
import { CONNECT_TIMEOUT_MS, RECLAIM_TIMEOUT_MS, RECONNECT_DELAY_MS } from './interview-session.service';
import { Host, PeerFactory, Transport } from './peer-transport';
import { SessionHost } from './session-host';
import { NO_MARKS } from './session-message';
import { hostPeerIdFromPacked, sessionIdFromPublicKey } from './session-id';
import { saveSession } from './session-store';
import {
  COARSE_STEP_MS,
  PAGE_URL,
  PROBLEM,
  REACH_MS,
  SETTLE_MS,
  SETTLE_STEP_MS,
  STUB,
  createNetwork,
  createPeer,
  dialAsImpostor,
  endAllServices,
  holdAsImpostor,
  hostIdOf,
  joinCandidate,
  linkParam,
  mountEditor,
  resumeInterviewer,
  settle,
  settleJustAfterDial,
  startHost,
  useFakeClock,
} from './testing/session-network';

/** A drop, the reconnect delay twice over (a lost race retries once), and a handshake. */
const TAKEOVER_MS = RECONNECT_DELAY_MS * 3 + REACH_MS;
const HOST_STRIP_ARGS = [[], { queryParams: { host: null }, queryParamsHandling: 'merge', replaceUrl: true }];
const SECOND_HOST_DOC = 'second-host-doc';
/** Above any revision the first host has reached, so the second host's saved doc wins the choice of authority. */
const SECOND_HOST_REV = 5;
const HOST_PEER_ID_PREFIX = 'po-h-';

interface Scenario {
  readonly name: string;
  readonly run: () => Promise<void>;
}

const messageTypes = (received: readonly unknown[]): string[] => received.map((message) => (message as { type: string }).type);

const SCENARIOS: readonly Scenario[] = [
  {
    // plan test 9
    name: 'converges after an update made in the mount gap and concurrent edits',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, interviewer.joinValue);
      await settle(REACH_MS);

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
    name: 'a candidate who replaces a gone one is sent the current text, not the stub',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      const first = await joinCandidate(network.factory, interviewer.joinValue);
      await settle(REACH_MS);
      mountEditor(interviewer.service).dispatch({ changes: { from: 0, insert: 'edit-' } });
      await settle();

      first.service.end();
      await settle();
      expect(interviewer.service.status()).toBe('waiting');

      const second = await joinCandidate(network.factory, interviewer.joinValue);
      await settle(REACH_MS);
      expect(second.service.sharedDoc()).toEqual({ version: 1, doc: 'edit-stub', epoch: 0 });
      expect(interviewer.service.status()).toBe('open');
    },
  },
  {
    // plan test 9
    name: 'each side sees the other side name, and a later change',
    run: async () => {
      const network = createNetwork();
      const interviewer = createPeer(network.factory);
      const candidate = createPeer(network.factory);
      await interviewer.service.start(PROBLEM, PAGE_URL);
      interviewer.service.setMyName('  Ada  ');
      const joinValue = linkParam(interviewer.service.inviteUrl(), 'join');
      await candidate.service.join(joinValue);
      await settle(REACH_MS);

      const expected = [
        { id: interviewer.service.selfId, role: 'interviewer', name: 'Ada', ...NO_MARKS },
        { id: candidate.service.selfId, role: 'candidate', name: '', ...NO_MARKS },
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
    name: 'a candidate dial that never settles is the only outstanding dial, and a late transport is closed',
    run: async () => {
      const keys = await generateHostKeys();
      const lateTransport = { send: vi.fn(), onMessage: vi.fn(), onClose: vi.fn(), close: vi.fn() };
      const unsettledDials: ((transport: Transport) => void)[] = [];
      let dialedAt = 0;
      const factory: PeerFactory = {
        host: async (id) => ({ id, destroy: () => undefined, reconnect: () => undefined, isDisconnected: () => false }),
        connect: (id) =>
          id.startsWith(HOST_PEER_ID_PREFIX)
            ? Promise.reject({ type: 'peer-unavailable' })
            : new Promise<Transport>((resolve) => {
                dialedAt = Date.now();
                unsettledDials.push(resolve);
              }),
      };
      void createPeer(factory).service.resume(keys.packed);
      await settle();
      expect(unsettledDials.length).toBe(1);

      // Several dial ticks pass inside the connect timeout, and none starts a second dial.
      await settle(dialedAt + CONNECT_TIMEOUT_MS - 1 - Date.now());
      expect(unsettledDials.length).toBe(1);

      await settle(1);
      unsettledDials[0](lateTransport);
      await settle(0);
      expect(lateTransport.close).toHaveBeenCalledTimes(1);
      expect(lateTransport.onMessage).not.toHaveBeenCalled();
    },
  },
  {
    // plan test 2
    name: 'the candidate listens, a host dials, the handshake completes and init arrives',
    run: async () => {
      const network = createNetwork();
      const keys = await generateHostKeys();
      const candidate = await joinCandidate(network.factory, keys.publicRaw);
      await settle();
      expect(candidate.service.status()).toBe('connecting');

      await resumeInterviewer(network.factory, keys.packed);
      await settle(REACH_MS);

      expect(candidate.service.status()).toBe('open');
      expect(candidate.service.sharedDoc()).toMatchObject({ doc: '' });
    },
  },
  {
    // plan test 9
    name: 'ending as the interviewer returns the service to its starting state, and no dial survives it',
    run: async () => {
      const network = createNetwork();
      const connect = vi.spyOn(network.factory, 'connect');
      const interviewer = await startHost(network.factory);
      await settle();

      interviewer.service.end();
      expect([
        interviewer.service.role(),
        interviewer.service.status(),
        interviewer.service.sharedDoc(),
        interviewer.service.inviteUrl(),
      ]).toEqual(['none', 'idle', null, null]);
      expect(interviewer.navigate).toHaveBeenCalledWith(...HOST_STRIP_ARGS);

      const dialsAtEnd = connect.mock.calls.length;
      await settle(RECONNECT_DELAY_MS * 2);
      expect(connect.mock.calls.length).toBe(dialsAtEnd);
    },
  },
  {
    // plan test 9
    name: 'a dropped candidate reconnects read-only, then a second init bumps the epoch and resets the log',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, interviewer.joinValue);
      await settle(REACH_MS);
      const interviewerView = mountEditor(interviewer.service);
      interviewerView.dispatch({ changes: { from: 0, insert: 'edit-' } });
      await settle();
      mountEditor(candidate.service);
      await settle();

      // Just after a dial tick, so the next dial is a full delay away.
      await settleJustAfterDial(interviewer.hostedAt);
      network.dropAll();
      await settle();
      expect([candidate.service.status(), candidate.service.isEditable()]).toEqual(['reconnecting', false]);

      await settle(RECONNECT_DELAY_MS);
      expect([candidate.service.status(), candidate.service.isEditable()]).toEqual(['open', true]);
      expect(candidate.service.sharedDoc()).toEqual({ version: 1, doc: 'edit-stub', epoch: 1 });

      const secondView = mountEditor(candidate.service);
      interviewerView.dispatch({ changes: { from: 0, insert: 'I:' } });
      await settle();
      expect(secondView.state.doc.toString()).toBe('I:edit-stub');
    },
  },
  {
    // plan test 9
    name: 'ending a candidate releases its registration, and no host dial reaches it afterwards',
    run: async () => {
      const network = createNetwork();
      const host = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, host.joinValue);
      await settle(REACH_MS);
      expect(network.holder(host.sessionId)).toBeDefined();

      candidate.service.end();
      expect(network.holder(host.sessionId)).toBeUndefined();
      await settle(RECONNECT_DELAY_MS * 2);

      expect([candidate.service.status(), network.holder(host.sessionId), host.service.status()]).toEqual([
        'closed',
        undefined,
        'waiting',
      ]);
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
      await settle(REACH_MS);
      expect(candidate.service.status()).toBe('open');

      client.service.end();
      await settle();

      expect([host.service.role(), client.service.role(), candidate.service.status()]).toEqual(['none', 'none', 'closed']);
      expect(host.navigate).toHaveBeenCalledWith(...HOST_STRIP_ARGS);
      expect(client.navigate).toHaveBeenCalledWith(...HOST_STRIP_ARGS);
    },
  },
  {
    // plan test 5
    name: 'a second verified host replaces the first: the candidate takes its init and never shows reconnecting',
    run: async () => {
      const network = createNetwork();
      const first = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, first.joinValue);
      await settle(REACH_MS);
      await settleJustAfterDial(first.hostedAt);

      // The fake broker grants one holder per id, so the second host is driven directly with the same keys.
      const keys = await parsePackedKey(first.hostValue);
      if (keys === null) {
        throw new Error('the host link did not parse');
      }
      const second = new SessionHost(
        {
          sessionId: first.sessionId,
          keys,
          selfId: 'second-host',
          savedDoc: SECOND_HOST_DOC,
          savedRev: SECOND_HOST_REV,
          takeoverDoc: null,
          takeoverRev: 0,
          getName: () => '',
          stubFn: () => STUB,
          candidateSeat: NO_MARKS,
          problem: null,
          dialCandidate: () => Promise.reject({ type: 'peer-unavailable' }),
        },
        { onRoster: () => undefined, onAuthority: () => undefined, onEndRequested: () => undefined, onProblem: () => undefined },
      );
      second.attach({ id: 'second', destroy: () => undefined, reconnect: () => undefined, isDisconnected: () => false });
      onTestFinished(() => second.shutdown());
      second.accept(await network.factory.connect(first.sessionId), true);

      const statuses = new Set<string>();
      for (let elapsed = 0; elapsed < SETTLE_MS; elapsed += SETTLE_STEP_MS) {
        await settle(SETTLE_STEP_MS);
        statuses.add(candidate.service.status());
      }

      expect([...statuses]).toEqual(['open']);
      expect(candidate.service.sharedDoc()).toEqual({ version: 0, doc: SECOND_HOST_DOC, epoch: 1 });
      expect(first.service.roster().some((participant) => participant.role === 'candidate')).toBe(false);
    },
  },
];

describe('InterviewSessionService peer contract', () => {
  it.each(SCENARIOS)('$name', async ({ run }) => {
    await run();
  });
});

describe('InterviewSessionService handshake (plan tests 3 and 4)', () => {
  it('an impostor holding the host peer id: an interviewer closes, sends no hello, and re-dials', async () => {
    const network = createNetwork();
    const keys = await generateHostKeys();
    const sessionId = await sessionIdFromPublicKey(keys.publicRaw);
    const hostPeerId = await hostPeerIdFromPacked(keys.packed);
    const impostor = holdAsImpostor(network, hostPeerId, sessionId, await generateHostKeys());
    const connect = vi.spyOn(network.factory, 'connect');

    await resumeInterviewer(network.factory, keys.packed);
    await settle();
    const dialsBeforeRedial = connect.mock.calls.length;
    expect(messageTypes(impostor.received)).toEqual(['challenge']);

    await settle(RECONNECT_DELAY_MS);
    expect(connect.mock.calls.length).toBe(dialsBeforeRedial + 1);
    expect(impostor.received.some((message) => (message as { type: string }).type === 'hello')).toBe(false);
  });

  it('a dialer without the key reaches the candidate: closed, no hello, the candidate keeps listening for a real host', async () => {
    const network = createNetwork();
    const keys = await generateHostKeys();
    const sessionId = await sessionIdFromPublicKey(keys.publicRaw);
    const candidate = await joinCandidate(network.factory, keys.publicRaw);

    const impostor = await dialAsImpostor(network, sessionId, await generateHostKeys());
    await settle();

    expect(messageTypes(impostor.received)).toEqual(['challenge']);
    expect(impostor.isClosed()).toBe(true);
    expect([candidate.service.status(), network.holder(sessionId) !== undefined]).toEqual(['connecting', true]);

    await resumeInterviewer(network.factory, keys.packed);
    await settle(REACH_MS);
    expect(candidate.service.status()).toBe('open');
  });

  it('a stranger holding the session id registration does not stop an interviewer from hosting', async () => {
    const network = createNetwork();
    const keys = await generateHostKeys();
    network.hold(await sessionIdFromPublicKey(keys.publicRaw), () => undefined);
    const interviewer = createPeer(network.factory).service;

    void interviewer.resume(keys.packed);
    await settle();
    await settle(RECLAIM_TIMEOUT_MS + RECONNECT_DELAY_MS, COARSE_STEP_MS);

    expect(interviewer.status()).toBe('waiting');
  });
});

const TAKEOVER: readonly Scenario[] = [
  {
    // plan test 5
    name: 'the host drops: one interviewer client hosts with its synced doc; the other clients reconnect and get init',
    run: async () => {
      const network = createNetwork();
      const hostTab = network.tab();
      const a = await startHost(hostTab.factory);
      const b = await resumeInterviewer(network.factory, a.hostValue);
      const d = await resumeInterviewer(network.factory, a.hostValue);
      const c = await joinCandidate(network.factory, a.joinValue);
      await settle(REACH_MS);
      mountEditor(a.service).dispatch({ changes: { from: 0, insert: 'edit-' } });
      await settle();
      const clients = [b.service, d.service, c.service];
      const epochsBefore = clients.map((client) => client.sharedDoc()?.epoch);

      // So the new host starts from its synced doc, not a saved one.
      localStorage.clear();
      hostTab.kill();
      await settle(TAKEOVER_MS);

      // The new host's registration and the candidate's.
      expect(network.holders()).toBe(2);
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
      const firstTab = network.tab();
      const secondTab = network.tab();
      const a = await startHost(firstTab.factory);
      const candidate = await joinCandidate(network.factory, a.joinValue);
      await settle(REACH_MS);

      // A drops; B takes over from the saved doc, and the candidate keeps coding on B's connection.
      firstTab.kill();
      await resumeInterviewer(secondTab.factory, a.hostValue);
      await settle(TAKEOVER_MS);
      mountEditor(candidate.service).dispatch({ changes: { from: 0, insert: 'newer-' } });
      await settle();

      // B leaves; A comes back with its own stale saved doc (this browser's storage held B's, so A's is put back).
      saveSession('interviewer', a.sessionId, STUB, 0);
      secondTab.kill();
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
      void b.resume(keys.packed);
      void d.resume(keys.packed);
      await settle(TAKEOVER_MS);

      expect(network.holders()).toBe(1);
      const hostId = hostIdOf(b);
      expect([b.selfId, d.selfId]).toContain(hostId);
      expect(hostIdOf(d)).toBe(hostId);
      expect(b.roster().map((participant) => participant.id).sort()).toEqual([b.selfId, d.selfId].sort());
      expect([b.sharedDoc()?.doc, d.sharedDoc()?.doc]).toEqual(['', '']);
    },
  },
  {
    // plan test 5
    name: 'a host that loses its broker registration demotes itself',
    run: async () => {
      const network = createNetwork();
      const a = await startHost(network.factory);
      const c = await joinCandidate(network.factory, a.joinValue);
      await settle(REACH_MS);
      const formerHost = network.holder(a.hostPeerId);
      expect(a.service.sharedDoc()?.epoch).toBe(0);

      formerHost?.dropRegistration();
      const b = await resumeInterviewer(network.factory, a.hostValue);
      await settle(TAKEOVER_MS);

      const holder = network.holder(a.hostPeerId);
      // The new host's registration and the candidate's.
      expect(network.holders()).toBe(2);
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
    void service.start(PROBLEM, PAGE_URL);
    // Fine steps first so key generation lands early; the loop then runs on the coarse clock.
    await settle();
    await settle(RECLAIM_TIMEOUT_MS + RECONNECT_DELAY_MS, COARSE_STEP_MS);

    expect([service.status(), host.mock.calls.length]).toEqual([expectedStatus, expectedCalls]);
  });
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // A test page is not guaranteed focus, and a candidate without it counts as away.
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
  useFakeClock();
});

afterEach(() => {
  endAllServices();
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.innerHTML = '';
});
