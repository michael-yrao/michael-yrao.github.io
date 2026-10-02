import { CompareMode } from '../models/practice.model';
import { matches } from './compare';

describe('matches', () => {
  const rows: { name: string; got: unknown; expected: unknown; exact: boolean; unordered: boolean; nested: boolean }[] = [
    { name: 'identical', got: [[1], [2]], expected: [[1], [2]], exact: true, unordered: true, nested: true },
    { name: 'top-level order differs', got: [[2], [1]], expected: [[1], [2]], exact: false, unordered: true, nested: true },
    { name: 'inner order differs', got: [[2, 1]], expected: [[1, 2]], exact: false, unordered: false, nested: true },
    { name: 'duplicate-count mismatch', got: [[1], [1]], expected: [[1]], exact: false, unordered: false, nested: false },
    { name: 'non-array got', got: 3, expected: [3], exact: false, unordered: false, nested: false },
  ];

  it.each(rows)('$name (inputs are never mutated)', ({ got, expected, exact, unordered, nested }) => {
    const gotBefore = structuredClone(got);
    const expectedBefore = structuredClone(expected);
    const modes: [CompareMode, boolean][] = [
      ['exact', exact],
      ['unordered', unordered],
      ['unordered-nested', nested],
    ];

    for (const [mode, want] of modes) {
      expect(matches(got, expected, mode), mode).toBe(want);
    }

    expect(got).toEqual(gotBefore);
    expect(expected).toEqual(expectedBefore);
  });
});
