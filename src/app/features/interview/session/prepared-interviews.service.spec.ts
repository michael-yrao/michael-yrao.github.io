import { parsePackedKey, signProblemAt } from './host-key';
import { InterviewProblem } from './interview-problem';
import { LinkImport, PreparedInterviewsService } from './prepared-interviews.service';
import { decodeLinkProblem, encodeLinkProblem, linkProblemValue } from './prepared-link';
import { loadPrepared, mirrorPreparedProblem, savePrepared } from './prepared-store';

const BASE_URL = 'https://site.test/interview';
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
const revOf = (sessionId: string): number => loadPrepared(sessionId)?.problem.rev ?? -1;

async function prepared(title = 'v1') {
  const service = new PreparedInterviewsService();
  const sessionId = await service.prepare(problemTitled(title));
  const packed = sessionId === null ? null : service.packedOf(sessionId);
  if (sessionId === null || packed === null) {
    throw new Error('prepare failed');
  }
  return { service, sessionId, packed };
}

/** The `p=` value of the interviewer link as it is now. */
async function linkValueOf(service: PreparedInterviewsService, packed: string): Promise<string> {
  const links = await service.linksForKey(packed, BASE_URL);
  const value = linkProblemValue(new URL(links?.interviewerUrl ?? '').hash);
  if (value === null) {
    throw new Error('no link value');
  }
  return value;
}

/** Replaces the stored problem with a higher, correctly signed revision, as a session's edit does. */
async function editInStore(sessionId: string, title: string): Promise<void> {
  const entry = loadPrepared(sessionId);
  const keys = entry === null ? null : await parsePackedKey(entry.packed);
  if (entry !== null && keys !== null) {
    mirrorPreparedProblem(sessionId, await signProblemAt(keys.privateKey, sessionId, entry.problem.rev + 1, problemTitled(title)));
  }
}

describe('prepared interviews', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each<{ name: string; expected: LinkImport; setup: () => Promise<{ packed: string; value: string; id: string; expectedRev: number }> }>([
    {
      name: 'no local entry is saved',
      expected: 'saved',
      setup: async () => {
        const { service, sessionId, packed } = await prepared();
        const value = await linkValueOf(service, packed);
        const expectedRev = revOf(sessionId);
        localStorage.clear();
        return { packed, value, id: sessionId, expectedRev };
      },
    },
    {
      name: 'a lower local revision is replaced',
      expected: 'saved',
      setup: async () => {
        const { service, sessionId, packed } = await prepared();
        const older = loadPrepared(sessionId);
        await editInStore(sessionId, 'v2');
        const value = await linkValueOf(service, packed);
        const expectedRev = revOf(sessionId);
        if (older !== null) {
          savePrepared(sessionId, older);
        }
        return { packed, value, id: sessionId, expectedRev };
      },
    },
    {
      name: 'a higher local revision is kept',
      expected: 'kept',
      setup: async () => {
        const { service, sessionId, packed } = await prepared();
        const value = await linkValueOf(service, packed);
        await editInStore(sessionId, 'v2');
        return { packed, value, id: sessionId, expectedRev: revOf(sessionId) };
      },
    },
    {
      name: 'a refused write is unsaved and saves nothing',
      expected: 'unsaved',
      setup: async () => {
        const { service, sessionId, packed } = await prepared();
        const value = await linkValueOf(service, packed);
        localStorage.clear();
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new DOMException('quota', 'QuotaExceededError');
        });
        return { packed, value, id: sessionId, expectedRev: -1 };
      },
    },
    {
      name: 'another interview key is invalid and saves nothing',
      expected: 'invalid',
      setup: async () => {
        const mine = await prepared();
        const other = await prepared('other');
        const value = await linkValueOf(mine.service, mine.packed);
        localStorage.clear();
        return { packed: other.packed, value, id: mine.sessionId, expectedRev: -1 };
      },
    },
    {
      name: 'tampered JSON is invalid and saves nothing',
      expected: 'invalid',
      setup: async () => {
        const { service, sessionId, packed } = await prepared();
        const signed = await decodeLinkProblem(await linkValueOf(service, packed));
        const value = await encodeLinkProblem({ ...(signed as NonNullable<typeof signed>), json: JSON.stringify(problemTitled('tampered')) });
        localStorage.clear();
        return { packed, value, id: sessionId, expectedRev: -1 };
      },
    },
  ])('importLink: $name', async ({ expected, setup }) => {
    const { packed, value, id, expectedRev } = await setup();
    const freshDevice = new PreparedInterviewsService();

    expect(await freshDevice.importLink(packed, value)).toBe(expected);

    expect(revOf(id)).toBe(expectedRev);
    expect(freshDevice.list().some((item) => item.sessionId === id)).toBe(expected === 'saved' || expected === 'kept');
  });

  it.each([
    { name: 'an entry', hasEntry: true, isKeyValid: true },
    { name: 'no entry in this browser', hasEntry: false, isKeyValid: true },
    { name: 'an invalid key', hasEntry: true, isKeyValid: false },
  ])('linksForKey: $name', async ({ hasEntry, isKeyValid }) => {
    const { service, sessionId, packed } = await prepared('v1');
    if (!hasEntry) {
      localStorage.clear();
    }

    const found = await service.linksForKey(isKeyValid ? packed : 'not-a-key', `${BASE_URL}?host=old#p=stale`);

    if (!hasEntry || !isKeyValid) {
      expect(found).toBeNull();
      return;
    }
    const candidate = new URL(found?.candidateUrl ?? '');
    expect([...candidate.searchParams.keys()]).toEqual(['join']);
    expect(candidate.hash).toBe('');
    const interviewer = new URL(found?.interviewerUrl ?? '');
    expect(interviewer.searchParams.get('host')).toBe(packed);
    const decoded = await decodeLinkProblem(linkProblemValue(interviewer.hash) ?? '');
    expect(decoded?.json).toBe(loadPrepared(sessionId)?.problem.json);
  });

  it.each([
    { name: 'an entry is removed', hasEntry: true, expected: true },
    { name: 'no entry removes nothing', hasEntry: false, expected: false },
  ])('removeForKey: $name', async ({ hasEntry, expected }) => {
    const { service, sessionId, packed } = await prepared();
    if (!hasEntry) {
      localStorage.clear();
    }

    expect(await service.removeForKey(packed)).toBe(expected);

    expect(loadPrepared(sessionId)).toBeNull();
    expect(service.list().some((item) => item.sessionId === sessionId)).toBe(!expected);
  });

  it('refresh shows a title changed in the store', async () => {
    const { service, sessionId } = await prepared('v1');

    await editInStore(sessionId, 'renamed');
    service.refresh();

    expect(service.list().find((item) => item.sessionId === sessionId)?.title).toBe('renamed');
  });
});
