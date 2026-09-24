import { ShowcaseEntry, ShowcaseSegment, ShowcaseSegmentKind } from '../models/showcase.model';

const SEGMENT_KINDS: readonly ShowcaseSegmentKind[] = ['container', 'attempt', 'helper'];

const ENTRY_STRING_FIELDS: readonly (keyof ShowcaseEntry)[] = ['key', 'variant', 'file', 'symbol'];
const ENTRY_NULLABLE_STRING_FIELDS: readonly (keyof ShowcaseEntry)[] = [
  'title',
  'url',
  'attemptDate',
];

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/** A segment's `lines` must be exactly as long as its own `[startLine, endLine]` range — the
 *  invariant `export_showcase.py --check` enforces on the cse-progress side. */
function hasConsistentLineCount(
  segment: Pick<ShowcaseSegment, 'startLine' | 'endLine' | 'lines'>,
): boolean {
  const expectedLineCount = segment.endLine - segment.startLine + 1;
  return segment.lines.length === expectedLineCount;
}

/** Exported so `big-o-validation.ts` (and any other segment-bearing contract) can reuse the
 *  same structural check rather than duplicating it. */
export function isShowcaseSegment(value: unknown): value is ShowcaseSegment {
  if (typeof value !== 'object' || value === null) return false;
  const segment = value as Partial<ShowcaseSegment>;

  if (!SEGMENT_KINDS.includes(segment.kind as ShowcaseSegmentKind)) return false;
  if (typeof segment.symbol !== 'string') return false;
  if (typeof segment.startLine !== 'number' || typeof segment.endLine !== 'number') return false;
  if (!isStringArray(segment.lines)) return false;

  return hasConsistentLineCount({
    startLine: segment.startLine,
    endLine: segment.endLine,
    lines: segment.lines,
  });
}

function hasValidStringFields(entry: Partial<ShowcaseEntry>): boolean {
  return ENTRY_STRING_FIELDS.every((field) => typeof entry[field] === 'string');
}

function isStringOrNull(v: unknown): boolean {
  return v === null || typeof v === 'string';
}

function hasValidNullableFields(entry: Partial<ShowcaseEntry>): boolean {
  return ENTRY_NULLABLE_STRING_FIELDS.every((field) => isStringOrNull(entry[field]));
}

/** Structural guard for one showcase entry: string `key`/`variant`/`file`/`symbol`, number
 *  `lcNumber`, `title`/`url`/`attemptDate` each string-or-null (a title is null only when
 *  cse-progress found neither a header nor a tracker title), and every segment's `lines`
 *  length matching its own `[startLine, endLine]` range. Pure and Angular-free so the CI
 *  groundedness check can reuse it, not just `ShowcaseService`. */
export function isShowcaseEntry(value: unknown): value is ShowcaseEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<ShowcaseEntry>;

  if (!hasValidStringFields(entry)) return false;
  if (typeof entry.lcNumber !== 'number') return false;
  if (!hasValidNullableFields(entry)) return false;
  if (!Array.isArray(entry.segments)) return false;

  return entry.segments.every(isShowcaseSegment);
}
