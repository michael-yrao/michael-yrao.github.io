import { addDaysISO, shortMonthDay, weekStartISO } from './local-date';

describe('weekStartISO', () => {
  it('returns the Monday of the ISO week a Sunday date falls in', () => {
    expect(weekStartISO('2026-09-27')).toBe('2026-09-21');
  });

  it('returns the same date when it is already a Monday', () => {
    expect(weekStartISO('2026-09-21')).toBe('2026-09-21');
  });

  it('walks back across a month boundary', () => {
    // 2026-10-01 is a Thursday; its week's Monday is 2026-09-28.
    expect(weekStartISO('2026-10-01')).toBe('2026-09-28');
  });
});

describe('addDaysISO', () => {
  it('adds days forward within a month', () => {
    expect(addDaysISO('2026-09-21', 3)).toBe('2026-09-24');
  });

  it('subtracts days backward across a month boundary', () => {
    expect(addDaysISO('2026-10-01', -1)).toBe('2026-09-30');
  });

  it('rolls forward across a year boundary', () => {
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('is the exact inverse weekStartISO relies on: every day in a 7-day run maps to one Monday', () => {
    const monday = weekStartISO('2026-09-24'); // an arbitrary Thursday
    const week = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
    for (const day of week) {
      expect(weekStartISO(day)).toBe(monday);
    }
  });
});

// A couple of existing shortMonthDay cases are re-asserted here too (not just today-board's
// spec) now that this file exists as local-date's own home.
describe('shortMonthDay', () => {
  it('renders a fixed ISO date as "Mon D"', () => {
    expect(shortMonthDay('2026-10-21')).toBe('Oct 21');
    expect(shortMonthDay('2026-01-05')).toBe('Jan 5');
  });

  it('returns the input unchanged when it does not match YYYY-MM-DD', () => {
    expect(shortMonthDay('not-a-date')).toBe('not-a-date');
  });
});
