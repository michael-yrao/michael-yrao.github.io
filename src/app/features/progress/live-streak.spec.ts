import { Streak } from '../../core/models/progress.model';
import { liveStreak } from './live-streak';

const BASE: Streak = {
  current: 5,
  longest: 9,
  lastStudyDay: '2026-10-22',
  studyDays: 20,
  freezes: 2,
  freezesLeft: 2,
  freezeMax: 3,
  frozenDays: ['2026-10-01'],
};

describe('liveStreak', () => {
  const cases: [string, string, Partial<Streak>, number, number, string[]][] = [
    ['study day itself: nothing spent', '2026-10-22', {}, 5, 2, ['2026-10-01']],
    ['next day: today not over', '2026-10-23', {}, 5, 2, ['2026-10-01']],
    ['one trailing miss spends one freeze', '2026-10-24', {}, 5, 1, ['2026-10-01', '2026-10-23']],
    [
      'two trailing misses spend the bank',
      '2026-10-25',
      {},
      5,
      0,
      ['2026-10-01', '2026-10-23', '2026-10-24'],
    ],
    ['three trailing misses break the streak', '2026-10-26', {}, 0, 0, ['2026-10-01']],
    [
      'generated trailing date is not duplicated',
      '2026-10-24',
      { frozenDays: ['2026-10-01', '2026-10-23'], freezesLeft: 1 },
      5,
      1,
      ['2026-10-01', '2026-10-23'],
    ],
  ];

  it.each(cases)('%s', (_label, today, override, current, freezesLeft, frozenDays) => {
    const result = liveStreak({ ...BASE, ...override }, today);
    expect(result.current).toBe(current);
    expect(result.freezesLeft).toBe(freezesLeft);
    expect(result.frozenDays).toEqual(frozenDays);
  });

  it('passes a streak without freezes through unchanged', () => {
    const legacy: Streak = { current: 5, longest: 9, lastStudyDay: '2026-10-22', studyDays: 20 };
    expect(liveStreak(legacy, '2026-10-26')).toBe(legacy);
  });
});
