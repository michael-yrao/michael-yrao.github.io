import { LARGE_PASTE_MIN_CHARS, isLargePaste } from './candidate-activity';

describe('isLargePaste', () => {
  const atThreshold = 'x'.repeat(LARGE_PASTE_MIN_CHARS);
  const cases: { name: string; pasted: string; lastCopied: string | null; expected: boolean }[] = [
    { name: 'below the threshold is not large', pasted: 'x'.repeat(LARGE_PASTE_MIN_CHARS - 1), lastCopied: null, expected: false },
    { name: 'at the threshold is large', pasted: atThreshold, lastCopied: null, expected: true },
    { name: 'equal to the last copied text is not large', pasted: atThreshold, lastCopied: atThreshold, expected: false },
  ];

  it.each(cases)('$name', ({ pasted, lastCopied, expected }) => {
    expect(isLargePaste(pasted, lastCopied)).toBe(expected);
  });
});
