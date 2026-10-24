import { CompareMode } from '../models/practice.model';
import { matches } from './compare';

describe('matches with a tolerance', () => {
  const TOLERANCE = 1e-5;
  const rows: { name: string; got: unknown; expected: unknown; mode: CompareMode; want: boolean }[] = [
    { name: 'within', got: 3.000001, expected: 3, mode: 'exact', want: true },
    { name: 'outside', got: 3.001, expected: 3, mode: 'exact', want: false },
    { name: 'nested lists', got: [[1.000001, 2], [3]], expected: [[1, 2], [3]], mode: 'exact', want: true },
    { name: 'true is not 1', got: true, expected: 1, mode: 'exact', want: false },
    { name: 'unordered numbers sort numerically', got: [2, 1.000001], expected: [1, 2], mode: 'unordered', want: true },
    { name: 'unordered-nested inner and outer', got: [[2.000001, 1], [0]], expected: [[0], [1, 2]], mode: 'unordered-nested', want: true },
    { name: 'anyOf: a later alternative within', got: 0.5000001, expected: { anyOf: [1, 0.5] }, mode: 'exact', want: true },
    { name: 'anyOf per op: an op within', got: [null, 1.000001], expected: [null, { anyOf: [1, 2] }], mode: 'exact', want: true },
  ];

  it.each(rows)('$name', ({ got, expected, mode, want }) => {
    const gotBefore = structuredClone(got);

    expect(matches(got, expected, mode, TOLERANCE)).toBe(want);
    expect(got).toEqual(gotBefore);
  });
});

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
