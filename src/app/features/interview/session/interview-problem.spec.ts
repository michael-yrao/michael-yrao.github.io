import {
  CASES_MAX,
  PROBLEM_JSON_MAX_LENGTH,
  STARTER_MAX_LENGTH,
  STATEMENT_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  parseInterviewProblem,
} from './interview-problem';

const BASE = {
  title: '',
  statement: '',
  starter: '',
  entry: null,
  compare: 'exact',
  cases: [],
  result: null,
  types: null,
  figure: null,
  source: null,
};
const METHOD_ENTRY = { className: 'Solution', method: 'twoSum' };
const OPS_ENTRY = { className: 'LRUCache', method: 'run', kind: 'ops' };
const CASE = { args: [[1, 2], 3], expected: [0, 1], example: false };
const OPS_CASE = { ops: ['put', 'get'], args: [[1, 1], [1]], expected: [null, 1], example: false };

/** Enough one-character cases to pass `CASES_MAX` but each field alone under its own cap. */
const casesOf = (count: number) => Array.from({ length: count }, () => CASE);

const CASES: readonly { name: string; input: unknown; isValid: boolean; expected?: unknown }[] = [
  { name: 'an empty problem is valid', input: BASE, isValid: true },
  {
    name: 'unknown keys are stripped',
    input: { ...BASE, title: 'Pair sum', extra: 'dropped' },
    isValid: true,
    expected: { ...BASE, title: 'Pair sum' },
  },
  { name: 'a title at the cap is valid', input: { ...BASE, title: 't'.repeat(TITLE_MAX_LENGTH) }, isValid: true },
  { name: 'a title over the cap is null', input: { ...BASE, title: 't'.repeat(TITLE_MAX_LENGTH + 1) }, isValid: false },
  { name: 'a statement at the cap is valid', input: { ...BASE, statement: 's'.repeat(STATEMENT_MAX_LENGTH) }, isValid: true },
  { name: 'a statement over the cap is null', input: { ...BASE, statement: 's'.repeat(STATEMENT_MAX_LENGTH + 1) }, isValid: false },
  { name: 'a starter at the cap is valid', input: { ...BASE, starter: 'x'.repeat(STARTER_MAX_LENGTH) }, isValid: true },
  { name: 'a starter over the cap is null', input: { ...BASE, starter: 'x'.repeat(STARTER_MAX_LENGTH + 1) }, isValid: false },
  { name: 'cases at the cap are valid', input: { ...BASE, entry: METHOD_ENTRY, cases: casesOf(CASES_MAX) }, isValid: true },
  { name: 'cases over the cap are null', input: { ...BASE, entry: METHOD_ENTRY, cases: casesOf(CASES_MAX + 1) }, isValid: false },
  {
    name: 'a serialized form over the JSON cap is null, though each field is within its own cap',
    input: {
      ...BASE,
      statement: 's'.repeat(STATEMENT_MAX_LENGTH),
      starter: 'x'.repeat(STARTER_MAX_LENGTH),
      entry: METHOD_ENTRY,
      cases: Array.from({ length: CASES_MAX }, () => ({ ...CASE, expected: 'e'.repeat(PROBLEM_JSON_MAX_LENGTH / CASES_MAX) })),
    },
    isValid: false,
  },
  { name: 'a case without expected is null', input: { ...BASE, entry: METHOD_ENTRY, cases: [{ args: [], example: false }] }, isValid: false },
  { name: 'an ops case under an ops entry is valid', input: { ...BASE, entry: OPS_ENTRY, cases: [OPS_CASE] }, isValid: true },
  { name: 'a plain case under an ops entry is null', input: { ...BASE, entry: OPS_ENTRY, cases: [CASE] }, isValid: false },
  { name: 'a null entry with cases is valid', input: { ...BASE, entry: null, cases: [CASE] }, isValid: true },
  { name: 'an entry without a method is null', input: { ...BASE, entry: { className: 'Solution' } }, isValid: false },
  { name: 'an unknown compare mode is null', input: { ...BASE, compare: 'sorted' }, isValid: false },
  { name: 'a source that is not a positive integer is null', input: { ...BASE, source: 0 }, isValid: false },
  { name: 'a source that is a positive integer is valid', input: { ...BASE, source: 1 }, isValid: true },
  { name: 'a missing key is null', input: { ...BASE, figure: undefined }, isValid: false },
  { name: 'a non-object is null', input: 'hi', isValid: false },
];

describe('parseInterviewProblem', () => {
  it.each(CASES)('$name', ({ input, isValid, expected }) => {
    const parsed = parseInterviewProblem(input);

    expect(parsed !== null).toBe(isValid);
    if (expected !== undefined) {
      expect(parsed).toEqual(expected);
    }
  });
});
