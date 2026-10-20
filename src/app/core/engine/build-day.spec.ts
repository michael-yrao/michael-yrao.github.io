import { isBuildDay } from './build-day';

describe('isBuildDay', () => {
  it.each([
    { name: 'a Sunday', iso: '2026-10-18', expected: true },
    { name: 'a Monday', iso: '2026-10-19', expected: false },
    { name: 'a Saturday', iso: '2026-10-17', expected: false },
    { name: 'a string that is not a date', iso: 'not-a-date', expected: false },
  ])('$name -> $expected', ({ iso, expected }) => {
    expect(isBuildDay(iso)).toBe(expected);
  });
});
