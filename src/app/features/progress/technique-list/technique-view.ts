import { Comfort, ProblemProgress, Technique } from '../../../core/models/progress.model';

/** The Mastery tab's technique-breadth drill: a flat list of rows, or a technique map (nodes
 *  joined by prerequisite edges, one swimlane per family) grouped the same way (tier -> family)
 *  for the list, and as one graph for the map. Persisted per viewer so a reload keeps the last
 *  choice. */
export type TechniqueView = 'list' | 'map';

export const TECHNIQUE_VIEW_STORAGE_KEY = 'po.progress.techniqueView';

/** 'map' is the current value; the retired layered-DAG skill tree's 'tree' reads as 'map' for
 *  a viewer whose localStorage still carries it. Anything else falls back to 'list', the
 *  default — a corrupted or old-shape value must never crash the tab. */
export function parseStoredView(raw: string | null): TechniqueView {
  return raw === 'map' || raw === 'tree' ? 'map' : 'list';
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
const GRAD_RANK = COMFORT_ORDER.indexOf('🎓');

/** A comfort's position in COMFORT_ORDER (weakest = 0), or -1 for null — never NaN, so
 *  callers can compare ranks with plain `<`/`>=`. */
export function comfortRank(comfort: Comfort | null): number {
  return comfort === null ? -1 : COMFORT_ORDER.indexOf(comfort);
}

export interface TechniqueStats {
  /** The most recent rep date (ISO, string-compare order) across this technique's matched
   *  problems, or null when no matched problem has any repDates (or details isn't loaded). */
  readonly lastTouched: string | null;
  /** Count of matched problems at 🟢 or better. */
  readonly greenCount: number;
  /** Count of matched problems at 🎓 or 🏆 — the skill tree's mastery fallback for an older
   *  contract with no `Technique.graduatedCount` (see `isMastered`). */
  readonly graduatedCount: number;
  /** The least-mastered comfort among matched problems, or null when none matched. */
  readonly weakestComfort: Comfort | null;
}

const EMPTY_STATS: TechniqueStats = {
  lastTouched: null,
  greenCount: 0,
  graduatedCount: 0,
  weakestComfort: null,
};

/** Derives a technique's detail-panel stats by joining its problems[] (LC numbers) against
 *  the fetched details (byNumber) — pure, never mutates either input. Mirrors
 *  TechniqueListComponent.problemsFor's join, folded into summary numbers instead of a full
 *  problem list. */
export function deriveTechniqueStats(
  t: Technique,
  byNumber: ReadonlyMap<number, ProblemProgress>,
): TechniqueStats {
  const matched = t.problems.map((n) => byNumber.get(n)).filter((p): p is ProblemProgress => !!p);
  if (matched.length === 0) return EMPTY_STATS;

  const repDates = matched.flatMap((p) => p.repDates);
  const lastTouched = repDates.length ? repDates.reduce((max, d) => (d > max ? d : max)) : null;
  const greenCount = matched.filter((p) => comfortRank(p.comfort) >= GREEN_RANK).length;
  const graduatedCount = matched.filter((p) => comfortRank(p.comfort) >= GRAD_RANK).length;
  const weakestComfort = matched.reduce<Comfort>(
    (weakest, p) => (comfortRank(p.comfort) < comfortRank(weakest) ? p.comfort : weakest),
    matched[0].comfort,
  );

  return { lastTouched, greenCount, graduatedCount, weakestComfort };
}

/** The skill tree's two-state color rule: solid ("mastered") once the technique's graduated
 *  (🎓/🏆) problem count reaches its declared `minProblems`, neutral otherwise — no gradient,
 *  no comfort ladder. Prefers the technique's own `graduatedCount` (gamify.py's tally, correct
 *  even before `details` has loaded); falls back to `stats.graduatedCount` (derived from
 *  `details` once loaded) for an older contract predating that field, and to 0 before either
 *  is available. */
export function isMastered(t: Technique, stats: TechniqueStats | undefined): boolean {
  const graduatedCount = t.graduatedCount ?? stats?.graduatedCount ?? 0;
  return graduatedCount >= t.minProblems;
}

// ── Done/planned bar (Sep 26, 2026 — ratio moved from problemCount/minProblems to
// done/planned, with the old threshold shown as a tick instead of the denominator) ─────────
const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

function clampPercent(value: number): number {
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value));
}

/** y — every problem planned for the technique, done ones included. Prefers the exported
 *  `plannedTotal`; falls back to `problemCount + planned.length` for an older contract
 *  predating it, and to `problemCount` alone when `planned` is absent too. */
