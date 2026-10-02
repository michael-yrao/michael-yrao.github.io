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
    { name: 'a null statement', value: makeProblem({ statement: null }), isValid: true },
    { name: 'result arg', value: makeProblem({ result: { kind: 'arg', index: 0 } }), isValid: true },
    { name: 'result arg-prefix', value: makeProblem({ result: { kind: 'arg-prefix', index: 0 } }), isValid: true },
    { name: 'result arg with a non-integer index', value: makeProblem({ result: { kind: 'arg', index: 1.5 } }), isValid: false },
    { name: 'result arg-prefix with a negative index', value: makeProblem({ result: { kind: 'arg-prefix', index: -1 } }), isValid: false },
    { name: 'result arg with no index', value: makeProblem({ result: { kind: 'arg' } }), isValid: false },
    { name: 'unknown result kind', value: makeProblem({ result: { kind: 'stdout' } }), isValid: false },
    { name: 'list-node and list-node-cycle codecs', value: makeProblem({ types: { args: ['list-node', 'list-node-cycle', null], result: 'list-node' } }), isValid: true },
    { name: 'random-list and tree-node codecs', value: makeProblem({ types: { args: ['random-list', 'tree-node'], result: 'tree-node' } }), isValid: true },
    { name: 'tree-value and graph-node codecs', value: makeProblem({ types: { args: ['tree-node', 'tree-value'], result: 'graph-node' } }), isValid: true },
    { name: 'tree-value as a result codec with a null arg', value: makeProblem({ types: { args: [null], result: 'tree-value' } }), isValid: true },
    { name: 'unknown arg codec', value: makeProblem({ types: { args: ['linked-list'], result: null } }), isValid: false },
    { name: 'unknown result codec', value: makeProblem({ types: { args: [], result: 'matrix' } }), isValid: false },
    { name: 'types args not an array', value: makeProblem({ types: { args: 'list-node', result: null } }), isValid: false },
    {
      name: 'an ops problem',
      value: makeProblem({
        entry: { className: 'LRUCache', method: 'get', kind: 'ops' },
        cases: [{ ops: ['LRUCache', 'get'], args: [[2], [1]], expected: [null, -1], example: true }],
      }),
      isValid: true,
    },
    {
      name: 'an ops case with no ops',
      value: makeProblem({
        entry: { className: 'LRUCache', method: 'get', kind: 'ops' },
        cases: [{ args: [[2], [1]], expected: [null, -1], example: true }],
      }),
      isValid: false,
    },
    {
      name: 'an ops case whose args length differs from ops',
      value: makeProblem({
        entry: { className: 'LRUCache', method: 'get', kind: 'ops' },
        cases: [{ ops: ['LRUCache', 'get'], args: [[2]], expected: [null, -1], example: true }],
      }),
      isValid: false,
    },
    {
      name: 'an ops case whose args are not arrays of arrays',
      value: makeProblem({
        entry: { className: 'LRUCache', method: 'get', kind: 'ops' },
        cases: [{ ops: ['LRUCache', 'get'], args: [[2], 1], expected: [null, -1], example: true }],
      }),
      isValid: false,
    },
    {
      name: 'a round-trip problem',
      value: makeProblem({ entry: { className: 'Codec', method: 'serialize', kind: 'round-trip', encode: 'serialize', decode: 'deserialize' } }),
      isValid: true,
    },
    {
      name: 'a round-trip entry with no decode',
      value: makeProblem({ entry: { className: 'Codec', method: 'serialize', kind: 'round-trip', encode: 'serialize' } }),
      isValid: false,
    },
    { name: 'unknown entry kind', value: makeProblem({ entry: { className: 'Solution', method: 'f', kind: 'stream' } }), isValid: false },
  ];

  it.each(rows)('$name', ({ value, isValid }) => {
    expect(isPracticeProblem(value)).toBe(isValid);
  });
});
