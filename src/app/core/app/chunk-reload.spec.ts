import { beforeEach, describe, expect, it, vi } from 'vitest';

import { isChunkLoadError, reloadTo, resetChunkReloadForTests, shouldReload } from './chunk-reload';

describe('reloadTo', () => {
  beforeEach(resetChunkReloadForTests);

  it('a second reload while one is in flight is ignored; the first target wins', () => {
    const assign = vi.fn();
    reloadTo('/first', assign);
    reloadTo('/second', assign);
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith('/first');
  });
});

describe('isChunkLoadError', () => {
  const cases: [string, unknown, boolean][] = [
    ['Firefox', new TypeError('error loading dynamically imported module: https://x/chunk-a.js'), true],
    ['Chrome', new TypeError('Failed to fetch dynamically imported module: https://x/chunk-a.js'), true],
    ['Safari', new TypeError('Importing a module script failed.'), true],
    ['unrelated TypeError', new TypeError('x is undefined'), false],
    ['non-error value', 'dynamically imported module', false],
  ];
  it.each(cases)('%s', (_label, error, expected) => {
    expect(isChunkLoadError(error)).toBe(expected);
  });
});

describe('shouldReload', () => {
  const NOW = 1_000_000;
  const stored = (target: string, agoMs: number) => JSON.stringify({ target, at: NOW - agoMs });
  const cases: [string, string | null, boolean][] = [
    ['nothing stored', null, true],
    ['same target 5s ago', stored('/a', 5_000), false],
    ['same target 15s ago', stored('/a', 15_000), true],
    ['different target 1s ago', stored('/b', 1_000), true],
    ['malformed JSON', '{not json', true],
  ];
  it.each(cases)('%s', (_label, value, expected) => {
    expect(shouldReload('/a', value, NOW)).toBe(expected);
  });
});
