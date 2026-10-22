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
    { name: 'compare unordered-inner', value: makeProblem({ compare: 'unordered-inner' }), isValid: true },
    { name: 'unknown compare', value: makeProblem({ compare: 'sorted' }), isValid: false },
    { name: 'case args not an array', value: makeProblem({ cases: [{ args: 'x', expected: 1, example: true }] }), isValid: false },
    { name: 'case with no expected', value: makeProblem({ cases: [{ args: [], example: true }] }), isValid: false },
    { name: 'a valid graph figure', value: makeProblem({ figure: { kind: 'graph', directed: true, edgesArg: 1, nodeCountArg: null } }), isValid: true },
    { name: 'a matrix figure with highlight', value: makeProblem({ figure: { kind: 'graph', directed: false, matrixArg: 0, highlight: 'expected' } }), isValid: true },
    { name: 'a matrix figure with edges expected', value: makeProblem({ figure: { kind: 'graph', directed: false, matrixArg: 0, edges: 'expected' } }), isValid: true },
    { name: 'edges other than expected', value: makeProblem({ figure: { kind: 'graph', directed: false, matrixArg: 0, edges: 'input' } }), isValid: false },
    { name: 'edges on an edgesArg figure', value: makeProblem({ figure: { kind: 'graph', directed: false, edgesArg: 0, nodeCountArg: null, edges: 'expected' } }), isValid: false },
    { name: 'edges together with highlight', value: makeProblem({ figure: { kind: 'graph', directed: false, matrixArg: 0, edges: 'expected', highlight: 'expected' } }), isValid: false },
    { name: 'a figure with two edge sources', value: makeProblem({ figure: { kind: 'graph', directed: false, edgesArg: 0, nodeCountArg: null, matrixArg: 1 } }), isValid: false },
    { name: 'a malformed figure (non-integer index)', value: makeProblem({ figure: { kind: 'grid', gridArg: '0' } }), isValid: false },
    { name: 'a grid figure with boxSize and blank', value: makeProblem({ figure: { kind: 'grid', gridArg: 0, boxSize: 3, blank: '.' } }), isValid: true },
    { name: 'a grid figure with boxSize below 2', value: makeProblem({ figure: { kind: 'grid', gridArg: 0, boxSize: 1 } }), isValid: false },
    { name: 'a grid figure with an empty blank', value: makeProblem({ figure: { kind: 'grid', gridArg: 0, blank: '' } }), isValid: false },
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
    { name: 'number-inf as a result codec', value: makeProblem({ types: { args: [null], result: 'number-inf' } }), isValid: true },
    { name: 'number-inf as an arg codec (result-only)', value: makeProblem({ types: { args: ['number-inf'], result: null } }), isValid: false },
    { name: 'list-node-list as an arg codec', value: makeProblem({ types: { args: ['list-node-list'], result: 'list-node' } }), isValid: true },
    { name: 'list-node-list as a result codec (arg-only)', value: makeProblem({ types: { args: [null], result: 'list-node-list' } }), isValid: false },
    { name: 'list-node-ref as a result codec', value: makeProblem({ types: { args: ['list-node-cycle'], result: 'list-node-ref' } }), isValid: true },
    { name: 'list-node-ref as an arg codec (result-only)', value: makeProblem({ types: { args: ['list-node-ref'], result: null } }), isValid: false },
    { name: 'a known judge name bound to an integer', value: makeProblem({ cases: [{ args: [5], judge: { isBadVersion: 4 }, expected: 4, example: true }] }), isValid: true },
    { name: 'an unknown judge name', value: makeProblem({ cases: [{ args: [5], judge: { isGoodVersion: 4 }, expected: 4, example: true }] }), isValid: false },
    { name: 'figureCells of integer pairs', value: makeProblem({ cases: [{ args: [5], figureCells: [[0, 1], [2, 3]], expected: 4, example: true }] }), isValid: true },
    { name: 'a figureCells pair of the wrong length', value: makeProblem({ cases: [{ args: [5], figureCells: [[0, 1, 2]], expected: 4, example: true }] }), isValid: false },
    { name: 'a figureCells pair with a non-integer', value: makeProblem({ cases: [{ args: [5], figureCells: [[0, 1.5]], expected: 4, example: true }] }), isValid: false },
    { name: 'a judge value that is not an integer', value: makeProblem({ cases: [{ args: [5], judge: { isBadVersion: '4' }, expected: 4, example: true }] }), isValid: false },
    { name: 'an anyOf expected', value: makeProblem({ cases: [{ args: [], expected: { anyOf: ['01', '10'] }, example: true }] }), isValid: true },
    { name: 'an anyOf expected with an extra key', value: makeProblem({ cases: [{ args: [], expected: { anyOf: ['01'], other: 1 }, example: true }] }), isValid: false },
    { name: 'an empty anyOf expected', value: makeProblem({ cases: [{ args: [], expected: { anyOf: [] }, example: true }] }), isValid: false },
    {
      name: 'an ops problem with constructor types and an anyOf op output',
      value: makeProblem({
        entry: { className: 'Solution', method: 'getRandom', kind: 'ops' },
        types: { args: ['list-node'], result: null },
        cases: [{ ops: ['Solution', 'getRandom'], args: [[[1, 2, 3]], []], expected: [null, { anyOf: [1, 2, 3] }], example: true }],
      }),
      isValid: true,
    },
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
