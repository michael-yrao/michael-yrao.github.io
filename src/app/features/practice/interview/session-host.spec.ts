import type { Mock } from 'vitest';

import { HostKeys, createNonce, generateHostKeys, signChallenge, signCustom } from './host-key';
import { Host, Transport } from './peer-transport';
import { CONNECT_TIMEOUT_MS } from './session-client';
import { AuthorityInputs, HostConfig, HostEvents, SessionHost, chooseAuthorityDoc } from './session-host';
import { CUSTOM_PROBLEM, CandidateSeat, CustomProblem, HelloMessage, InitMessage, NO_MARKS, Participant, ParticipantRole, RevisedDoc } from './session-message';

const SESSION_ID = 'po-session';
const SELF_ID = 'host-tab';
const STUB_TEXT = 'stub';

interface FakeTransport extends Transport {
  readonly send: Mock<(message: unknown) => void>;
  readonly close: Mock<() => void>;
  deliver(data: unknown): void;
  /** The connection drops: runs the close handler the host registered. */
  drop(): void;
}

function createFakeTransport(): FakeTransport {
  let messageHandler: (data: unknown) => void = () => undefined;
  let closeHandler: () => void = () => undefined;
  return {
    send: vi.fn(),
    onMessage: (handler) => {
      messageHandler = handler;
    },
    onClose: (handler) => {
      closeHandler = handler;
    },
    close: vi.fn(),
    deliver: (data) => messageHandler(data),
    drop: () => closeHandler(),
  };
}

let keys: HostKeys;
let otherKeys: HostKeys;

const sentTypes = (transport: FakeTransport): string[] =>
  transport.send.mock.calls.map(([message]) => (message as { type: string }).type);

/** Every host a test made, shut down in cleanup so no dial timer outlives its test. */
const hosts: SessionHost[] = [];

function createHost(overrides: Partial<HostConfig> = {}) {
  const peer: Host = { id: SESSION_ID, destroy: vi.fn(), reconnect: vi.fn(), isDisconnected: () => false };
  const events: HostEvents = { onRoster: vi.fn(), onAuthority: vi.fn(), onEndRequested: vi.fn(), onCustomAdopted: vi.fn() };
  const config: HostConfig = {
    sessionId: SESSION_ID,
    keys,
    selfId: SELF_ID,
    savedDoc: null,
    savedRev: 0,
    takeoverDoc: null,
    takeoverRev: 0,
    getName: () => 'Host',
    getProblem: () => 1,
    stubFn: () => STUB_TEXT,
    candidateSeat: NO_MARKS,
    getCustom: () => null,
    dialCandidate: () => Promise.reject({ type: 'peer-unavailable' }),
    ...overrides,
  };
  const host = new SessionHost(config, events);
  host.attach(peer);
  hosts.push(host);
  return { host, peer, events };
}

type Signer = 'none' | 'host' | 'other';

/** Plays a client against the host: challenge, wait for the proof, then send a hello signed by `signer`. */
async function handshake(
  host: SessionHost,
  id: string,
  role: ParticipantRole,
  signer: Signer,
  content: RevisedDoc = { doc: 'print(1)', rev: 0 },
  custom?: CustomProblem,
): Promise<FakeTransport> {
  const transport = createFakeTransport();
  host.accept(transport);
  transport.deliver({ type: 'challenge', nonce: createNonce() });
  await vi.waitFor(() => expect(sentTypes(transport)).toContain('proof'));
  const hostNonce = (transport.send.mock.calls[0][0] as { nonce: string }).nonce;
  const signingKey = signer === 'host' ? keys.privateKey : otherKeys.privateKey;
  const signature = signer === 'none' ? undefined : await signChallenge(signingKey, 'hello', hostNonce, SESSION_ID);
  const hello: HelloMessage = { type: 'hello', id, role, name: id, ...content, ...(signature === undefined ? {} : { signature }), ...(custom === undefined ? {} : { custom }) };
  transport.deliver(hello);
  return transport;
}

const isDone = (transport: FakeTransport): boolean => transport.close.mock.calls.length > 0 || sentTypes(transport).includes('roster');

const HELLO_CASES: readonly {
  name: string;
  run: (host: SessionHost) => Promise<FakeTransport>;
  isAdmitted: boolean;
}[] = [
  {
    name: 'interviewer hello with a valid signature is admitted (gets init and roster)',
    run: (host) => handshake(host, 'i1', 'interviewer', 'host'),
    isAdmitted: true,
  },
  {
    name: 'interviewer hello without a signature is closed',
    run: (host) => handshake(host, 'i1', 'interviewer', 'none'),
    isAdmitted: false,
  },
  {
    name: 'interviewer hello with a signature from another key is closed',
    run: (host) => handshake(host, 'i1', 'interviewer', 'other'),
    isAdmitted: false,
  },
  {
    name: 'a second candidate is closed',
    run: async (host) => {
      await handshake(host, 'c1', 'candidate', 'none');
      return handshake(host, 'c2', 'candidate', 'none');
    },
    isAdmitted: false,
  },
];

