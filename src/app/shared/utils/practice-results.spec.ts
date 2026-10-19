import { PracticeCase } from '../../core/models/practice.model';
import { CaseResult } from '../../core/runner/runner.model';
import { ResultRow, defaultCaseIndex, errorLine, toResultRow } from './practice-results';

function rowOf(index: number, isPass: boolean): ResultRow {
  return {
    index,
    isPass,
    mark: isPass ? '✓' : '✗',
    word: null,
    input: '',
    expected: '',
    got: null,
    errorMessage: null,
    stdout: '',
  };
}

describe('defaultCaseIndex', () => {
  it.each([
    { name: 'all pass falls back to the first case', passes: [true, true], expected: 0 },
    { name: 'picks the first failure', passes: [true, false, false], expected: 1 },
  ])('$name', ({ passes, expected }) => {
    const rows = passes.map((isPass, index) => rowOf(index, isPass));

    expect(defaultCaseIndex(rows)).toBe(expected);
  });
});

describe('errorLine', () => {
  const TWO_FRAMES =
    'Traceback (most recent call last):\n  File "solution.py", line 12, in f\n    return g(x)\n  File "solution.py", line 4, in g\n    return 1 / 0\nZeroDivisionError: division by zero';
  const SYNTAX = '  File "solution.py", line 3\n    def f(:\n          ^\nSyntaxError: invalid syntax';
  it.each([
    { name: 'two learner frames give the last one', message: TWO_FRAMES, expected: 4 },
    { name: 'a SyntaxError traceback gives its line', message: SYNTAX, expected: 3 },
    { name: 'no solution.py frame gives null', message: 'RecursionError: maximum recursion depth', expected: null },
    { name: 'null input gives null', message: null, expected: null },
  ])('$name', ({ message, expected }) => {
    expect(errorLine(message)).toBe(expected);
  });
});

describe('toResultRow', () => {
  it('draws an ops case as one input line per op, with expected and got as lists', () => {
    const testCase: PracticeCase = {
      ops: ['LRUCache', 'put', 'get'],
      args: [[2], [1, 1], [1]],
      expected: [null, null, 1],
      example: true,
    };
    const result: CaseResult = {
      index: 0,
      verdict: 'pass',
      outcome: { status: 'ok', hasJson: true, gotJson: [null, null, 1], gotRepr: '[None, None, 1]', stdout: '' },
    };

    const row = toResultRow(result, [testCase]);

    expect(row.input.split('\n')).toEqual(['LRUCache(2)', 'put(1, 1)', 'get(1)']);
    expect(row.expected).toBe('[null,null,1]');
    expect(row.got).toBe('[null,null,1]');
  });

  it('draws an anyOf expected as its alternatives joined by a pipe', () => {
    const testCase: PracticeCase = { args: [2], expected: { anyOf: ['01', '10'] }, example: true };
    const result: CaseResult = {
      index: 0,
      verdict: 'fail',
      outcome: { status: 'ok', hasJson: true, gotJson: '00', gotRepr: '', stdout: '' },
    };

    const row = toResultRow(result, [testCase]);

    expect(row.expected).toBe('"01" | "10"');
    expect(row.got).toBe('"00"');
  });

  it('draws a per-op anyOf inside an ops expected list element by element', () => {
    const testCase: PracticeCase = { args: [[], [1]], ops: ['A', 'b'], expected: [null, { anyOf: [1, 2, 3] }], example: true };
    const result: CaseResult = {
      index: 0,
      verdict: 'fail',
      outcome: { status: 'ok', hasJson: true, gotJson: [null, 4], gotRepr: '', stdout: '' },
    };

    const row = toResultRow(result, [testCase]);

    expect(row.expected).toBe('[null,1 | 2 | 3]');
  });

  it("draws a 'number-inf' result with Python's inf spelling, unquoted, nested lists included", () => {
    const testCase: PracticeCase = { args: [3], expected: ['-Infinity', 2, 'Infinity'], example: true };
    const result: CaseResult = {
      index: 0,
      verdict: 'fail',
      outcome: { status: 'ok', hasJson: true, gotJson: ['-Infinity', 2, ['Infinity']], gotRepr: '', stdout: '' },
    };

    const row = toResultRow(result, [testCase], 'number-inf');

    expect(row.expected).toBe('[-inf,2,inf]');
    expect(row.got).toBe('[-inf,2,[inf]]');
  });
});
