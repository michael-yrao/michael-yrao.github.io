import type { AlgorithmMeta } from '../../core/models/algorithm.model';
import type { PracticeProblem } from '../../core/models/practice.model';
import { reflowProse } from '../../core/practice/reflow';
import { splitStatement } from '../../core/practice/statement-segments';
import { entryFromStarter, importProblem, statementFromMeta } from './problem-import';

interface VisibleSegment {
  readonly exampleNumber: number | null;
  readonly text: string;
}

const HINT = 'Think about a hash map.';

const metaWith = (parts: Partial<AlgorithmMeta>): AlgorithmMeta =>
  ({ description: 'Find two numbers.', examples: [], constraints: [], hint: '', ...parts }) as AlgorithmMeta;

/** What the description component shows for a statement: its parser's segments, reflowed. */
const visibleSegments = (statement: string): readonly VisibleSegment[] =>
  splitStatement(statement).map((s) => ({
    exampleNumber: s.exampleNumber,
    text: reflowProse(s.text).trim(),
  }));

const EXAMPLE_ONE = { input: 'nums = [2,7], target = 9', output: '[0,1]', explanation: '2 + 7 = 9' };
const EXAMPLE_TWO = { input: 'nums = [3,3], target = 6', output: '[0,1]' };

const STATEMENT_CASES: readonly {
  readonly name: string;
  readonly meta: AlgorithmMeta;
  readonly segments: readonly VisibleSegment[];
}[] = [
  {
    name: 'no examples and no constraints is the prose alone',
    meta: metaWith({}),
    segments: [{ exampleNumber: null, text: 'Find two numbers.' }],
  },
  {
    name: 'several examples keep their numbers, lines and the optional explanation',
    meta: metaWith({ examples: [EXAMPLE_ONE, EXAMPLE_TWO] }),
    segments: [
      { exampleNumber: null, text: 'Find two numbers.' },
      {
        exampleNumber: 1,
        text: 'Example 1:\n  Input: nums = [2,7], target = 9\n  Output: [0,1]\n  Explanation: 2 + 7 = 9',
      },
      { exampleNumber: 2, text: 'Example 2:\n  Input: nums = [3,3], target = 6\n  Output: [0,1]' },
    ],
  },
  {
    name: 'constraints follow the examples as indented bullets, and the hint is left out',
    meta: metaWith({ examples: [EXAMPLE_TWO], constraints: ['2 <= n', 'one answer'], hint: HINT }),
    segments: [
      { exampleNumber: null, text: 'Find two numbers.' },
      { exampleNumber: 1, text: 'Example 1:\n  Input: nums = [3,3], target = 6\n  Output: [0,1]' },
      { exampleNumber: null, text: 'Constraints:\n  - 2 <= n\n  - one answer' },
    ],
  },
  {
    name: 'constraints without examples stay in the prose segment',
    meta: metaWith({ constraints: ['2 <= n'] }),
    segments: [{ exampleNumber: null, text: 'Find two numbers.\n\nConstraints:\n  - 2 <= n' }],
  },
];

describe('statementFromMeta', () => {
  it.each(STATEMENT_CASES)('$name', ({ meta, segments }) => {
    const statement = statementFromMeta(meta);

    expect(visibleSegments(statement)).toEqual(segments);
    expect(statement).not.toContain(HINT);
  });
});

const ENTRY_CASES: readonly {
  readonly name: string;
  readonly starter: string;
  readonly entry: { readonly className: string; readonly method: string } | null;
}[] = [
  {
    name: 'class and method',
    starter: 'class Solution:\n    def twoSum(self, nums):\n        pass\n',
    entry: { className: 'Solution', method: 'twoSum' },
  },
  {
    name: 'a private method is skipped',
    starter: 'class Solution:\n    def __init__(self):\n        pass\n    def _help(self):\n        pass\n    def solve(self):\n        pass\n',
    entry: { className: 'Solution', method: 'solve' },
  },
  { name: 'no class', starter: 'x = 1\n', entry: null },
  {
    name: 'a class with no public method',
    starter: 'class Solution:\n    def _help(self):\n        pass\n',
    entry: null,
  },
  {
    name: 'a top-level def is ignored',
    starter: 'def helper():\n    pass\n\nclass Solution:\n    def solve(self):\n        pass\n',
    entry: { className: 'Solution', method: 'solve' },
  },
  {
    name: 'a top-level def alone is no entry',
    starter: 'def solve():\n    pass\n',
    entry: null,
  },
  {
    name: 'the first of several classes, not a later class that has the method',
    starter: 'class Empty:\n    pass\n\nclass Solution:\n    def solve(self):\n        pass\n',
    entry: null,
  },
  {
    name: 'the first of several classes with methods',
    starter: 'class A:\n    def first(self):\n        pass\n\nclass B:\n    def second(self):\n        pass\n',
    entry: { className: 'A', method: 'first' },
  },
];

describe('entryFromStarter', () => {
  it.each(ENTRY_CASES)('$name', ({ starter, entry }) => {
    expect(entryFromStarter(starter)).toEqual(entry);
  });
});

const PROBLEM: PracticeProblem = {
  number: 1,
  title: 'Two Sum',
  url: null,
  statement: 'Own statement.',
  stub: 'class Solution:\n    pass\n',
  entry: { className: 'Solution', method: 'twoSum' },
  compare: 'unordered',
  result: { kind: 'arg', index: 0 },
  types: { args: ['list-node'], result: null },
  figure: { kind: 'grid', gridArg: 0 },
  cases: [{ args: [[2, 7], 9], expected: [0, 1], example: true }],
};

describe('importProblem', () => {
  it('uses the meta when the statement is null', () => {
    const meta = metaWith({ description: 'From meta.' });

    const imported = importProblem({ ...PROBLEM, statement: null }, meta);

    expect(imported.statement).toBe('From meta.');
  });

  it('keeps a non-null statement', () => {
    expect(importProblem(PROBLEM, metaWith({})).statement).toBe('Own statement.');
  });

  it('sets the source and starter and carries the other fields', () => {
    const imported = importProblem(PROBLEM, null);

    expect(imported).toEqual({
      title: 'Two Sum',
      statement: 'Own statement.',
      starter: PROBLEM.stub,
      entry: PROBLEM.entry,
      compare: 'unordered',
      cases: PROBLEM.cases,
      result: PROBLEM.result,
      types: PROBLEM.types,
      figure: PROBLEM.figure,
      source: 1,
    });
    expect(imported.cases).not.toBe(PROBLEM.cases);
  });
});