/** Admits `id` as `role` and waits until the host has answered its hello. */
async function admit(host: SessionHost, id: string, role: ParticipantRole): Promise<FakeTransport> {
  const transport = await handshake(host, id, role, role === 'interviewer' ? 'host' : 'none');
  await vi.waitFor(() => expect(isDone(transport)).toBe(true));
  return transport;
}

const NUMBERED_PROBLEM = 1;
const CUSTOM_TITLE = 'Own problem';
const CUSTOM_STATEMENT = 'Print hello.';

/** A custom problem whose signature comes from `signer`'s key. */
async function customSignedBy(signer: HostKeys): Promise<CustomProblem> {
  const signature = await signCustom(signer.privateKey, SESSION_ID, CUSTOM_TITLE, CUSTOM_STATEMENT);
  return { title: CUSTOM_TITLE, statement: CUSTOM_STATEMENT, signature };
}

const CUSTOM_ADOPTION_CASES: readonly { name: string; problem: number; signer: () => HostKeys; isAdopted: boolean }[] = [
  { name: 'an invalid signature is not adopted and the init has no custom', problem: CUSTOM_PROBLEM, signer: () => otherKeys, isAdopted: false },
  { name: 'a validly signed custom is adopted and in the init', problem: CUSTOM_PROBLEM, signer: () => keys, isAdopted: true },
  { name: 'a validly signed custom in a numbered-problem session is not adopted', problem: NUMBERED_PROBLEM, signer: () => keys, isAdopted: false },
];

const AWAY = (isAway: boolean) => ({ type: 'away', isAway });
const PASTE = { type: 'paste' };

const SEAT_CASES: readonly {
  name: string;
  seed?: CandidateSeat;
  run: (host: SessionHost) => Promise<void>;
  expected: CandidateSeat;
}[] = [
  {
    name: 'away true, a repeat, false, true counts two absences',
    run: async (host) => {
      const candidate = await admit(host, 'c1', 'candidate');
      [AWAY(true), AWAY(true), AWAY(false), AWAY(true)].forEach((message) => candidate.deliver(message));
    },
    expected: { isAway: true, awayCount: 2, pasteCount: 0 },
  },
  {
    name: 'each paste counts',
    run: async (host) => {
      const candidate = await admit(host, 'c1', 'candidate');
      [PASTE, PASTE].forEach((message) => candidate.deliver(message));
    },
    expected: { isAway: false, awayCount: 0, pasteCount: 2 },
  },
  {
    name: 'the counts survive the candidate reconnecting',
    run: async (host) => {
      const first = await admit(host, 'c1', 'candidate');
      [AWAY(true), PASTE].forEach((message) => first.deliver(message));
      first.drop();
      await admit(host, 'c2', 'candidate');
    },
    expected: { isAway: true, awayCount: 1, pasteCount: 1 },
  },
  {
    name: 'a mark from an interviewer connection is ignored',
    run: async (host) => {
      await admit(host, 'c1', 'candidate');
      const interviewer = await admit(host, 'i1', 'interviewer');
      [AWAY(true), PASTE].forEach((message) => interviewer.deliver(message));
    },
    expected: NO_MARKS,
  },
  {
    name: 'a seed from the config shows in the roster',
    seed: { isAway: true, awayCount: 3, pasteCount: 2 },
    run: async (host) => {
      await admit(host, 'c1', 'candidate');
    },
    expected: { isAway: true, awayCount: 3, pasteCount: 2 },
  },
];

const BASE_INPUTS: AuthorityInputs = { saved: null, takeover: null, hellos: [], hasPendingHandshake: false };
const revised = (doc: string, rev: number): RevisedDoc => ({ doc, rev });

const AUTHORITY_CASES: readonly { name: string; inputs: AuthorityInputs; expected: RevisedDoc | null; isStubUsed: boolean }[] = [
  { name: 'hello rev above saved rev: the hello wins', inputs: { ...BASE_INPUTS, saved: revised('saved', 1), hellos: [revised('hello', 2)] }, expected: revised('hello', 2), isStubUsed: false },
  { name: 'saved rev above hello rev: the saved doc wins', inputs: { ...BASE_INPUTS, saved: revised('saved', 3), hellos: [revised('hello', 2)] }, expected: revised('saved', 3), isStubUsed: false },
  { name: 'equal revs: saved doc first', inputs: { ...BASE_INPUTS, saved: revised('saved', 2), takeover: revised('takeover', 2), hellos: [revised('hello', 2)] }, expected: revised('saved', 2), isStubUsed: false },
  { name: 'equal revs: takeover doc when no saved doc', inputs: { ...BASE_INPUTS, takeover: revised('takeover', 2), hellos: [revised('hello', 2)] }, expected: revised('takeover', 2), isStubUsed: false },
  { name: 'equal revs: first non-null hello', inputs: { ...BASE_INPUTS, hellos: [null, revised('first', 2), revised('second', 2)], hasPendingHandshake: true }, expected: revised('first', 2), isStubUsed: false },
  { name: 'every hello null: the stub at rev 0', inputs: { ...BASE_INPUTS, hellos: [null, null] }, expected: revised(STUB_TEXT, 0), isStubUsed: true },
  { name: 'every hello null but a handshake pending: wait', inputs: { ...BASE_INPUTS, hellos: [null], hasPendingHandshake: true }, expected: null, isStubUsed: false },
  { name: 'no hellos: wait', inputs: BASE_INPUTS, expected: null, isStubUsed: false },
];

