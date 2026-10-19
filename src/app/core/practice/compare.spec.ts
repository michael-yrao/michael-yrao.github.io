import { CompareMode } from '../models/practice.model';
import { matches } from './compare';

describe('matches', () => {
  const rows: { name: string; got: unknown; expected: unknown; exact: boolean; unordered: boolean; nested: boolean }[] = [
    { name: 'identical', got: [[1], [2]], expected: [[1], [2]], exact: true, unordered: true, nested: true },
    { name: 'top-level order differs', got: [[2], [1]], expected: [[1], [2]], exact: false, unordered: true, nested: true },
    { name: 'inner order differs', got: [[2, 1]], expected: [[1, 2]], exact: false, unordered: false, nested: true },
    { name: 'duplicate-count mismatch', got: [[1], [1]], expected: [[1]], exact: false, unordered: false, nested: false },
    { name: 'non-array got', got: 3, expected: [3], exact: false, unordered: false, nested: false },
    { name: 'anyOf: one alternative matches', got: '10', expected: { anyOf: ['01', '10'] }, exact: true, unordered: true, nested: true },
    { name: 'anyOf: no alternative matches', got: '00', expected: { anyOf: ['01', '10'] }, exact: false, unordered: false, nested: false },
    { name: 'anyOf: the mode applies to each alternative', got: [2, 1], expected: { anyOf: [[1, 2], [3]] }, exact: false, unordered: true, nested: true },
    { name: 'anyOf: nested mode ignores inner order per alternative', got: [[2, 1]], expected: { anyOf: [[[1, 2]]] }, exact: false, unordered: false, nested: true },
    { name: 'anyOf per op: the other ops compare as expected', got: [null, 1], expected: [null, { anyOf: [1, 2, 3] }], exact: true, unordered: true, nested: true },
    { name: 'anyOf per op: a wrong op fails', got: [null, 4], expected: [null, { anyOf: [1, 2, 3] }], exact: false, unordered: false, nested: false },
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

  it.each([
    { name: 'inner lists reordered', got: [[2, 1], [3]], expected: [[1, 2], [3]], want: true },
    { name: 'outer pair swapped', got: [[3], [1, 2]], expected: [[1, 2], [3]], want: false },
  ])('unordered-inner: $name', ({ got, expected, want }) => {
    expect(matches(got, expected, 'unordered-inner')).toBe(want);
  });
});
