import { ShowcaseEntry, ShowcaseSegment } from '../models/showcase.model';

export interface DisplayRow {
  readonly text: string;
  readonly sourceLine: number | null;
  readonly kind: 'code' | 'gap';
}

/** A segment is non-contiguous with the one before it when a source line was left out of the
 *  slice — that's when a gap row is inserted between them. */
function isNonContiguous(previous: ShowcaseSegment, next: ShowcaseSegment): boolean {
  return next.startLine > previous.endLine + 1;
}

function makeGapRow(): DisplayRow {
  return { text: '', sourceLine: null, kind: 'gap' };
}

function rowsForSegment(segment: ShowcaseSegment): DisplayRow[] {
  return segment.lines.map((text, i) => ({
    text,
    sourceLine: segment.startLine + i,
    kind: 'code' as const,
  }));
}

/** Flattens a showcase-shaped entry's segments into display rows, inserting one `gap` row
 *  wherever consecutive segments skip source lines. Rows keep their real source line numbers.
 *  Sorts a copy of `entry.segments` defensively; never mutates the entry. Takes only
 *  `segments` (not the full `ShowcaseEntry`) so callers with a differently-shaped but
 *  segment-bearing contract — e.g. `BigOEntry` — can reuse it without adapting. */
export function buildDisplay(entry: Pick<ShowcaseEntry, 'segments'>): DisplayRow[] {
  const segments = [...entry.segments].sort((a, b) => a.startLine - b.startLine);

  return segments.reduce<DisplayRow[]>((rows, segment, i) => {
    const previous = segments[i - 1];
    const withGap = previous && isNonContiguous(previous, segment) ? [...rows, makeGapRow()] : rows;
    return [...withGap, ...rowsForSegment(segment)];
  }, []);
}
