import type { Comfort, ProblemProgress } from '../../../core/models/progress.model';

const NO_LEVEL = -1;

/** One row per problem number. When two rows share a number the higher level wins, and a row
 *  with no level loses to one that has it. */
export function rowByNumber(details: readonly ProblemProgress[]): ReadonlyMap<number, ProblemProgress> {
  const best = new Map<number, ProblemProgress>();
  for (const row of details) {
    const held = best.get(row.lcNumber);
    if (held === undefined || (row.level ?? NO_LEVEL) > (held.level ?? NO_LEVEL)) {
      best.set(row.lcNumber, row);
    }
  }
  return best;
}

/** Each problem number's comfort, from the row `rowByNumber` picks. */
export function comfortByNumber(details: readonly ProblemProgress[]): ReadonlyMap<number, Comfort> {
  return new Map([...rowByNumber(details)].map(([number, row]) => [number, row.comfort]));
}
