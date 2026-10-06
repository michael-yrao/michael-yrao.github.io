import { InterviewProblem } from './session/interview-problem';
import {
  SAVED_PROBLEM_KEY_PREFIX,
  SavedProblem,
  listSavedProblems,
  loadSavedProblem,
  updateSavedProblem,
} from './saved-problem-store';

const ID = 'problem-1';
const CREATED_AT = 1_000;
const UPDATED_AT = 2_000;
const LATER = 5_000;
const PROBLEM: InterviewProblem = {
  title: 'Two Sum',
  statement: 'Find a pair.',
  starter: 'def f(): pass',
  entry: null,
  compare: 'exact',
  cases: [],
  result: null,
  types: null,
  figure: null,
  source: null,
};
const SAVED: SavedProblem = { problem: PROBLEM, createdAt: CREATED_AT, updatedAt: UPDATED_AT };
const key = (id: string): string => `${SAVED_PROBLEM_KEY_PREFIX}${id}`;

describe('saved problem store', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each<{ name: string; raw: string | null; expected: SavedProblem | null }>([
    { name: 'a valid entry loads', raw: JSON.stringify(SAVED), expected: SAVED },
    { name: 'a missing key is null', raw: null, expected: null },
    { name: 'bad JSON is null', raw: '{not json', expected: null },
    { name: 'an invalid problem is null', raw: JSON.stringify({ ...SAVED, problem: { title: 1 } }), expected: null },
    { name: 'a missing updatedAt is null', raw: JSON.stringify({ problem: PROBLEM, createdAt: CREATED_AT }), expected: null },
  ])('load: $name', ({ raw, expected }) => {
    if (raw !== null) {
      localStorage.setItem(key(ID), raw);
    }

    expect(loadSavedProblem(ID)).toEqual(expected);
  });

  it('list skips malformed entries and sorts by updatedAt, newest first', () => {
    localStorage.setItem(key('older'), JSON.stringify({ ...SAVED, updatedAt: CREATED_AT }));
    localStorage.setItem(key('newer'), JSON.stringify({ ...SAVED, updatedAt: UPDATED_AT }));
    localStorage.setItem(key('broken'), '{not json');
    localStorage.setItem('unrelated', JSON.stringify(SAVED));

    expect(listSavedProblems().map((item) => item.id)).toEqual(['newer', 'older']);
  });

  it.each<{ name: string; id: string; expected: { isUpdated: boolean; saved: SavedProblem | null } }>([
    {
      name: 'keeps createdAt and moves updatedAt',
      id: ID,
      expected: { isUpdated: true, saved: { problem: { ...PROBLEM, title: 'Renamed' }, createdAt: CREATED_AT, updatedAt: LATER } },
    },
    { name: 'an unknown id is false and writes nothing', id: 'missing', expected: { isUpdated: false, saved: null } },
  ])('update: $name', ({ id, expected }) => {
    localStorage.setItem(key(ID), JSON.stringify(SAVED));

    const isUpdated = updateSavedProblem(id, { ...PROBLEM, title: 'Renamed' }, LATER);

    expect({ isUpdated, saved: loadSavedProblem(id) }).toEqual(expected);
  });
});
