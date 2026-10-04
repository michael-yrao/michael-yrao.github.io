import { workloadBand, HEAVY_THRESHOLD, WorkloadBand } from './workload-band';

const CEILING = 8;
const FLOOR = 3;
const JUST_ABOVE = 0.01;

describe('workloadBand', () => {
  const cases: readonly [string, number, number | null, WorkloadBand][] = [
    ['at the floor', FLOOR, FLOOR, 'Light'],
    ['just above the floor', FLOOR + JUST_ABOVE, FLOOR, 'Moderate'],
    ['at the heavy threshold', HEAVY_THRESHOLD * CEILING, FLOOR, 'Heavy'],
    ['exactly at the ceiling', CEILING, FLOOR, 'Heavy'],
    ['just above the ceiling', CEILING + JUST_ABOVE, FLOOR, 'Over'],
    ['no floor, low units', 1, null, 'Moderate'],
  ];

  it.each(cases)('%s', (_name, units, floor, expected) => {
    expect(workloadBand(units, CEILING, floor)).toBe(expected);
  });
});
