import { gridState } from './grid-state';

describe('gridState', () => {
  const source = [
    [1, 0],
    [0, 1],
  ];

  it('maps every source cell through cellState and keeps optional fields only when passed', () => {
    const plain = gridState(source, (cell) => (cell === 1 ? 'land' : 'water'));
    expect(plain.grid, 'cell state decided per source cell').toEqual([
      [{ state: 'land' }, { state: 'water' }],
      [{ state: 'water' }, { state: 'land' }],
    ]);
    expect(Object.keys(plain), 'no key for an optional field').toEqual(['type', 'grid']);

    const diagonal = gridState(source, (_, r, c) => (r === c ? 'active' : 'empty'));
    expect(diagonal.grid, 'row and column are passed to cellState').toEqual([
      [{ state: 'active' }, { state: 'empty' }],
      [{ state: 'empty' }, { state: 'active' }],
    ]);

    const labelled = gridState(source, () => 'land', { cellLabel: (cell, r, c) => `${cell}@${r},${c}` });
    expect(labelled.grid[1], 'cellLabel gets the cell, row and column').toEqual([
      { state: 'land', label: '0@1,0' },
      { state: 'land', label: '1@1,1' },
    ]);

    const counters =[{ label: 'islands', value: 2 }];
    const legend = [{ state: 'land' as const, label: 'land' }];
    const full = gridState(source, () => 'land', { counters, legend });
    expect(full.counters, 'passed counters appear').toBe(counters);
    expect(full.legend, 'passed legend appears').toBe(legend);
  });
});
