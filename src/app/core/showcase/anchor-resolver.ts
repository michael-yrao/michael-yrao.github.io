import { Step, StepAnchor } from '../models/algorithm.model';
import { DisplayRow } from './display';

export interface RowRange {
  readonly start: number;
  readonly end: number;
}

export interface AnchorResolution {
  readonly range: RowRange | null;
  readonly reason: string | null;
}

export type ResolvedStep = AnchorResolution;

/** `anchor.nth` is 1-based (the first hit is `nth: 1`). */
const FIRST_HIT = 1;

interface MatchResult {
  readonly index: number | null;
  readonly reason: string | null;
}

function codeRowIndices(rows: readonly DisplayRow[]): number[] {
  return rows.reduce<number[]>(
    (indices, row, i) => (row.kind === 'code' ? [...indices, i] : indices),
    [],
  );
}

/** Resolves one `{ match, nth? }` half of an anchor to a single row index. Matching is
 *  `row.text.trim().includes(match)` over `code` rows only — gap rows never match. Without
 *  `nth`, exactly one hit is required. */
function resolveMatch(
  rows: readonly DisplayRow[],
  match: string,
  nth: number | undefined,
): MatchResult {
  const hits = codeRowIndices(rows).filter((i) => rows[i].text.trim().includes(match));

  if (nth !== undefined) {
    const hitIndex = hits[nth - FIRST_HIT];
    if (hitIndex === undefined) {
      return {
        index: null,
        reason: `'${match}' has no match at nth=${nth} (${hits.length} hit(s))`,
      };
    }
    return { index: hitIndex, reason: null };
  }

  if (hits.length === 0) return { index: null, reason: `no line matches '${match}'` };
  if (hits.length > 1) {
    return {
      index: null,
      reason: `'${match}' matches ${hits.length} lines — use a longer substring or nth`,
    };
  }
  return { index: hits[0], reason: null };
}

/** Resolves a `StepAnchor` to a row range. A bare anchor resolves to a single-row range; a
 *  `to` anchor resolves the end independently and requires it to land at or after the start. */
export function resolveAnchor(rows: readonly DisplayRow[], anchor: StepAnchor): AnchorResolution {
  const start = resolveMatch(rows, anchor.match, anchor.nth);
  if (start.index === null) return { range: null, reason: start.reason };

  if (!anchor.to) return { range: { start: start.index, end: start.index }, reason: null };

  const end = resolveMatch(rows, anchor.to.match, anchor.to.nth);
  if (end.index === null) return { range: null, reason: end.reason };
  if (end.index < start.index) {
    return { range: null, reason: `'${anchor.to.match}' resolves before '${anchor.match}'` };
  }
  return { range: { start: start.index, end: end.index }, reason: null };
}

export function resolveSteps(rows: readonly DisplayRow[], steps: readonly Step[]): ResolvedStep[] {
  return steps.map((step) =>
    step.anchor ? resolveAnchor(rows, step.anchor) : { range: null, reason: 'step has no anchor' },
  );
}
