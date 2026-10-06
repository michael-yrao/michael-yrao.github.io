import { generateHostKeys, parsePackedKey, signProblemAt } from './host-key';
import { CONNECT_TIMEOUT_MS, RECLAIM_TIMEOUT_MS, RECONNECT_DELAY_MS } from './interview-session.service';
import { Host, PeerFactory, Transport } from './peer-transport';
import { PREPARED_KEY_PREFIX, loadPrepared, mirrorPreparedProblem, savePrepared } from './prepared-store';
import { SessionHost } from './session-host';
import { NO_MARKS } from './session-message';
import { hostPeerIdFromPacked, sessionIdFromPublicKey } from './session-id';
import { saveSession } from './session-store';
import {
  COARSE_STEP_MS,
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
  prepareInterview,
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

const preparedKeys = (): string[] => Object.keys(localStorage).filter((key) => key.startsWith(PREPARED_KEY_PREFIX));
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
      await interviewer.service.resume((await prepareInterview()).hostValue);
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
    void prepareInterview().then((prepared) => service.resume(prepared.hostValue));
    // Fine steps first so key generation lands early; the loop then runs on the coarse clock.
    await settle();
    await settle(RECLAIM_TIMEOUT_MS + RECONNECT_DELAY_MS, COARSE_STEP_MS);

    expect([service.status(), host.mock.calls.length]).toEqual([expectedStatus, expectedCalls]);
  });
});

const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1_000;
const STORED_REV_ABOVE_PREPARED = 1_000;
const LOWER_STORED_REV = 1;
/** Above LOWER_STORED_REV, so a stored entry at that revision is the lower one. */
const RAISED_PREPARED_REV = 3;

describe('InterviewSessionService prepared interviews', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('resumes a prepared interview 8 days later, and a candidate who joins receives its problem', async () => {
    const network = createNetwork();
    const prepared = await prepareInterview();
    vi.setSystemTime(Date.now() + EIGHT_DAYS_MS);

    const interviewer = await resumeInterviewer(network.factory, prepared.hostValue);
    const candidate = await joinCandidate(network.factory, prepared.joinValue);
    await settle(REACH_MS);

    expect(interviewer.service.problem()).toEqual(PROBLEM);
    expect(candidate.service.problem()).toEqual(PROBLEM);
    expect(candidate.service.sharedDoc()?.doc).toBe(STUB);
  });

  it('a device seeded with the prepared entry resumes, and a candidate receives the problem and the starter', async () => {
    const network = createNetwork();
    const prepared = await prepareInterview();
    const entry = loadPrepared(prepared.sessionId);
    if (entry === null) {
      throw new Error('the prepared entry was not saved');
    }
    localStorage.clear();

    savePrepared(prepared.sessionId, entry);
    await resumeInterviewer(network.factory, prepared.hostValue);
    const candidate = await joinCandidate(network.factory, prepared.joinValue);
    await settle(REACH_MS);

    expect(candidate.service.problem()).toEqual(PROBLEM);
    expect(candidate.service.sharedDoc()?.doc).toBe(STUB);
  });

  it.each([
    { name: 'prepared alone', storedRev: (): number | null => null, expectedTitle: 'prepared' },
    { name: 'a lower session entry loses to the prepared problem', storedRev: (): number | null => LOWER_STORED_REV, expectedTitle: 'prepared' },
    { name: 'a higher session entry wins', storedRev: (preparedRev: number): number | null => preparedRev + STORED_REV_ABOVE_PREPARED, expectedTitle: 'stored' },
  ])('resume takes the highest revision: $name', async ({ storedRev, expectedTitle }) => {
    const network = createNetwork();
    const prepared = await prepareInterview({ ...PROBLEM, title: 'prepared' });
    const keys = await parsePackedKey(prepared.hostValue);
    const rev = storedRev(RAISED_PREPARED_REV);
    if (keys !== null) {
      mirrorPreparedProblem(
        prepared.sessionId,
        await signProblemAt(keys.privateKey, prepared.sessionId, RAISED_PREPARED_REV, { ...PROBLEM, title: 'prepared' }),
      );
    }
    if (keys !== null && rev !== null) {
      const signed = await signProblemAt(keys.privateKey, prepared.sessionId, rev, { ...PROBLEM, title: 'stored' });
      saveSession('interviewer', prepared.sessionId, 'stored-doc', 0, signed);
    }

    const interviewer = await resumeInterviewer(network.factory, prepared.hostValue);

    expect(interviewer.service.problem()?.title).toBe(expectedTitle);
  });

  it("an interviewer's edit is kept in the prepared store, and 8 days on a joining candidate receives it", async () => {
    const network = createNetwork();
    const prepared = await prepareInterview({ ...PROBLEM, title: 'v1' });
    const firstTab = network.tab();
    const first = await resumeInterviewer(firstTab.factory, prepared.hostValue);
    await first.service.editProblem({ ...PROBLEM, title: 'edited' });
    await settle();
    expect(JSON.parse(loadPrepared(prepared.sessionId)?.problem.json ?? '{}').title).toBe('edited');

    firstTab.kill();
    vi.setSystemTime(Date.now() + EIGHT_DAYS_MS);
    await resumeInterviewer(network.factory, prepared.hostValue);
    const candidate = await joinCandidate(network.factory, prepared.joinValue);
    await settle(TAKEOVER_MS);

    expect(candidate.service.problem()?.title).toBe('edited');
  });

  it('an edit made while the tab is still dialing (no host, no connection) is applied once it hosts', async () => {
    const network = createNetwork();
    const prepared = await prepareInterview({ ...PROBLEM, title: 'v1' });
    let openDial: () => void = () => undefined;
    const dialGate = new Promise<void>((resolve) => (openDial = resolve));
    const slowDial: PeerFactory = {
      ...network.factory,
      connect: async (peerId) => {
        await dialGate;
        return network.factory.connect(peerId);
      },
    };
    const peer = createPeer(slowDial);
    void peer.service.resume(prepared.hostValue);
    await settle();
    expect(peer.service.status()).toBe('connecting');

    await peer.service.editProblem({ ...PROBLEM, title: 'edited' });
    openDial();
    await settle(REACH_MS);

    expect(peer.service.status()).toBe('waiting');
    expect(peer.service.problem()?.title).toBe('edited');
    expect(JSON.parse(loadPrepared(prepared.sessionId)?.problem.json ?? '{}').title).toBe('edited');
  });

  it("a candidate's browser never gains a prepared entry", async () => {
    const network = createNetwork();
    const interviewer = await startHost(network.factory);
    const keysBefore = preparedKeys();
    const candidate = await joinCandidate(network.factory, interviewer.joinValue);
    await settle(REACH_MS);
    await interviewer.service.editProblem({ ...PROBLEM, title: 'edited' });
    await settle();

    expect(candidate.service.problem()?.title).toBe('edited');
    expect(preparedKeys()).toEqual(keysBefore);
  });

  it('resume with a fragment in the address gives links with no fragment', async () => {
    const network = createNetwork();
    const prepared = await prepareInterview();
    window.history.replaceState(null, '', `/interview?host=${prepared.hostValue}#stale-fragment`);

    const interviewer = await resumeInterviewer(network.factory, prepared.hostValue);

    expect(new URL(interviewer.service.inviteUrl() ?? '').hash).toBe('');
    expect(new URL(interviewer.service.hostUrl() ?? '').hash).toBe('');
  });
});

