import { addPlate, LifterState, MAX_PLATES_PER_SIDE } from './lifter-state';

describe('addPlate', () => {
  const cases: readonly { name: string; from: LifterState; to: LifterState }[] = [
    {
      name: 'adds the first plate',
      from: { plateCount: 0, isSpilling: false },
      to: { plateCount: 1, isSpilling: false },
    },
    {
      name: 'adds the last plate up to the max',
      from: { plateCount: MAX_PLATES_PER_SIDE - 1, isSpilling: false },
      to: { plateCount: MAX_PLATES_PER_SIDE, isSpilling: false },
    },
    {
      name: 'spills and resets one click past the max',
      from: { plateCount: MAX_PLATES_PER_SIDE, isSpilling: false },
      to: { plateCount: 0, isSpilling: true },
    },
    {
      name: 'clears a pending spill when the next plate goes on',
      from: { plateCount: 0, isSpilling: true },
      to: { plateCount: 1, isSpilling: false },
    },
  ];

  it.each(cases)('$name', ({ from, to }) => {
    expect(addPlate(from)).toEqual(to);
  });
});
