import { gridKey } from './grid-key';

describe('gridKey', () => {
  it('joins row and column with a comma', () => {
    const rows: [string, number, number, string][] = [
      ['plain row', 1, 2, '1,2'],
      ['multi-digit row', 12, 3, '12,3'],
      ['negative row', -1, 0, '-1,0'],
    ];
    for (const [label, row, col, expected] of rows) {
      expect(gridKey(row, col), label).toBe(expected);
    }
  });
});