const ENDING_SCENARIOS: readonly Scenario[] = [
  {
    name: 'End after a candidate connected gives both sides the same summary, each with its own code and role',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, interviewer.joinValue);
      await settle(REACH_MS);
      mountEditor(interviewer.service).dispatch({ changes: { from: 0, insert: 'I:' } });
      mountEditor(candidate.service);
      await settle();

      interviewer.service.end();
      await settle();

      const interviewerEnded = interviewer.service.ended();
      const candidateEnded = candidate.service.ended();
      expect(interviewerEnded?.summary).toBeDefined();
      expect(candidateEnded?.summary).toEqual(interviewerEnded?.summary);
      expect([interviewerEnded?.role, candidateEnded?.role]).toEqual(['interviewer', 'candidate']);
      expect([interviewerEnded?.finalCode, candidateEnded?.finalCode]).toEqual(['I:stub', 'I:stub']);
      expect([interviewerEnded?.sessionId, interviewerEnded?.title]).toEqual([interviewer.sessionId, PROBLEM.title]);
    },
  },
  {
    name: 'End with no candidate gives no summary',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      await settle(REACH_MS);

      interviewer.service.end();
      await settle();

      expect([interviewer.service.role(), interviewer.service.ended()]).toEqual(['none', null]);
    },
  },
  {
    name: 'a malformed summary still ends the candidate session, with no ended',
    run: async () => {
      const network = createNetwork();
      const interviewer = await startHost(network.factory);
      const candidate = await joinCandidate(network.factory, interviewer.joinValue);
      await settle(REACH_MS);
      const sendEnd = SessionHost.prototype.end;
      vi.spyOn(SessionHost.prototype, 'end').mockImplementation(function (this: SessionHost) {
        sendEnd.call(this, { v: 2 } as never);
      });

      interviewer.service.end();
      await settle();

      expect([candidate.service.status(), candidate.service.ended()]).toEqual(['closed', null]);
    },
  },
];

describe('InterviewSessionService ending', () => {
  it.each(ENDING_SCENARIOS)('$name', async ({ run }) => {
    await run();
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
