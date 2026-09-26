import { describe, expect, it } from 'vitest';
import { zonedWallClockToUTC } from './tz';

describe('zonedWallClockToUTC', () => {
  it('converts an EDT (summer) wall clock in America/New_York', () => {
    // 2026-10-26 is still EDT (DST ends the first Sunday of November): UTC-4.
    const ms = zonedWallClockToUTC(
      { year: 2026, month: 10, day: 26, hour: 16, minute: 30, second: 0 },
      'America/New_York',
    );
    expect(new Date(ms).toISOString()).toBe('2026-10-26T20:30:00.000Z');
  });

  it('converts an EST (winter) wall clock in America/New_York', () => {
    // December is EST: UTC-5.
    const ms = zonedWallClockToUTC(
      { year: 2026, month: 12, day: 10, hour: 9, minute: 0, second: 0 },
      'America/New_York',
    );
    expect(new Date(ms).toISOString()).toBe('2026-12-10T14:00:00.000Z');
  });

  it('handles midnight without formatting it as hour 24', () => {
    const ms = zonedWallClockToUTC(
      { year: 2026, month: 6, day: 1, hour: 0, minute: 0, second: 0 },
      'America/New_York',
    );
    expect(new Date(ms).toISOString()).toBe('2026-06-01T04:00:00.000Z');
  });

  it('converts a positive-offset zone (Asia/Kolkata, UTC+5:30)', () => {
    const ms = zonedWallClockToUTC(
      { year: 2026, month: 9, day: 27, hour: 11, minute: 0, second: 0 },
      'Asia/Kolkata',
    );
    expect(new Date(ms).toISOString()).toBe('2026-09-27T05:30:00.000Z');
  });

  it('falls back to treating the wall clock as UTC for an unknown TZID', () => {
    const ms = zonedWallClockToUTC(
      { year: 2026, month: 1, day: 1, hour: 12, minute: 0, second: 0 },
      'Not/A_Real_Zone',
    );
    expect(new Date(ms).toISOString()).toBe('2026-01-01T12:00:00.000Z');
  });
});
