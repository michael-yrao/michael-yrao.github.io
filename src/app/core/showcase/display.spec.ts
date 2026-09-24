import { buildDisplay } from './display';
import { ShowcaseEntry, ShowcaseSegment } from '../models/showcase.model';

function makeEntry(segments: ShowcaseSegment[]): ShowcaseEntry {
  return {
    key: '733:bfs',
    lcNumber: 733,
    variant: 'bfs',
    title: 'Flood Fill',
    url: null,
    file: 'dsa/leetcode/graphs/733_flood_fill.py',
    symbol: 'floodFill_20260729',
    attemptDate: '2026-07-29',
    segments,
  };
}

const CONTAINER: ShowcaseSegment = {
  kind: 'container',
  symbol: 'Solution',
  startLine: 1,
  endLine: 1,
  lines: ['class Solution:'],
};

describe('buildDisplay', () => {
  it('inserts one gap row between non-contiguous segments', () => {
    const attempt: ShowcaseSegment = {
      kind: 'attempt',
      symbol: 'floodFill',
      startLine: 3,
      endLine: 4,
      lines: ['    def floodFill():', '        return image'],
    };

    const rows = buildDisplay(makeEntry([CONTAINER, attempt]));

    expect(rows.map((r) => r.kind)).toEqual(['code', 'gap', 'code', 'code']);
    expect(rows[1]).toEqual({ text: '', sourceLine: null, kind: 'gap' });
  });

  it('inserts no gap when segments are contiguous', () => {
    const attempt: ShowcaseSegment = {
      kind: 'attempt',
      symbol: 'floodFill',
      startLine: 2,
      endLine: 3,
      lines: ['    def floodFill():', '        return image'],
    };

    const rows = buildDisplay(makeEntry([CONTAINER, attempt]));

    expect(rows.map((r) => r.kind)).toEqual(['code', 'code', 'code']);
  });

  it('preserves each row real source line number', () => {
    const attempt: ShowcaseSegment = {
      kind: 'attempt',
      symbol: 'floodFill',
      startLine: 10,
      endLine: 12,
      lines: ['a', 'b', 'c'],
    };

    const rows = buildDisplay(makeEntry([attempt]));

    expect(rows.map((r) => r.sourceLine)).toEqual([10, 11, 12]);
  });

  it('sorts out-of-order segments defensively, without mutating the input', () => {
    const second: ShowcaseSegment = {
      kind: 'attempt',
      symbol: 'b',
      startLine: 2,
      endLine: 2,
      lines: ['second'],
    };
    const first: ShowcaseSegment = {
      kind: 'container',
      symbol: 'a',
      startLine: 1,
      endLine: 1,
      lines: ['first'],
    };
    const entry = makeEntry([second, first]);
    const originalOrder = [...entry.segments];

    const rows = buildDisplay(entry);

    expect(rows.map((r) => r.text)).toEqual(['first', 'second']);
    expect(entry.segments).toEqual(originalOrder); // input segments array untouched
  });

  it('accepts any segment-bearing object, not just a full ShowcaseEntry (e.g. a BigOEntry)', () => {
    // Only `segments` — none of ShowcaseEntry's other required fields — proving the
    // `Pick<ShowcaseEntry, 'segments'>` parameter type actually admits a slimmer shape.
    const bigOShaped = { segments: [CONTAINER] };

    const rows = buildDisplay(bigOShaped);

    expect(rows.map((r) => r.text)).toEqual(['class Solution:']);
  });
});
