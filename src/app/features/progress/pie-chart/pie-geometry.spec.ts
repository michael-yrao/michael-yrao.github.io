import { ChartSegment } from './pie-chart.component';
import { pieSlices } from './pie-geometry';

const RADIUS = 10;

function seg(key: string, value: number): ChartSegment {
  return { key, label: key, value, cls: `seg-${key}` };
}

describe('pieSlices', () => {
  const cases: {
    name: string;
    input: ChartSegment[];
    expected: { key: string; start: number; end: number; largeArc: boolean; isFull: boolean }[];
  }[] = [
    {
      name: 'a 1:3 split sweeps 90 then 270 degrees, clockwise from 12 o\'clock',
      input: [seg('a', 1), seg('b', 3)],
      expected: [
        { key: 'a', start: 0, end: 90, largeArc: false, isFull: false },
        { key: 'b', start: 90, end: 360, largeArc: true, isFull: false },
      ],
    },
    {
      name: 'a zero-value segment is dropped',
      input: [seg('a', 1), seg('zero', 0), seg('b', 1)],
      expected: [
        { key: 'a', start: 0, end: 180, largeArc: false, isFull: false },
        { key: 'b', start: 180, end: 360, largeArc: false, isFull: false },
      ],
    },
    {
      name: 'a single non-zero segment returns the full-circle marker',
      input: [seg('a', 0), seg('b', 5)],
      expected: [{ key: 'b', start: 0, end: 360, largeArc: true, isFull: true }],
    },
    { name: 'an empty list returns []', input: [], expected: [] },
  ];

  it.each(cases)('$name', ({ input, expected }) => {
    const slices = pieSlices(input, RADIUS).map((s) => ({
      key: s.segment.key,
      start: s.startAngle,
      end: s.endAngle,
      largeArc: s.largeArc,
      isFull: s.isFull,
    }));
    expect(slices).toEqual(expected);
  });
});
