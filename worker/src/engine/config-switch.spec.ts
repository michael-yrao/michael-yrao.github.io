import { describe, expect, it } from 'vitest';
import { readWeeklyBuildSwitch } from './config-switch';

describe('readWeeklyBuildSwitch', () => {
  const cases: ReadonlyArray<{ label: string; text: string; expected: boolean | null }> = [
    {
      label: 'true',
      text: 'automation:\n  weekly_build: true\n',
      expected: true,
    },
    {
      label: 'false with trailing comment',
      text: 'automation:\n  weekly_build: false             # the author\'s build stays coach-driven; onboarding writes true\n',
      expected: false,
    },
    { label: 'key absent', text: 'automation:\n  other: true\n', expected: null },
    {
      label: 'first uncommented line wins',
      text: '# weekly_build: true\nautomation:\n  weekly_build: false\n',
      expected: false,
    },
    { label: 'capitalised value', text: 'automation:\n  weekly_build: True\n', expected: null },
  ];

  it.each(cases)('$label', ({ text, expected }) => {
    expect(readWeeklyBuildSwitch(text)).toBe(expected);
  });
});
