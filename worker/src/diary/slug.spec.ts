import { describe, expect, it } from 'vitest';
import { MAX_SLUG_CHARS, slugify } from './slug';

const DATE = '2026-11-08';

describe('slugify', () => {
  const cases: ReadonlyArray<[string, string, string]> = [
    ['case and punctuation', 'The One Who Cannot Let Go!', 'the-one-who-cannot-let-go'],
    ['repeated separators and edges', '  --Lorem___  ipsum--  ', 'lorem-ipsum'],
    ['diacritics', 'Café', 'cafe'],
    ['empty title', '', DATE],
    ['non-ASCII only', '日記', DATE],
    ['over the limit, cut with no trailing dash', `${'a'.repeat(MAX_SLUG_CHARS - 1)} b`, 'a'.repeat(MAX_SLUG_CHARS - 1)],
  ];

  it.each(cases)('%s', (_name, title, expected) => {
    expect(slugify(title, DATE)).toBe(expected);
  });
});
