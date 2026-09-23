import { showcaseKey, indexEntries } from './showcase-key';
import { ShowcaseData, ShowcaseEntry } from '../models/showcase.model';

function makeEntry(overrides: Partial<ShowcaseEntry> = {}): ShowcaseEntry {
  return {
    key: '733:bfs',
    lcNumber: 733,
    variant: 'bfs',
    title: 'Flood Fill',
    url: 'https://leetcode.com/problems/flood-fill/',
    file: 'dsa/leetcode/graphs/733_flood_fill.py',
    symbol: 'floodFill_20260729',
    attemptDate: '2026-07-29',
    segments: [],
    ...overrides,
  };
}

describe('showcaseKey', () => {
  it('joins lcNumber and variant', () => {
    expect(showcaseKey({ lcNumber: 733 }, { variant: 'bfs' })).toBe('733:bfs');
  });

  it('returns null when the variant has no id', () => {
    expect(showcaseKey({ lcNumber: 733 }, { variant: '' })).toBeNull();
  });
});

describe('indexEntries', () => {
  it('indexes entries by key', () => {
    const data: ShowcaseData = {
      schemaVersion: 1,
      generatedAt: '2026-09-22',
      entries: [makeEntry()],
    };

    const index = indexEntries(data);

    expect(index.get('733:bfs')).toEqual(makeEntry());
    expect(index.get('missing:key')).toBeUndefined();
  });
});
