import { isShowcaseEntry } from './showcase-validation';
import { ShowcaseEntry } from '../models/showcase.model';

function validEntry(): ShowcaseEntry {
  return {
    key: '733:bfs',
    lcNumber: 733,
    variant: 'bfs',
    title: 'Flood Fill',
    url: 'https://leetcode.com/problems/flood-fill/',
    file: 'dsa/leetcode/graphs/733_flood_fill.py',
    symbol: 'floodFill_20260729',
    attemptDate: '2026-07-29',
    segments: [
      {
        kind: 'container',
        symbol: 'Solution',
        startLine: 39,
        endLine: 39,
        lines: ['class Solution:'],
      },
      {
        kind: 'attempt',
        symbol: 'floodFill_20260729',
        startLine: 41,
        endLine: 43,
        lines: ['    def floodFill_20260729(', '        pass', '        return image'],
      },
    ],
  };
}

describe('isShowcaseEntry', () => {
  it('accepts a well-formed entry', () => {
    expect(isShowcaseEntry(validEntry())).toBe(true);
  });

  it('accepts null title, url and attemptDate', () => {
    expect(isShowcaseEntry({ ...validEntry(), title: null, url: null, attemptDate: null })).toBe(
      true,
    );
  });

  it('rejects a non-string, non-null title', () => {
    expect(isShowcaseEntry({ ...validEntry(), title: 42 })).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isShowcaseEntry(null)).toBe(false);
    expect(isShowcaseEntry('733:bfs')).toBe(false);
  });

  it('rejects a missing/wrong-typed required string field', () => {
    const { key: _key, ...withoutKey } = validEntry();
    expect(isShowcaseEntry(withoutKey)).toBe(false);
    expect(isShowcaseEntry({ ...validEntry(), lcNumber: '733' })).toBe(false);
  });

  it('rejects when segments is missing or not an array', () => {
    expect(isShowcaseEntry({ ...validEntry(), segments: undefined })).toBe(false);
    expect(isShowcaseEntry({ ...validEntry(), segments: 'not-an-array' })).toBe(false);
  });

  it('rejects a segment whose lines length does not match its line range', () => {
    const entry = validEntry();
    const badSegment = { ...entry.segments[1], endLine: entry.segments[1].endLine + 1 }; // range now 3 lines longer than `lines`
    expect(isShowcaseEntry({ ...entry, segments: [entry.segments[0], badSegment] })).toBe(false);
  });

  it('rejects an unknown segment kind', () => {
    const entry = validEntry();
    const badSegment = { ...entry.segments[0], kind: 'bogus' };
    expect(isShowcaseEntry({ ...entry, segments: [badSegment] })).toBe(false);
  });

  it('rejects a segment with non-string lines', () => {
    const entry = validEntry();
    const badSegment = { ...entry.segments[0], lines: [1, 2] };
    expect(isShowcaseEntry({ ...entry, segments: [badSegment] })).toBe(false);
  });
});
