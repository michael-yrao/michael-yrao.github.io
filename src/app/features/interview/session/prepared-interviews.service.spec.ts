import { Injector } from '@angular/core';

import { InterviewerFetch, InterviewDirectoryService, PushOutcome, RemoveOutcome } from '../directory/interview-directory.service';
import { parsePackedKey, signProblemAt } from './crypto/host-key';
import { InterviewProblem, SignedProblem } from './interview-problem';
import { InterviewSchedule } from './interview-schedule';
import { LIVE_PUSH_MIN_MS, PreparedInterviewsService } from './prepared-interviews.service';
import { PreparedEntry, listPrepared, loadPrepared, mirrorPreparedProblem } from './store/prepared-store';

const BASE_URL = 'https://site.test/interview';
const NO_SUCH_SESSION = 'po-no-such-session';
const OFFLINE_FIRST = 'offline' as const;
const SCHEDULE: InterviewSchedule = {
  problemId: 'problem-1',
  scheduledAt: 1_800_000_000_000,
  durationMin: 45,
  candidateName: 'Ada',
  candidateEmail: '',
  interviewerName: 'Grace',
  notes: 'Graphs.',
};
const problemTitled = (title: string): InterviewProblem => ({
  title,
  statement: 'Find a pair.',
  starter: 'def f(): pass',
  entry: null,
  compare: 'exact',
  cases: [],
  result: null,
  types: null,
  figure: null,
  source: null,
});

interface PushResult {
  readonly outcome: PushOutcome;
  readonly serverRev?: number;
}

function fakeDirectory() {
  return {
    isEnabled: true,
    push: vi.fn<(entry: PreparedEntry) => Promise<PushResult>>(() => Promise.resolve({ outcome: 'published' })),
    fetchInterviewer: vi.fn<(code: string) => Promise<InterviewerFetch>>(() => Promise.resolve({ status: 'not-found' })),
    lookupCandidate: vi.fn(),
    remove: vi.fn<(code: string) => Promise<RemoveOutcome>>(() => Promise.resolve('removed')),
  };
}
type FakeDirectory = ReturnType<typeof fakeDirectory>;

function serviceOver(directory: FakeDirectory): PreparedInterviewsService {
  return Injector.create({
    providers: [
      { provide: InterviewDirectoryService, useValue: directory },
      { provide: PreparedInterviewsService, useClass: PreparedInterviewsService },
    ],
  }).get(PreparedInterviewsService);
}

/** Resolves once every write queued so far has finished; changes nothing. */
const settled = (service: PreparedInterviewsService): Promise<unknown> => service.pullIfNewer(NO_SUCH_SESSION);

function entryOf(sessionId: string): PreparedEntry {
  const entry = loadPrepared(sessionId);
  if (entry === null) {
    throw new Error('no entry');
  }
  return entry;
}

const titleOf = (sessionId: string): string => JSON.parse(entryOf(sessionId).problem.json).title;

/** Revision `rev` of the entry's problem, titled `title`, signed with the entry's own key. */
async function signedAt(sessionId: string, rev: number, title: string): Promise<SignedProblem> {
  const keys = await parsePackedKey(entryOf(sessionId).packed);
  if (keys === null) {
    throw new Error('bad key');
  }
  return signProblemAt(keys.privateKey, sessionId, rev, problemTitled(title));
}

/** What the server would answer with: revision `rev` of the entry's problem, titled `title`, signed with its own key. */
async function serverCopy(sessionId: string, rev: number, title: string): Promise<InterviewerFetch> {
  const entry = entryOf(sessionId);
  const problem = await signedAt(sessionId, rev, title);
  return { status: 'found', rev, entry: { v: 1, packed: entry.packed, problem, createdAt: entry.createdAt, candidateCode: entry.candidateCode } };
}

/** The next revision of the entry's problem, titled `title`, signed but not stored. */
const signNext = (sessionId: string, title: string): Promise<SignedProblem> => signedAt(sessionId, entryOf(sessionId).problem.rev + 1, title);

/** Stores the next revision of the entry's problem, titled `title`, in the store alone: no push is scheduled. */
async function signLocally(sessionId: string, title: string): Promise<void> {
  mirrorPreparedProblem(sessionId, await signNext(sessionId, title));
}

/** The server holding exactly the local problem. */
async function sameAsLocal(sessionId: string): Promise<InterviewerFetch> {
  const copy = await serverCopy(sessionId, entryOf(sessionId).problem.rev, 'v1');
  return copy.status === 'found' ? { ...copy, entry: { ...copy.entry, problem: entryOf(sessionId).problem } } : copy;
}

/** A prepared interview whose first push got `firstPush`, settled; later pushes publish. */
async function prepared(firstPush: PushResult = { outcome: 'published' }) {
  const directory = fakeDirectory();
  directory.push.mockResolvedValueOnce(firstPush);
  const service = serviceOver(directory);
  const sessionId = await service.prepare(problemTitled('v1'));
  if (sessionId === null) {
    throw new Error('prepare failed');
  }
  await settled(service);
  directory.push.mockClear();
  return { service, directory, sessionId };
}

