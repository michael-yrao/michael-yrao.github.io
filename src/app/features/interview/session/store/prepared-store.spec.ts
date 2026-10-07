import { SignedProblem } from '../interview-problem';
import { InterviewSchedule } from '../interview-schedule';
import {
  PREPARED_KEY_PREFIX,
  PreparedEntry,
  findPreparedByCode,
  listPrepared,
  loadPrepared,
  markPushed,
  mirrorPreparedProblem,
} from './prepared-store';
import { SESSION_KEY_PREFIX, SESSION_TTL_MS, pruneExpiredSessions } from './session-store';

const SESSION_ID = 'po-abc';
const NOW = 1_000_000_000_000;
const SIGNATURE = 'S'.repeat(86);
const SECRET_PACKED = 'SECRET-KEY-MATERIAL';
const SECRET_CODE = '4TPD8HNW3RXA';
const PROBLEM: SignedProblem = { rev: 3, json: '{}', signature: SIGNATURE };
const ENTRY: PreparedEntry = {
  packed: SECRET_PACKED,
  problem: PROBLEM,
  createdAt: NOW,
  candidateCode: 'K7QF2M9X',
  interviewerCode: SECRET_CODE,
  pushedRev: 0,
};
const SCHEDULE: InterviewSchedule = {
  problemId: 'problem-1',
  scheduledAt: NOW,
  durationMin: 45,
  candidateName: 'Ada',
  candidateEmail: '',
  interviewerName: 'Grace',
  notes: '',
};
const key = (sessionId: string): string => `${PREPARED_KEY_PREFIX}${sessionId}`;

const LOAD_CASES: readonly { name: string; raw: string | null; expected: PreparedEntry | null }[] = [
  { name: 'a valid entry loads', raw: JSON.stringify(ENTRY), expected: ENTRY },
  { name: 'a pushed entry loads', raw: JSON.stringify({ ...ENTRY, pushedRev: 4 }), expected: { ...ENTRY, pushedRev: 4 } },
  { name: 'a missing key is null', raw: null, expected: null },
  { name: 'bad JSON is null', raw: '{not json', expected: null },
  { name: 'a bad problem is null', raw: JSON.stringify({ ...ENTRY, problem: { rev: 1 } }), expected: null },
  { name: 'an entry with no code or pushedRev fields is null', raw: JSON.stringify({ packed: SECRET_PACKED, problem: PROBLEM, createdAt: NOW }), expected: null },
  { name: 'a missing candidate code is null', raw: JSON.stringify({ ...ENTRY, candidateCode: undefined }), expected: null },
  { name: 'a numeric interviewer code is null', raw: JSON.stringify({ ...ENTRY, interviewerCode: 7 }), expected: null },
  { name: 'a negative pushedRev is null', raw: JSON.stringify({ ...ENTRY, pushedRev: -1 }), expected: null },
  { name: 'a fractional pushedRev is null', raw: JSON.stringify({ ...ENTRY, pushedRev: 1.5 }), expected: null },
  { name: 'an entry with a schedule loads it', raw: JSON.stringify({ ...ENTRY, schedule: SCHEDULE }), expected: { ...ENTRY, schedule: SCHEDULE } },
  { name: 'a malformed schedule loads the entry without it', raw: JSON.stringify({ ...ENTRY, schedule: { ...SCHEDULE, durationMin: 1 } }), expected: ENTRY },
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

  it('error logs never contain the key or the interviewer code', () => {
    localStorage.setItem(key('bad-json'), `{"packed":"${SECRET_PACKED}", "interviewerCode":"${SECRET_CODE}", oops`);
    localStorage.setItem(key('bad-shape'), JSON.stringify({ ...ENTRY, problem: 5 }));

    listPrepared();

    expect(errors).toHaveBeenCalled();
    expect(JSON.stringify(errors.mock.calls)).not.toContain(SECRET_PACKED);
    expect(JSON.stringify(errors.mock.calls)).not.toContain(SECRET_CODE);
  });

  it.each([
    { name: 'no entry writes nothing', stored: null, rev: 9, isReplaced: false, expected: null },
    { name: 'an equal revision leaves the entry', stored: ENTRY, rev: PROBLEM.rev, isReplaced: false, expected: ENTRY },
    { name: 'a lower revision leaves the entry', stored: ENTRY, rev: PROBLEM.rev - 1, isReplaced: false, expected: ENTRY },
    {
      name: 'a higher revision replaces the problem and keeps the rest',
      stored: ENTRY,
      rev: PROBLEM.rev + 1,
      isReplaced: true,
      expected: { ...ENTRY, problem: { ...PROBLEM, rev: PROBLEM.rev + 1, json: '{"a":1}' } },
    },
  ])('mirrorPreparedProblem: $name', ({ stored, rev, isReplaced, expected }) => {
    if (stored !== null) {
      localStorage.setItem(key(SESSION_ID), JSON.stringify(stored));
    }

    expect(mirrorPreparedProblem(SESSION_ID, { ...PROBLEM, rev, json: '{"a":1}' })).toBe(isReplaced);

    expect(loadPrepared(SESSION_ID)).toEqual(expected);
  });

  it.each([
    { name: 'a higher revision is recorded', stored: 2, rev: 3, expected: 3 },
    { name: 'an equal revision stays', stored: 2, rev: 2, expected: 2 },
    { name: 'a lower revision never lowers it', stored: 2, rev: 1, expected: 2 },
  ])('markPushed: $name', ({ stored, rev, expected }) => {
    localStorage.setItem(key(SESSION_ID), JSON.stringify({ ...ENTRY, pushedRev: stored }));

    markPushed(SESSION_ID, rev);

    expect(loadPrepared(SESSION_ID)?.pushedRev).toBe(expected);
  });

  it('findPreparedByCode returns the entry with that interviewer code and its session id, else null', () => {
    localStorage.setItem(key('other'), JSON.stringify({ ...ENTRY, interviewerCode: 'ZZZZZZZZZZZZ' }));
    localStorage.setItem(key(SESSION_ID), JSON.stringify(ENTRY));

    expect(findPreparedByCode(SECRET_CODE)).toEqual({ ...ENTRY, sessionId: SESSION_ID });
    expect(findPreparedByCode('000000000000')).toBeNull();
  });

  it('listPrepared skips malformed entries and sorts newest first', () => {
    localStorage.setItem(key('older'), JSON.stringify({ ...ENTRY, createdAt: NOW - 1 }));
    localStorage.setItem(key('newer'), JSON.stringify({ ...ENTRY, createdAt: NOW + 1 }));
    localStorage.setItem(key('broken'), '{not json');
    localStorage.setItem('unrelated', JSON.stringify(ENTRY));

    expect(listPrepared().map((entry) => entry.sessionId)).toEqual(['newer', 'older']);
  });
});
