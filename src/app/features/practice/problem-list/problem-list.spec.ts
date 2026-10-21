import type { Comfort, ProblemProgress } from '../../../core/models/progress.model';
import { comfortByNumber } from './problem-list';

function row(lcNumber: number, comfort: Comfort, level: number | null): ProblemProgress {
  return { lcNumber, comfort, level } as ProblemProgress;
}

describe('comfortByNumber', () => {
  const cases: ReadonlyArray<{ name: string; rows: ProblemProgress[]; expected: [number, Comfort][] }> = [
    { name: 'empty gives an empty map', rows: [], expected: [] },
    {
      name: 'the higher level wins for a shared number',
      rows: [row(1, '🔴', 2), row(1, '🟢', 5), row(1, '🟡', 3)],
      expected: [[1, '🟢']],
    },
    {
      name: 'a null level loses to a set one',
      rows: [row(2, '🎓', null), row(2, '🟡', 0)],
      expected: [[2, '🟡']],
    },
  ];

  it.each(cases)('$name', ({ rows, expected }) => {
    expect([...comfortByNumber(rows)]).toEqual(expected);
  });
});
