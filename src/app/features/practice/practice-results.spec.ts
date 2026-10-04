import { PracticeCase } from '../../core/models/practice.model';
import { CaseResult } from '../../core/runner/runner.model';
import { ResultRow, defaultCaseIndex, toResultRow } from './practice-results';

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
