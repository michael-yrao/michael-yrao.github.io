import { SignedProblem } from './interview-problem';
import { PREPARED_KEY_PREFIX, PreparedEntry, listPrepared, loadPrepared, mirrorPreparedProblem } from './prepared-store';
import { SESSION_KEY_PREFIX, SESSION_TTL_MS, pruneExpiredSessions } from './session-store';

const SESSION_ID = 'po-abc';
const NOW = 1_000_000_000_000;
const SIGNATURE = 'S'.repeat(86);
const SECRET_PACKED = 'SECRET-KEY-MATERIAL';
const PROBLEM: SignedProblem = { rev: 3, json: '{}', signature: SIGNATURE };
const ENTRY: PreparedEntry = { packed: SECRET_PACKED, problem: PROBLEM, createdAt: NOW };
const key = (sessionId: string): string => `${PREPARED_KEY_PREFIX}${sessionId}`;

const LOAD_CASES: readonly { name: string; raw: string | null; expected: PreparedEntry | null }[] = [
  { name: 'a valid entry loads', raw: JSON.stringify(ENTRY), expected: ENTRY },
  { name: 'a missing key is null', raw: null, expected: null },
  { name: 'bad JSON is null', raw: '{not json', expected: null },
  { name: 'a bad problem is null', raw: JSON.stringify({ ...ENTRY, problem: { rev: 1 } }), expected: null },
];

describe('prepared store', () => {
  let errors: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each(LOAD_CASES)('load: $name', ({ raw, expected }) => {
    if (raw !== null) {
      localStorage.setItem(key(SESSION_ID), raw);
    }
    expect(loadPrepared(SESSION_ID)).toEqual(expected);
  });

  it('an entry older than the session TTL still loads, and pruning leaves it alone', () => {
    const old: PreparedEntry = { ...ENTRY, createdAt: NOW - 2 * SESSION_TTL_MS };
    localStorage.setItem(key(SESSION_ID), JSON.stringify(old));
    localStorage.setItem(`${SESSION_KEY_PREFIX}interviewer:${SESSION_ID}`, JSON.stringify({ doc: '', rev: 0, savedAt: NOW - 2 * SESSION_TTL_MS }));

    pruneExpiredSessions(NOW);

    expect(loadPrepared(SESSION_ID)).toEqual(old);
    expect(localStorage.getItem(`${SESSION_KEY_PREFIX}interviewer:${SESSION_ID}`)).toBeNull();
  });

  it('error logs never contain the key', () => {
    localStorage.setItem(key('bad-json'), `{"packed":"${SECRET_PACKED}", oops`);
    localStorage.setItem(key('bad-shape'), JSON.stringify({ packed: SECRET_PACKED, problem: 5, createdAt: NOW }));

    listPrepared();

    expect(errors).toHaveBeenCalled();
    expect(JSON.stringify(errors.mock.calls)).not.toContain(SECRET_PACKED);
  });

  it.each([
    { name: 'no entry writes nothing', stored: null, rev: 9, expected: null },
    { name: 'an equal revision leaves the entry', stored: ENTRY, rev: PROBLEM.rev, expected: ENTRY },
    { name: 'a lower revision leaves the entry', stored: ENTRY, rev: PROBLEM.rev - 1, expected: ENTRY },
    {
      name: 'a higher revision replaces the problem and keeps packed and createdAt',
      stored: ENTRY,
      rev: PROBLEM.rev + 1,
      expected: { ...ENTRY, problem: { ...PROBLEM, rev: PROBLEM.rev + 1, json: '{"a":1}' } },
    },
  ])('mirrorPreparedProblem: $name', ({ stored, rev, expected }) => {
    if (stored !== null) {
      localStorage.setItem(key(SESSION_ID), JSON.stringify(stored));
    }

    mirrorPreparedProblem(SESSION_ID, { ...PROBLEM, rev, json: '{"a":1}' });

    expect(loadPrepared(SESSION_ID)).toEqual(expected);
  });

  it('listPrepared skips malformed entries and sorts newest first', () => {
    localStorage.setItem(key('older'), JSON.stringify({ ...ENTRY, createdAt: NOW - 1 }));
    localStorage.setItem(key('newer'), JSON.stringify({ ...ENTRY, createdAt: NOW + 1 }));
    localStorage.setItem(key('broken'), '{not json');
    localStorage.setItem('unrelated', JSON.stringify(ENTRY));

    expect(listPrepared().map((entry) => entry.sessionId)).toEqual(['newer', 'older']);
  });
});
