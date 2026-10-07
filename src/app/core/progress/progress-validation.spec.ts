import { MINIMAL_SUMMARY_BODY } from './progress-summary.fixture';
import { isProgressSummary } from './progress-validation';

describe('isProgressSummary', () => {
  const withoutStreak = Object.fromEntries(
    Object.entries(MINIMAL_SUMMARY_BODY).filter(([key]) => key !== 'streak'),
  );
  const cases: { name: string; value: unknown; expected: boolean }[] = [
    { name: 'the minimal summary fixture', value: MINIMAL_SUMMARY_BODY, expected: true },
    { name: 'missing streak', value: withoutStreak, expected: false },
    { name: 'badges not an array', value: { ...MINIMAL_SUMMARY_BODY, badges: {} }, expected: false },
    { name: 'schemaVersion a string', value: { ...MINIMAL_SUMMARY_BODY, schemaVersion: '1' }, expected: false },
  ];

  it.each(cases)('$name', ({ value, expected }) => {
    expect(isProgressSummary(value)).toBe(expected);
  });
});
