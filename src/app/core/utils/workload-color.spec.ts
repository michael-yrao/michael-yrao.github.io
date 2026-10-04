import { workloadColor } from './workload-color';

describe('workloadColor', () => {
  const cases: { name: string; units: number; ceiling: number; floor: number | null; expected: string }[] = [
    { name: 'no floor, zero units', units: 0, ceiling: 8, floor: null, expected: 'var(--color-easy)' },
    { name: 'exactly at the floor', units: 3, ceiling: 8, floor: 3, expected: 'var(--color-easy)' },
    { name: 'at the heavy threshold', units: 9, ceiling: 10, floor: 3, expected: 'var(--color-hard)' },
    { name: 'at the ceiling', units: 10, ceiling: 10, floor: 3, expected: 'var(--color-over)' },
    {
      name: 'midway between heavy and over',
      units: 9.5,
      ceiling: 10,
      floor: 3,
      expected: 'color-mix(in oklch, var(--color-hard) 50%, var(--color-over))',
    },
    { name: 'at the deep-over ratio', units: 15, ceiling: 10, floor: 3, expected: 'var(--color-over-deep)' },
    { name: 'far beyond (clamped)', units: 30, ceiling: 10, floor: 3, expected: 'var(--color-over-deep)' },
  ];

  it.each(cases)('$name', ({ units, ceiling, floor, expected }) => {
    expect(workloadColor(units, ceiling, floor)).toBe(expected);
  });
});
