import { parseStoredMode } from './solution-link-mode';

describe('parseStoredMode', () => {
  const cases: [string, string | null, 'site-first' | 'github'][] = [
    ["'github' parses as 'github'", 'github', 'github'],
    ["'site-first' parses as 'site-first'", 'site-first', 'site-first'],
    ['null falls back to site-first', null, 'site-first'],
    ['garbage falls back to site-first', 'not-a-mode', 'site-first'],
  ];

  it.each(cases)('%s', (_label, raw, expected) => {
    expect(parseStoredMode(raw)).toBe(expected);
  });
});