const initsOf = (transport: FakeTransport): InitMessage[] =>
  transport.send.mock.calls.map(([message]) => message as { type: string }).filter((message): message is InitMessage => message.type === 'init');

describe('SessionHost', () => {
  beforeAll(async () => {
    keys = await generateHostKeys();
    otherKeys = await generateHostKeys();
  });
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => {
    hosts.splice(0).forEach((host) => host.shutdown());
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it.each(HELLO_CASES)('the host admits or closes on hello: $name', async ({ run, isAdmitted }) => {
    const { host } = createHost();
    const transport = await run(host);
    await vi.waitFor(() => expect(isDone(transport)).toBe(true));

    expect(transport.close.mock.calls.length > 0).toBe(!isAdmitted);
    expect(sentTypes(transport).includes('init')).toBe(isAdmitted);
    expect(sentTypes(transport).includes('roster')).toBe(isAdmitted);
    host.shutdown();
  });

  it.each(SEAT_CASES)('the candidate seat: $name', async ({ seed, run, expected }) => {
    const { host, events } = createHost(seed === undefined ? {} : { candidateSeat: seed });
    await run(host);

    const roster = (events.onRoster as Mock<(participants: readonly Participant[]) => void>).mock.lastCall?.[0] ?? [];
    expect(roster.find((participant) => participant.role === 'candidate')).toMatchObject(expected);
    roster
      .filter((participant) => participant.role !== 'candidate')
      .forEach((participant) => expect(participant).toMatchObject(NO_MARKS));
    host.shutdown();
  });

  it.each(AUTHORITY_CASES)('chooseAuthorityDoc: $name', ({ inputs, expected, isStubUsed }) => {
    const stubFn = vi.fn(() => STUB_TEXT);

    expect(chooseAuthorityDoc(inputs, stubFn)).toEqual(expected);
    expect(stubFn).toHaveBeenCalledTimes(isStubUsed ? 1 : 0);
  });

  it.each(CUSTOM_ADOPTION_CASES)(
    'unfixed: markReady adopted any hello custom: $name',
    async ({ problem, signer, isAdopted }) => {
      let adopted: CustomProblem | null = null;
      const { host, events } = createHost({ getProblem: () => problem, getCustom: () => adopted });
      vi.mocked(events.onCustomAdopted).mockImplementation((custom) => {
        adopted = custom;
      });
      const custom = await customSignedBy(signer());
      const candidate = await handshake(host, 'c1', 'candidate', 'none', undefined, custom);
      await vi.waitFor(() => expect(isDone(candidate)).toBe(true));

      expect(events.onCustomAdopted).toHaveBeenCalledTimes(isAdopted ? 1 : 0);
      expect(initsOf(candidate)).toHaveLength(1);
      expect(initsOf(candidate)[0].custom).toEqual(isAdopted ? custom : undefined);
      expect(candidate.close).not.toHaveBeenCalled();
      host.shutdown();
    },
  );

  it('a hello newer than the authority re-adopts and re-inits every ready participant (unfixed: markReady took the else branch and sent only the stale init)', async () => {
    const { host } = createHost({ savedDoc: 'saved', savedRev: 5 });
    const older = await handshake(host, 'i1', 'interviewer', 'host', revised('older', 5));
    await vi.waitFor(() => expect(isDone(older)).toBe(true));

    expect(initsOf(older)).toMatchObject([{ doc: 'saved', rev: 5 }]);

    const newer = await handshake(host, 'c1', 'candidate', 'none', revised('newer', 9));
    await vi.waitFor(() => expect(isDone(newer)).toBe(true));

    expect(initsOf(newer)).toMatchObject([{ doc: 'newer', rev: 9 }]);
    expect(initsOf(older)).toMatchObject([{ doc: 'saved', rev: 5 }, { doc: 'newer', rev: 9 }]);
    host.shutdown();
  });

  it('closes a connection stuck before ready once HANDSHAKE_TIMEOUT_MS has passed', () => {
    vi.useFakeTimers();
    const { host } = createHost();
    const transport = createFakeTransport();
    host.accept(transport);

    vi.advanceTimersByTime(CONNECT_TIMEOUT_MS - 1);
    expect(transport.close).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(transport.close).toHaveBeenCalledTimes(1);
    host.shutdown();
  });
});
