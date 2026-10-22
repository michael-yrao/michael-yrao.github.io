import { boxEdgeClasses } from './grid-visualizer.component';

describe('boxEdgeClasses', () => {
  it('marks the cells that close a box, except on the last column and row', () => {
    const rows: { name: string; row: number; col: number; boxSize: number | undefined; expected: string[] }[] = [
      { name: 'a box edge column', row: 0, col: 2, boxSize: 3, expected: ['gv__cell--box-right'] },
      { name: 'a box edge row', row: 5, col: 0, boxSize: 3, expected: ['gv__cell--box-bottom'] },
      { name: 'both edges at once', row: 2, col: 5, boxSize: 3, expected: ['gv__cell--box-right', 'gv__cell--box-bottom'] },
      { name: 'the last column and row', row: 8, col: 8, boxSize: 3, expected: [] },
      { name: 'an interior cell', row: 1, col: 1, boxSize: 3, expected: [] },
      { name: 'no boxSize', row: 2, col: 2, boxSize: undefined, expected: [] },
    ];
    for (const { name, row, col, boxSize, expected } of rows) {
      expect(boxEdgeClasses(row, col, 9, 9, boxSize), name).toEqual(expected);
    }
  });
});
