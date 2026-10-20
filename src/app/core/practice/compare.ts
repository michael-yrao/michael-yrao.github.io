import { CompareMode } from '../models/practice.model';

/** Stable JSON text with object keys sorted, so equal values serialise identically. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    const members = Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`);
    return `{${members.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

/** Canonical text of an element with its own list order ignored (one level, for nested mode). */
function canonicalUnordered(value: unknown): string {
  if (!Array.isArray(value)) return canonical(value);
  return canonical(value.map(canonical).sort());
}

function sortedKeys(list: readonly unknown[], keyOf: (v: unknown) => string): string[] {
  return list.map(keyOf).sort();
}

function sameMultiset(
  got: readonly unknown[],
  expected: readonly unknown[],
  keyOf: (v: unknown) => string,
): boolean {
  if (got.length !== expected.length) return false;
  const gotKeys = sortedKeys(got, keyOf);
  const expectedKeys = sortedKeys(expected, keyOf);
  return gotKeys.every((key, i) => key === expectedKeys[i]);
}

const ANY_OF_KEY = 'anyOf';

/** An expected of exactly `{anyOf: [...]}` with at least one alternative. */
export function isAnyOf(value: unknown): value is { readonly anyOf: readonly unknown[] } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  const alternatives = (value as Record<string, unknown>)[ANY_OF_KEY];
  return keys.length === 1 && keys[0] === ANY_OF_KEY && Array.isArray(alternatives) && alternatives.length > 0;
}

/** One op's output: a scalar pair is plain equality in every mode (an ordering mode only
 *  applies to lists), anything else goes through `matches`. */
function matchesOpOutput(got: unknown, expected: unknown, mode: CompareMode): boolean {
  if (Array.isArray(got) || Array.isArray(expected) || isAnyOf(expected)) return matches(got, expected, mode);
  return canonical(got) === canonical(expected);
}

/** Whether a returned value matches the expected one under the problem's compare mode.
 *  An `{anyOf: [...]}` expected matches when any alternative does; an expected list holding one
 *  (an ops case) compares element by element. Never mutates either input (sorting happens on
 *  derived copies). */
export function matches(got: unknown, expected: unknown, mode: CompareMode): boolean {
  if (isAnyOf(expected)) return expected.anyOf.some((alternative) => matchesOpOutput(got, alternative, mode));
  if (Array.isArray(expected) && expected.some(isAnyOf)) {
    return (
      Array.isArray(got) &&
      got.length === expected.length &&
      expected.every((want, index) => matchesOpOutput(got[index], want, mode))
    );
  }
  if (mode === 'exact') return canonical(got) === canonical(expected);
  if (!Array.isArray(got) || !Array.isArray(expected)) return false;
  if (mode === 'unordered-inner') {
    return got.length === expected.length && got.every((item, i) => canonicalUnordered(item) === canonicalUnordered(expected[i]));
  }
  return sameMultiset(got, expected, mode === 'unordered' ? canonical : canonicalUnordered);
}
