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

/** Whether a returned value matches the expected one under the problem's compare mode.
 *  Never mutates either input (sorting happens on derived copies). */
export function matches(got: unknown, expected: unknown, mode: CompareMode): boolean {
  if (mode === 'exact') return canonical(got) === canonical(expected);
  if (!Array.isArray(got) || !Array.isArray(expected)) return false;
  return sameMultiset(got, expected, mode === 'unordered' ? canonical : canonicalUnordered);
}
