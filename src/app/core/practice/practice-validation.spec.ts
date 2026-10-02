import { isPracticeProblem } from './practice-validation';

function makeProblem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    number: 90,
    title: 'Subsets II',
    url: null,
    statement: 'Return all subsets.',
    stub: 'class Solution:\n    pass\n',
    entry: { className: 'Solution', method: 'subsetsWithDup' },
    compare: 'unordered-nested',
    cases: [{ args: [[1, 2, 2]], expected: [[], [1]], example: true }],
    ...overrides,
  };
}

describe('isPracticeProblem', () => {
  const rows: { name: string; value: unknown; isValid: boolean }[] = [
    { name: 'a valid problem', value: makeProblem(), isValid: true },
    { name: 'a null expected is legal', value: makeProblem({ cases: [{ args: [], expected: null, example: false }] }), isValid: true },
    { name: 'missing entry.method', value: makeProblem({ entry: { className: 'Solution' } }), isValid: false },
    { name: 'unknown compare', value: makeProblem({ compare: 'sorted' }), isValid: false },
    { name: 'case args not an array', value: makeProblem({ cases: [{ args: 'x', expected: 1, example: true }] }), isValid: false },
    { name: 'case with no expected', value: makeProblem({ cases: [{ args: [], example: true }] }), isValid: false },
    { name: 'a valid graph figure', value: makeProblem({ figure: { kind: 'graph', directed: true, edgesArg: 1, nodeCountArg: null } }), isValid: true },
    { name: 'a malformed figure (non-integer index)', value: makeProblem({ figure: { kind: 'grid', gridArg: '0' } }), isValid: false },
    { name: 'non-boolean example', value: makeProblem({ cases: [{ args: [], expected: 1, example: 'yes' }] }), isValid: false },
  ];

  it.each(rows)('$name', ({ value, isValid }) => {
    expect(isPracticeProblem(value)).toBe(isValid);
  });
});