describe('prepared interviews', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each<{
    name: string;
    localEdits: number;
    pushedFirst: boolean;
    server: (sessionId: string) => Promise<InterviewerFetch>;
    expected: { result: string; rev: number | null; title: string; pushedRev: number | null; pushes: number };
  }>([
    {
      name: 'a higher server revision replaces the local problem',
      localEdits: 0,
      pushedFirst: true,
      server: (id) => serverCopy(id, 2, 'remote'),
      expected: { result: 'updated', rev: 2, title: 'remote', pushedRev: 2, pushes: 0 },
    },
    {
      name: 'an equal revision with the same signature is recorded as pushed',
      localEdits: 0,
      pushedFirst: false,
      server: sameAsLocal,
      expected: { result: 'kept', rev: 1, title: 'v1', pushedRev: 1, pushes: 0 },
    },
    {
      name: 'an equal revision with another signature forks above the server and pushes',
      localEdits: 0,
      pushedFirst: true,
      server: (id) => serverCopy(id, 1, 'elsewhere'),
      expected: { result: 'forked', rev: 2, title: 'v1', pushedRev: 2, pushes: 1 },
    },
    {
      name: 'a lower server revision is pushed over',
      localEdits: 1,
      pushedFirst: true,
      server: (id) => serverCopy(id, 1, 'v1'),
      expected: { result: 'kept', rev: 2, title: 'v2', pushedRev: 2, pushes: 1 },
    },
    {
      name: 'a server copy that does not verify changes nothing',
      localEdits: 0,
      pushedFirst: true,
      server: () => Promise.resolve({ status: 'unreadable' }),
      expected: { result: 'kept', rev: 1, title: 'v1', pushedRev: 1, pushes: 0 },
    },
    {
      name: 'a server copy that expired is published again',
      localEdits: 0,
      pushedFirst: true,
      server: () => Promise.resolve({ status: 'not-found' }),
      expected: { result: 'not-found', rev: 1, title: 'v1', pushedRev: 1, pushes: 1 },
    },
    {
      name: 'a deleted server copy removes the local entry',
      localEdits: 0,
      pushedFirst: true,
      server: () => Promise.resolve({ status: 'deleted' }),
      expected: { result: 'deleted', rev: null, title: '', pushedRev: null, pushes: 0 },
    },
  ])('pullIfNewer: $name', async ({ localEdits, pushedFirst, server, expected }) => {
    const { service, directory, sessionId } = await prepared(pushedFirst ? { outcome: 'published' } : { outcome: OFFLINE_FIRST });
    if (localEdits > 0) {
      await signLocally(sessionId, 'v2');
    }
    directory.fetchInterviewer.mockResolvedValue(await server(sessionId));

    const result = await service.pullIfNewer(sessionId);
    await settled(service);

    const entry = loadPrepared(sessionId);
    expect({
      result,
      rev: entry?.problem.rev ?? null,
      title: entry === null ? '' : titleOf(sessionId),
      pushedRev: entry?.pushedRev ?? null,
      pushes: directory.push.mock.calls.length,
    }).toEqual(expected);
    expect(service.list().some((item) => item.sessionId === sessionId)).toBe(expected.rev !== null);
  });

  it('an offline push leaves the entry pending with no codes shown, and the next load publishes it', async () => {
    const { service, directory, sessionId } = await prepared({ outcome: 'offline' });

    expect(entryOf(sessionId).pushedRev).toBe(0);
    expect(service.list()[0].publish).toBe('pending');
    expect(service.codesOf(sessionId, BASE_URL)).toBeNull();

    await service.retryUnpublished();

    expect(directory.push).toHaveBeenCalledOnce();
    expect(entryOf(sessionId).pushedRev).toBe(1);
    expect(service.list()[0].publish).toBe('published');
    expect(service.codesOf(sessionId, BASE_URL)?.candidateUrl).toContain('code=');
  });

  it('a stale push pulls the newer server copy instead of overwriting it', async () => {
    const { service, directory, sessionId } = await prepared({ outcome: 'published' });
    await signLocally(sessionId, 'v2');
    directory.push.mockResolvedValueOnce({ outcome: 'stale', serverRev: 5 });
    directory.fetchInterviewer.mockResolvedValue(await serverCopy(sessionId, 5, 'remote'));

    await service.flush(sessionId);

    expect(directory.push).toHaveBeenCalledOnce();
    expect(titleOf(sessionId)).toBe('remote');
    expect(entryOf(sessionId).pushedRev).toBe(5);
  });

  it.each([
    { name: 'before the first accepted push the candidate code is replaced and the push retried', isFirstPush: true, expected: { isChanged: true, pushes: 2 } },
    { name: 'after a push was accepted the shown code never changes', isFirstPush: false, expected: { isChanged: false, pushes: 1 } },
  ])('candidate-taken: $name', async ({ isFirstPush, expected }) => {
    const directory = fakeDirectory();
    const service = serviceOver(directory);
    if (isFirstPush) {
      directory.push.mockResolvedValueOnce({ outcome: 'candidate-taken' });
    }
    const sessionId = await service.prepare(problemTitled('v1'));
    if (sessionId === null) {
      throw new Error('prepare failed');
    }
    const before = entryOf(sessionId).candidateCode;
    await settled(service);
    if (!isFirstPush) {
      directory.push.mockClear();
      await signLocally(sessionId, 'v2');
      directory.push.mockResolvedValueOnce({ outcome: 'candidate-taken' });
      await service.flush(sessionId);
    }

    expect({ isChanged: entryOf(sessionId).candidateCode !== before, pushes: directory.push.mock.calls.length }).toEqual(expected);
  });

  it.each<{
    name: string;
    isEnabled: boolean;
    firstPush: PushResult;
    server: RemoveOutcome;
    isPushWaiting: boolean;
    expected: { result: boolean; isLocalKept: boolean; requests: number; pushes: number };
  }>([
    {
      name: 'directory disabled removes locally with no request',
      isEnabled: false,
      firstPush: { outcome: 'published' },
      server: 'removed',
      isPushWaiting: false,
      expected: { result: true, isLocalKept: false, requests: 0, pushes: 0 },
    },
    {
      name: 'never published removes locally with no request',
      isEnabled: true,
      firstPush: { outcome: OFFLINE_FIRST },
      server: 'removed',
      isPushWaiting: false,
      expected: { result: true, isLocalKept: false, requests: 0, pushes: 0 },
    },
    {
      name: 'published and removed on the server removes locally',
      isEnabled: true,
      firstPush: { outcome: 'published' },
      server: 'removed',
      isPushWaiting: false,
      expected: { result: true, isLocalKept: false, requests: 1, pushes: 0 },
    },
    {
      name: 'published and not found on the server removes locally',
      isEnabled: true,
      firstPush: { outcome: 'published' },
      server: 'not-found',
      isPushWaiting: false,
      expected: { result: true, isLocalKept: false, requests: 1, pushes: 0 },
    },
    {
      name: 'published and the server unreachable keeps the entry',
      isEnabled: true,
      firstPush: { outcome: 'published' },
      server: 'offline',
      isPushWaiting: false,
      expected: { result: false, isLocalKept: true, requests: 1, pushes: 0 },
    },
    {
      name: 'a waiting push is not sent after a successful delete',
      isEnabled: true,
      firstPush: { outcome: 'published' },
      server: 'removed',
      isPushWaiting: true,
      expected: { result: true, isLocalKept: false, requests: 1, pushes: 0 },
    },
  ])('remove: $name', async ({ isEnabled, firstPush, server, isPushWaiting, expected }) => {
    const { service, directory, sessionId } = await prepared(firstPush);
    directory.isEnabled = isEnabled;
    directory.remove.mockResolvedValue(server);
    if (isPushWaiting) {
      service.mirror(sessionId, await signNext(sessionId, 'v2'), true);
    }

    const result = await service.remove(sessionId);
    await vi.advanceTimersByTimeAsync(LIVE_PUSH_MIN_MS);
    await settled(service);

    expect({
      result,
      isLocalKept: loadPrepared(sessionId) !== null,
      requests: directory.remove.mock.calls.length,
      pushes: directory.push.mock.calls.length,
    }).toEqual(expected);
  });

  it('prepare with a schedule stores it and pushes it with the entry', async () => {
    const directory = fakeDirectory();
    const service = serviceOver(directory);

    const sessionId = await service.prepare(problemTitled('v1'), SCHEDULE);
    if (sessionId === null) {
      throw new Error('prepare failed');
    }
    await settled(service);

    expect(entryOf(sessionId).schedule).toEqual(SCHEDULE);
    expect(directory.push.mock.calls[0][0].schedule).toEqual(SCHEDULE);
    expect(service.list()[0].schedule).toEqual(SCHEDULE);
  });

  it('an interviewer code this browser does not hold is saved with the server copy\'s schedule', async () => {
    const { service, directory, sessionId } = await prepared();
    const held = entryOf(sessionId);
    localStorage.clear();
    directory.fetchInterviewer.mockResolvedValue({
      status: 'found',
      rev: held.problem.rev,
      entry: { v: 1, packed: held.packed, problem: held.problem, createdAt: held.createdAt, candidateCode: held.candidateCode, schedule: SCHEDULE },
    });

    const result = await service.enterCode(held.interviewerCode);

    expect(result).toEqual({ status: 'interviewer', packed: held.packed });
    expect(entryOf(sessionId).schedule).toEqual(SCHEDULE);
  });

  it('refresh shows a title changed in the store', async () => {
    const { service, sessionId } = await prepared();
    const entry = entryOf(sessionId);
    const keys = await parsePackedKey(entry.packed);
    if (keys === null) {
      throw new Error('bad key');
    }

    mirrorPreparedProblem(sessionId, await signProblemAt(keys.privateKey, sessionId, entry.problem.rev + 1, problemTitled('renamed')));
    service.refresh();

    expect(listPrepared().length).toBe(1);
    expect(service.list().find((item) => item.sessionId === sessionId)?.title).toBe('renamed');
  });
});
