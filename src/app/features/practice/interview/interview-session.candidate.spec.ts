import { MAX_PENDING_HANDSHAKES } from './candidate-side';
import { generateHostKeys, signCustom } from './host-key';
import { CUSTOM_PROBLEM, CustomDraft, CustomProblem, RECLAIM_TIMEOUT_MS, RECONNECT_DELAY_MS } from './interview-session.service';
import { PeerFactory } from './peer-transport';
import { sessionIdFromPublicKey } from './session-id';
import { saveSession } from './session-store';
import {
  COARSE_STEP_MS,
  PAGE_URL,
  PROBLEM,
  REACH_MS,
  SETTLE_STEP_MS,
  STUB,
  createNetwork,
  createPeer,
  endAllServices,
  hostIdOf,
  joinCandidate,
  linkParam,
  resumeInterviewer,
  settle,
  startHost,
  useFakeClock,
  type Network,
} from './testing/session-network';

/** A drop, the reconnect delay twice over (a lost race retries once), and a handshake. */
const TAKEOVER_MS = RECONNECT_DELAY_MS * 3 + REACH_MS;

interface Scenario {
  readonly name: string;
  readonly run: () => Promise<void>;
}

const messageTypes = (received: readonly unknown[]): string[] => received.map((message) => (message as { type: string }).type);

/** Moves the candidate tab away or back the way the browser does: the focus answer changes, then the event fires. */
function setTabAway(isAway: boolean): void {
  vi.spyOn(document, 'hasFocus').mockReturnValue(!isAway);
  window.dispatchEvent(new Event(isAway ? 'blur' : 'focus'));
}

const candidateOf = (service: { roster(): readonly { role: string }[] }) => service.roster().find((participant) => participant.role === 'candidate');

describe('InterviewSessionService candidate marks', () => {
  it('a takeover through a drop keeps the candidate counts (the roster is cleared at the drop, so the seed must not come from it)', async () => {
    const network = createNetwork();
    const hostTab = network.tab();
    const a = await startHost(hostTab.factory);
    const b = await resumeInterviewer(network.factory, a.hostValue);
    const c = await joinCandidate(network.factory, a.joinValue);
    await settle(REACH_MS);

    for (const isAway of [true, false, true]) {
      setTabAway(isAway);
      await settle();
    }
    expect(candidateOf(b.service)).toMatchObject({ isAway: true, awayCount: 2 });

    hostTab.kill();
    await settle(TAKEOVER_MS);

    expect(hostIdOf(c.service)).toBe(b.service.selfId);
    expect(candidateOf(c.service)).toMatchObject({ isAway: true, awayCount: 2, pasteCount: 0 });
  });
});

const CUSTOM: CustomDraft = { title: 'Own problem', statement: 'Print hello.' };

/** The draft as the interviewer key `keys` signs it for the session `keys` names. */
async function signedCustom(keys: Awaited<ReturnType<typeof generateHostKeys>>): Promise<CustomProblem> {
  const signature = await signCustom(keys.privateKey, await sessionIdFromPublicKey(keys.publicRaw), CUSTOM.title, CUSTOM.statement);
  return { ...CUSTOM, signature };
}

const CUSTOM_CASES: readonly Scenario[] = [
  {
    name: 'start with a custom problem: the candidate gets its title and statement',
    run: async () => {
      const network = createNetwork();
      const interviewer = createPeer(network.factory);
      await interviewer.service.start(CUSTOM_PROBLEM, STUB, PAGE_URL, CUSTOM);
      const candidate = await joinCandidate(network.factory, linkParam(interviewer.service.inviteUrl(), 'join'), CUSTOM_PROBLEM);
      await settle(REACH_MS);

      expect([interviewer.service.custom(), candidate.service.custom()]).toEqual([
        { ...CUSTOM, signature: expect.any(String) },
        { ...CUSTOM, signature: expect.any(String) },
      ]);
    },
  },
  {
    name: 'resume restores the custom problem from the saved entry',
    run: async () => {
      const network = createNetwork();
      const keys = await generateHostKeys();
      const custom = await signedCustom(keys);
      saveSession('interviewer', await sessionIdFromPublicKey(keys.publicRaw), CUSTOM_PROBLEM, 'saved', 0, custom);
      const interviewer = createPeer(network.factory).service;
      await interviewer.resume(keys.packed, CUSTOM_PROBLEM, () => STUB);

      expect(interviewer.custom()).toEqual(custom);
    },
  },
  {
    name: 'a host with no custom problem adopts the one a hello carries',
    run: async () => {
      const network = createNetwork();
      const keys = await generateHostKeys();
      const custom = await signedCustom(keys);
      saveSession('candidate', await sessionIdFromPublicKey(keys.publicRaw), CUSTOM_PROBLEM, STUB, 0, custom);
      const interviewer = createPeer(network.factory);
      await interviewer.service.resume(keys.packed, CUSTOM_PROBLEM, () => STUB);
      const candidate = await joinCandidate(network.factory, keys.publicRaw, CUSTOM_PROBLEM);
      await settle(REACH_MS);

      expect([interviewer.service.custom(), candidate.service.custom()]).toEqual([custom, custom]);
    },
  },
];

describe('InterviewSessionService custom problem', () => {
  it.each(CUSTOM_CASES)('$name', async ({ run }) => {
    await run();
  });
});