export function plannedTotalOf(t: Technique): number {
  if (t.plannedTotal !== undefined) return t.plannedTotal;
  return t.problemCount + (t.planned?.length ?? 0);
}

/** z — problems credited to this technique with at least one rep, done ones included
 *  (cse-progress's own `problemCount` tally). */
export function doneOf(t: Technique): number {
  return t.problemCount;
}

/** How many more done problems would reach the coverage threshold (x − z) — never negative;
 *  0 once the technique is covered. */
export function remainingToCover(t: Technique): number {
  return Math.max(0, t.minProblems - doneOf(t));
}

/** covered once done (z) reaches the threshold (x); notBegun before any problem is done;
 *  inProgress in between. `z >= x` wins even when the threshold sits beyond what's planned
 *  (`isThresholdBeyondPlan`) — a covered technique never reads as merely in progress. */
export type CoverageState = 'covered' | 'inProgress' | 'notBegun';

/** The single source both the bar fill's colour class and the status chip's colour class
 *  read from (Change 2, Sep 27, 2026) — so the two can never disagree about a technique's
 *  coverage. */
export function coverageState(t: Technique): CoverageState {
  const done = doneOf(t);
  if (done >= t.minProblems) return 'covered';
  return done > 0 ? 'inProgress' : 'notBegun';
}

/** The done/planned bar's fill, as a percent of the bar's own width. 0 when nothing is
 *  planned (`plannedTotalOf` is 0); clamped to [0, 100] so a contract inconsistency (more done
 *  than planned) never overflows the bar. */
export function barFillPercent(t: Technique): number {
  const planned = plannedTotalOf(t);
  if (planned <= 0) return MIN_PERCENT;
  return clampPercent((doneOf(t) / planned) * MAX_PERCENT);
}

/** Where the coverage-threshold tick sits on the same bar, as a percent. Clamped to 100 so a
 *  threshold beyond what's planned (`isThresholdBeyondPlan`) still draws at the bar's end
 *  instead of running off it; 0 when nothing is planned (the bar itself isn't rendered then). */
export function thresholdPercent(t: Technique): number {
  const planned = plannedTotalOf(t);
  if (planned <= 0) return MIN_PERCENT;
  return clampPercent((t.minProblems / planned) * MAX_PERCENT);
}

/** True when the coverage threshold (x) asks for more problems than are even planned (y) — a
 *  real finding for the coach, surfaced as `coverageTitle`'s honest "only N planned" clause
 *  rather than hidden. */
export function isThresholdBeyondPlan(t: Technique): boolean {
  return t.minProblems > plannedTotalOf(t);
}

/** The bare "X of Y planned problem(s) done" sentence — the first clause of `coverageTitle`,
 *  and the Map node's SVG `<title>` before Change 3 folded its own coverage clause in.
 *  Singular "problem" only when exactly one is planned. */
export function ratioTitle(t: Technique): string {
  const planned = plannedTotalOf(t);
  const noun = planned === 1 ? 'problem' : 'problems';
  return `${doneOf(t)} of ${planned} planned ${noun} done`;
}

// ── Coverage hover (Sep 27, 2026 — Change 3: the "covered at N" / bar-caption prose moves off
// the row and into a hover, one sentence built from the same numbers) ──────────────────────
/** The coverage hover's one sentence, read on hovering or focusing a row (Change 3). Built on
 *  `ratioTitle`'s bare clause, plus a second clause naming the coverage state — "covered
 *  (X needed)" once `coverageState` is 'covered', otherwise "N more to be covered (X needed)" —
 *  and, only when the threshold asks for more than is even planned (`isThresholdBeyondPlan`,
 *  the same finding the removed bar caption surfaced), a third, honest clause naming how much
 *  is planned. Nothing planned at all (y = 0) short-circuits to a bare admission instead. */
export function coverageTitle(t: Technique): string {
  const planned = plannedTotalOf(t);
  if (planned <= 0) return 'nothing planned yet';

  const base = ratioTitle(t);
  if (coverageState(t) === 'covered') {
    return `${base} · covered (${t.minProblems} needed)`;
  }

  const needsClause = `${base} · ${remainingToCover(t)} more to be covered (${t.minProblems} needed)`;
  return isThresholdBeyondPlan(t) ? `${needsClause} · only ${planned} planned` : needsClause;
}

const TRAILING_PARENTHETICAL = /\s*\([^()]*\)\s*$/;

/** Strips a trailing "(...)" qualifier for a tight label, e.g. "Two Pointers (opposite
 *  ends)" -> "Two Pointers". A name with no trailing parenthetical is returned unchanged
 *  (aside from trimming). */
export function shortName(name: string): string {
  return name.replace(TRAILING_PARENTHETICAL, '').trim();
}
