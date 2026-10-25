import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WeekNavigation } from './week-navigation';

function buildWeekNavigation(): WeekNavigation {
  return TestBed.runInInjectionContext(
    () =>
      new WeekNavigation({
        schedule: signal(null),
        history: signal([]),
        historyStatus: signal('idle'),
        viewWeekOf: signal<string | null>(null),
        selectedDate: signal<string | null>(null),
        requestHistory: () => undefined,
        onWeekChange: () => undefined,
      }),
  );
}

describe('WeekNavigation.todayISO', () => {
  afterEach(() => vi.useRealTimers());

  // Local-time constructor: the session date rolls at 05:00 local, not at midnight.
  const cases: readonly { name: string; now: Date; expected: string }[] = [
    { name: '03:00 still belongs to the previous day', now: new Date(2026, 9, 25, 3), expected: '2026-10-24' },
    { name: '05:00 starts the new day', now: new Date(2026, 9, 25, 5), expected: '2026-10-25' },
  ];

  it.each(cases)('$name', ({ now, expected }) => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    expect(buildWeekNavigation().todayISO()).toBe(expected);
  });
});