/** A candidate's factory whose first registration cannot be released: `destroy` leaves the id and its connections up. */
function stickyFactory(network: Network) {
  let report: (error: unknown) => void = () => undefined;
  let isFirst = true;
  const factory: PeerFactory = {
    connect: (id) => network.factory.connect(id),
    host: async (id, onConnection, onError, onDisconnected) => {
      const host = await network.factory.host(id, onConnection, onError, onDisconnected);
      if (!isFirst) {
        return host;
      }
      isFirst = false;
      report = onError;
      return { ...host, destroy: () => undefined };
    },
  };
  return { factory, reportIdTaken: () => report({ type: 'unavailable-id' }) };
}

interface GiveUpCase {
  readonly name: string;
  readonly isHostUp: boolean;
  readonly closesAfter: boolean;
  /** The candidate's status once the listener has given up, then (when `closesAfter`) once the connection closes. */
  readonly expected: readonly string[];
}

const GIVE_UP_CASES: readonly GiveUpCase[] = [
  { name: 'no verified connection goes to error', isHostUp: false, closesAfter: false, expected: ['error'] },
  { name: 'a verified connection keeps the status open', isHostUp: true, closesAfter: false, expected: ['open'] },
  { name: 'the verified connection closing afterwards goes to error', isHostUp: true, closesAfter: true, expected: ['open', 'error'] },
];

describe('InterviewSessionService candidate listener giving up', () => {
  it.each(GIVE_UP_CASES)('$name', async ({ isHostUp, closesAfter, expected }) => {
    const network = createNetwork();
    const keys = await generateHostKeys();
    const sticky = stickyFactory(network);
    if (!isHostUp) {
      network.hold(await sessionIdFromPublicKey(keys.publicRaw), () => undefined);
    }
    // Not awaited: with the id taken, join resolves only after the listener has given up.
    const candidate = createPeer(isHostUp ? sticky.factory : network.factory);
    void candidate.service.join(keys.publicRaw, PROBLEM);
    await settle();
    if (isHostUp) {
      await resumeInterviewer(network.factory, keys.packed);
      await settle(REACH_MS);
      sticky.reportIdTaken();
    }
    await settle(RECLAIM_TIMEOUT_MS + RECONNECT_DELAY_MS, COARSE_STEP_MS);
    const statuses = [candidate.service.status()];

    if (closesAfter) {
      network.dropAll();
      await settle(SETTLE_STEP_MS);
      statuses.push(candidate.service.status());
    }

    expect(statuses).toEqual(expected);
  });
});

/** A dialer that reaches `sessionId` and never answers the candidate's challenge. */
async function dialSilently(network: Network, sessionId: string) {
  const transport = await network.factory.connect(sessionId);
  const received: unknown[] = [];
  let isClosed = false;
  transport.onMessage((data) => received.push(data));
  transport.onClose(() => (isClosed = true));
  await settle();
  return { isAccepted: () => !isClosed && messageTypes(received).includes('challenge'), close: () => transport.close() };
}

type SilentDialer = Awaited<ReturnType<typeof dialSilently>>;

interface PendingCase {
  readonly name: string;
  readonly isHostUp: boolean;
  /** Whether each dialer the case probes was given a handshake. */
  readonly run: (dial: () => Promise<SilentDialer>) => Promise<boolean[]>;
  readonly expected: readonly boolean[];
}

const dialMany = async (dial: () => Promise<SilentDialer>, count: number): Promise<SilentDialer[]> => {
  const dialers: SilentDialer[] = [];
  for (let index = 0; index < count; index++) {
    dialers.push(await dial());
  }
  return dialers;
};

const PENDING_CASES: readonly PendingCase[] = [
  {
    name: `${MAX_PENDING_HANDSHAKES} silent dialers pending: the next is closed at once`,
    isHostUp: false,
    run: async (dial) => (await dialMany(dial, MAX_PENDING_HANDSHAKES + 1)).map((dialer) => dialer.isAccepted()),
    expected: [...Array<boolean>(MAX_PENDING_HANDSHAKES).fill(true), false],
  },
  {
    name: 'one pending dialer closing frees its slot for the next',
    isHostUp: false,
    run: async (dial) => {
      const [first, ...rest] = await dialMany(dial, MAX_PENDING_HANDSHAKES);
      first.close();
      await settle();
      return [...rest, await dial()].map((dialer) => dialer.isAccepted());
    },
    expected: Array<boolean>(MAX_PENDING_HANDSHAKES).fill(true),
  },
  {
    name: 'a verified host does not count against the cap',
    isHostUp: true,
    run: async (dial) => (await dialMany(dial, MAX_PENDING_HANDSHAKES)).map((dialer) => dialer.isAccepted()),
    expected: Array<boolean>(MAX_PENDING_HANDSHAKES).fill(true),
  },
];

describe('InterviewSessionService candidate pending handshakes', () => {
  it.each(PENDING_CASES)('$name', async ({ isHostUp, run, expected }) => {
    const network = createNetwork();
    const keys = await generateHostKeys();
    const sessionId = await sessionIdFromPublicKey(keys.publicRaw);
    await joinCandidate(network.factory, keys.publicRaw);
    if (isHostUp) {
      await resumeInterviewer(network.factory, keys.packed);
      await settle(REACH_MS);
    }

    expect(await run(() => dialSilently(network, sessionId))).toEqual(expected);
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
});
