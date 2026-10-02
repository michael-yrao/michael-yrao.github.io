import { PracticeCase } from '../../core/models/practice.model';
import { CaseResult } from '../../core/runner/runner.model';
import { toResultRow } from './practice-results';

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
});
