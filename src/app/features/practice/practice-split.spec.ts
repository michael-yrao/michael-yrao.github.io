import {
  DEFAULT_OUTPUT_SHARE,
  DEFAULT_PROBLEM_SHARE,
  MAX_OUTPUT_SHARE,
  MAX_PROBLEM_SHARE,
  MIN_OUTPUT_SHARE,
  MIN_PROBLEM_SHARE,
  OUTPUT_SPEC,
  clampShare,
  parseStoredShare,
  shareFromPointer,
} from './practice-split';

describe('practice-split helpers', () => {
  it('clamps a share, reads it from a pointer, and parses a stored value', () => {
    const clampCases: [number, number][] = [
      [0.1, MIN_PROBLEM_SHARE],
      [0.4, 0.4],
      [0.9, MAX_PROBLEM_SHARE],
    ];
    for (const [input, expected] of clampCases) expect(clampShare(input)).toBe(expected);

    // A split starting at x=100, 1000 wide.
    const pointerCases: [number, number, number, number][] = [
      [600, 100, 1000, 0.5],
      [110, 100, 1000, MIN_PROBLEM_SHARE],
      [1090, 100, 1000, MAX_PROBLEM_SHARE],
      [600, 100, 0, DEFAULT_PROBLEM_SHARE],
    ];
    for (const [x, left, width, expected] of pointerCases) {
      expect(shareFromPointer(x, left, width)).toBe(expected);
    }

    // Output's share runs from the bottom edge: a pointer 400 up a 1000-high column is 0.4.
    const outputCases: [number, number][] = [
      [400, 0.4],
      [10, MIN_OUTPUT_SHARE],
      [990, MAX_OUTPUT_SHARE],
    ];
    for (const [fromBottom, expected] of outputCases) {
      expect(shareFromPointer(fromBottom, 0, 1000, OUTPUT_SPEC)).toBe(expected);
    }
    expect(parseStoredShare('0.9', OUTPUT_SPEC)).toBe(DEFAULT_OUTPUT_SHARE);

    const storedCases: [string | null, number][] = [
      ['0.4', 0.4],
      ['abc', DEFAULT_PROBLEM_SHARE],
      ['0.9', DEFAULT_PROBLEM_SHARE],
      [null, DEFAULT_PROBLEM_SHARE],
    ];
    for (const [raw, expected] of storedCases) expect(parseStoredShare(raw)).toBe(expected);
  });
});
