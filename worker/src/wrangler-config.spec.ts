import { parse } from 'smol-toml';
import { describe, expect, it } from 'vitest';
import baseToml from '../wrangler.toml?raw';
import coachToml from '../wrangler.coach.toml?raw';

type Table = Record<string, unknown>;

const ENTRY_MODULE_KEY = 'main';
const COACH_ONLY_KEYS = ['containers', 'durable_objects', 'migrations'];

function isTable(value: unknown): value is Table {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A string for a value that does not depend on key order, so two parsed values compare by content. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    isTable(inner) ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a.localeCompare(b))) : inner,
  );
}

function isSame(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

/** A base value is present in the coach config: tables entry by entry, arrays of tables element by element. */
function isContained(base: unknown, coach: unknown): boolean {
  if (Array.isArray(base)) {
    return Array.isArray(coach) && base.every((element) => coach.some((other) => isSame(element, other)));
  }
  if (isTable(base)) {
    return isTable(coach) && Object.entries(base).every(([key, value]) => isSame(value, coach[key]));
  }
  return isSame(base, coach);
}

describe('wrangler configs', () => {
  const base = parse(baseToml);
  const coach = parse(coachToml);

  it('the coach config contains the base config, apart from the entry module', () => {
    const drifted = Object.entries(base)
      .filter(([key]) => key !== ENTRY_MODULE_KEY)
      .filter(([key, value]) => !isContained(value, coach[key]))
      .map(([key]) => key);
    expect(drifted).toEqual([]);
  });

  it('the base config declares no container, Durable Object or migration', () => {
    expect(Object.keys(base).filter((key) => COACH_ONLY_KEYS.includes(key))).toEqual([]);
  });
});
