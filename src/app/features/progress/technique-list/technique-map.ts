import { Comfort, ProblemProgress, Technique } from '../../../core/models/progress.model';

/** The Mastery tab's technique-breadth drill: a flat list of rows, or a heatmap grid grouped
 *  the same way (tier -> family). Persisted per viewer so a reload keeps the last choice. */
export type TechniqueView = 'list' | 'map';

export const TECHNIQUE_VIEW_STORAGE_KEY = 'po.progress.techniqueView';

/** Anything but the literal 'map' falls back to 'list', the default — a corrupted or
 *  old-shape localStorage value must never crash the tab. */
export function parseStoredView(raw: string | null): TechniqueView {
  return raw === 'map' ? 'map' : 'list';
}

/** Reads the persisted view — try/catch as in `big-o-deck.ts`'s filter read, since
 *  localStorage can throw (private mode, blocked) or simply be absent. */
export function readStoredView(): TechniqueView {
  try {
    return parseStoredView(localStorage.getItem(TECHNIQUE_VIEW_STORAGE_KEY));
  } catch {
    return 'list';
  }
}

export function writeStoredView(view: TechniqueView): void {
  try {
    localStorage.setItem(TECHNIQUE_VIEW_STORAGE_KEY, view);
  } catch {
    // localStorage unavailable (private mode, blocked) — view stays in-memory only.
  }
}

/** Comfort tiers, weakest to strongest — the same progression the Mastery pipeline bar
 *  (segmented-bar.component.scss's .seg-* vocabulary) already encodes. */
export const COMFORT_ORDER: readonly Comfort[] = ['🔴', '🟡', '🟢', '🎓', '🏆'];

const GREEN_RANK = COMFORT_ORDER.indexOf('🟢');

/** A comfort's position in COMFORT_ORDER (weakest = 0), or -1 for null — never NaN, so
 *  callers can compare ranks with plain `<`/`>=`. */
export function comfortRank(comfort: Comfort | null): number {
  return comfort === null ? -1 : COMFORT_ORDER.indexOf(comfort);
}

export type ComfortClass = 'blank' | 'shaky' | 'clean' | 'grad' | 'retired' | 'none';

const COMFORT_CLASS: Readonly<Record<Comfort, ComfortClass>> = {
  '🔴': 'blank',
  '🟡': 'shaky',
  '🟢': 'clean',
  '🎓': 'grad',
  '🏆': 'retired',
};

/** The pipeline's .seg-* vocabulary, applied to a single technique's best comfort — 'none'
 *  for a not-started technique (bestComfort null). */
export function comfortClass(comfort: Comfort | null): ComfortClass {
  return comfort === null ? 'none' : COMFORT_CLASS[comfort];
}

export interface TechniqueStats {
  /** The most recent rep date (ISO, string-compare order) across this technique's matched
   *  problems, or null when no matched problem has any repDates (or details isn't loaded). */
  readonly lastTouched: string | null;
  /** Count of matched problems at 🟢 or better. */
  readonly greenCount: number;
  /** The least-mastered comfort among matched problems, or null when none matched. */
  readonly weakestComfort: Comfort | null;
}

const EMPTY_STATS: TechniqueStats = { lastTouched: null, greenCount: 0, weakestComfort: null };

/** Derives a technique's map-cell stats by joining its problems[] (LC numbers) against the
 *  fetched details (byNumber) — pure, never mutates either input. Mirrors
 *  TechniqueListComponent.problemsFor's join, folded into three summary numbers instead of a
 *  full problem list. */
export function deriveTechniqueStats(
  t: Technique,
  byNumber: ReadonlyMap<number, ProblemProgress>,
): TechniqueStats {
  const matched = t.problems.map((n) => byNumber.get(n)).filter((p): p is ProblemProgress => !!p);
  if (matched.length === 0) return EMPTY_STATS;

  const repDates = matched.flatMap((p) => p.repDates);
  const lastTouched = repDates.length ? repDates.reduce((max, d) => (d > max ? d : max)) : null;
  const greenCount = matched.filter((p) => comfortRank(p.comfort) >= GREEN_RANK).length;
  const weakestComfort = matched.reduce<Comfort>(
    (weakest, p) => (comfortRank(p.comfort) < comfortRank(weakest) ? p.comfort : weakest),
    matched[0].comfort,
  );

  return { lastTouched, greenCount, weakestComfort };
}

const TRAILING_PARENTHETICAL = /\s*\([^()]*\)\s*$/;

/** Strips a trailing "(...)" qualifier for the map cell's tight label, e.g.
 *  "Two Pointers (opposite ends)" -> "Two Pointers". A name with no trailing parenthetical
 *  is returned unchanged (aside from trimming). */
export function shortName(name: string): string {
  return name.replace(TRAILING_PARENTHETICAL, '').trim();
}
