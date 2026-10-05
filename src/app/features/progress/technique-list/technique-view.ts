import { Comfort, ProblemProgress, Technique } from '../../../core/models/progress.model';

/** The Mastery tab's technique-breadth drill: a flat list of rows grouped tier -> family, or a
 *  status board (four coverage columns, sortable/filterable). Persisted per viewer so a reload
 *  keeps the last choice. */
export type TechniqueView = 'list' | 'board';

export const TECHNIQUE_VIEW_STORAGE_KEY = 'po.progress.techniqueView';

/** 'board' is the only value that isn't 'list' — the retired technique map ('map', and its own
 *  retired predecessor 'tree') both fall back to 'list', same as any other corrupted or
 *  old-shape value. A stored value must never crash the tab. */
export function parseStoredView(raw: string | null): TechniqueView {
  return raw === 'board' ? 'board' : 'list';
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
 *  (pie-chart.component.scss's .seg-* vocabulary) already encodes. */
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

// ── Done/planned ratio (Sep 26, 2026 — ratio moved from problemCount/minProblems to
// done/planned; Sep 27, 2026 — `ratioDenominatorOf` raises that denominator to the threshold
// itself whenever fewer problems are planned than the technique needs, so the ratio never
// implies less is expected than actually is; Sep 27, 2026 — the bar/tick this section once fed
// is replaced by `coverageBoxes`, below, one box per unit of the denominator) ──────────────────

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

/** The ratio's actual denominator: the greater of what's planned (y) and the coverage
 *  threshold (x). A technique planned for fewer problems than its own threshold (y < x) would
 *  otherwise show a ratio — and a bar fill/tick — that implies less is expected of it than
 *  really is; raising the denominator to the threshold keeps the ratio honest (e.g. 0/1 rather
 *  than 0/0 for a technique with nothing planned yet but a threshold of 1). Used for the row
 *  ratio, the bar fill, the tick, and the progressbar's `aria-valuemax` — never for
 *  `plannedTotalOf`, `isThresholdBeyondPlan` or the hover's "only N planned" clause, which stay
 *  keyed on what's actually planned so the hover keeps naming that honestly. */
export function ratioDenominatorOf(t: Technique): number {
  return Math.max(plannedTotalOf(t), t.minProblems);
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

/** The single source both a coverage box's colour class and the status chip's colour class
 *  read from (Change 2, Sep 27, 2026) — so the two can never disagree about a technique's
 *  coverage. */
export function coverageState(t: Technique): CoverageState {
  const done = doneOf(t);
  if (done >= t.minProblems) return 'covered';
  return done > 0 ? 'inProgress' : 'notBegun';
}

/** One box per unit of `ratioDenominatorOf`, in this fixed order, carrying two independent
 *  marks (Sep 27, 2026 — replaces the single-colour `'done' | 'needed' | 'extra'` box, which
 *  painted every done box the technique's own coverage colour even when some of its problems
 *  were still shaky):
 *  - `fill` — how that problem is going: `'clean'` for a done problem with no outstanding
 *    shakiness, `'shaky'` for a done problem still 🟡/🔴 (`t.uncleanCount`, oldest-first has no
 *    meaning here — it's a plain count), `'empty'` for a box beyond what's done.
 *  - `countsTowardCovered` — true while the box's index is still within `t.minProblems`,
 *    regardless of fill; false once the box sits beyond the threshold (a planned-extra box, or a
 *    done box beyond it).
 *  `done` and `shaky` are each capped so neither can go negative nor exceed what's actually
 *  done, so a contract inconsistency (more `uncleanCount` than `problemCount`, or more done than
 *  the denominator) never yields a negative count. */
export interface CoverageBox {
  readonly fill: 'clean' | 'shaky' | 'empty';
  readonly countsTowardCovered: boolean;
}

function fillFor(index: number, clean: number, done: number): CoverageBox['fill'] {
  if (index < clean) return 'clean';
  if (index < done) return 'shaky';
  return 'empty';
}

export function coverageBoxes(t: Technique): readonly CoverageBox[] {
  const denominator = ratioDenominatorOf(t);
  const done = Math.min(doneOf(t), denominator);
  const shaky = Math.min(Math.max(t.uncleanCount ?? 0, 0), done);
  const clean = done - shaky;

  return Array.from({ length: denominator }, (_, index) => ({
    fill: fillFor(index, clean, done),
    countsTowardCovered: index < t.minProblems,
  }));
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

/** The threshold clause inside `coverageTitle`'s parenthetical: "N needed" by default, or a
 *  plain-language breakdown once the coach exports WHY the threshold sits above its ordinary
 *  floor — `coverageFloor` (the technique's plain minimum) plus `uncleanCount` (extra reps
 *  required while that many matched problems are still 🟡/🔴 "shaky", not yet clean). Optional,
 *  additive: either field absent, or `uncleanCount` not positive, and the sentence is
 *  unchanged. */
function neededClause(t: Technique): string {
  const { coverageFloor, uncleanCount } = t;
  if (coverageFloor === undefined || uncleanCount === undefined || uncleanCount <= 0) {
    return `${t.minProblems} needed`;
  }
  const subject = uncleanCount === 1 ? 'problem is' : 'problems are';
  return `${t.minProblems} needed: ${coverageFloor}, plus ${uncleanCount} while ${uncleanCount} ${subject} still shaky`;
}

// ── Coverage sentence (Change 3, Sep 27, 2026; kept for the technique map's SVG <title> after
// Sep 27, 2026 replaced the list/board's own hover and bar caption with `coverageBoxes` —
// technique-map.component.ts still imports this one) ────────────────────────────────────────
/** The technique map's per-node `<title>` sentence (Change 3). Built on `ratioTitle`'s bare
 *  clause, plus a second clause naming the coverage state — "covered (X needed)" once
 *  `coverageState` is 'covered', otherwise "N more to be covered (X needed)" — and, only when
 *  the threshold asks for more than is even planned (`isThresholdBeyondPlan`), a third, honest
 *  clause naming how much is planned. Nothing planned at all (y = 0) short-circuits to a bare
 *  admission instead. The "(X needed)" clause itself is `neededClause`, which explains the
 *  threshold's own breakdown when the coach exports `coverageFloor`/`uncleanCount`. */
export function coverageTitle(t: Technique): string {
  const planned = plannedTotalOf(t);
  if (planned <= 0) return 'nothing planned yet';

  const base = ratioTitle(t);
  if (coverageState(t) === 'covered') {
    return `${base} · covered (${neededClause(t)})`;
  }

  const needsClause = `${base} · ${remainingToCover(t)} more to be covered (${neededClause(t)})`;
  return isThresholdBeyondPlan(t) ? `${needsClause} · only ${planned} planned` : needsClause;
}

const TRAILING_PARENTHETICAL = /\s*\([^()]*\)\s*$/;

/** Strips a trailing "(...)" qualifier for a tight label, e.g. "Two Pointers (opposite
 *  ends)" -> "Two Pointers". A name with no trailing parenthetical is returned unchanged
 *  (aside from trimming). */
export function shortName(name: string): string {
  return name.replace(TRAILING_PARENTHETICAL, '').trim();
}

// ── Status board (Sep 27, 2026 — replaces the Map view) ─────────────────────────────────────
/** The board's four columns, most- to least-advanced order left to the caller (the component
 *  owns the fixed column order/labels, same as it already owns `TIER_ORDER`/`TIER_LABEL`). */
export type TechniqueColumn = 'notStarted' | 'inProgress' | 'covered' | 'mastered';

/** A technique's board column: `isMastered` wins outright (a mastered technique never reads as
 *  merely "covered"); otherwise the column mirrors `coverageState` one-for-one. */
export function columnFor(t: Technique, stats: TechniqueStats | undefined): TechniqueColumn {
  if (isMastered(t, stats)) return 'mastered';
  switch (coverageState(t)) {
    case 'covered':
      return 'covered';
    case 'inProgress':
      return 'inProgress';
    default:
      return 'notStarted';
  }
}

export type TechniqueSortKey = 'name' | 'coverage' | 'lastPracticed';

/** The Coverage sort's own ranking number: done ÷ `ratioDenominatorOf`, i.e. the same fraction
 *  the bar fill draws. 0 when the denominator is 0 (nothing planned and no threshold either) —
 *  never NaN. */
function coverageRatio(t: Technique): number {
  const denominator = ratioDenominatorOf(t);
  return denominator > 0 ? doneOf(t) / denominator : 0;
}

/** The board's sort comparator, for `Array.prototype.sort`. 'name' is a plain alphabetical
 *  sort; 'coverage' ranks highest coverage ratio first, name as tiebreak; 'lastPracticed' ranks
 *  the most recently touched technique first (by `stats.lastTouched`, ISO string-compare),
 *  with a technique untouched (or missing from `statsByName`, e.g. `details` not loaded yet)
 *  sorted after every touched one, name as tiebreak either way. */
export function compareTechniques(
  a: Technique,
  b: Technique,
  key: TechniqueSortKey,
  statsByName: ReadonlyMap<string, TechniqueStats>,
): number {
  if (key === 'coverage') {
    const diff = coverageRatio(b) - coverageRatio(a);
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  }
  if (key === 'lastPracticed') {
    const aTouched = statsByName.get(a.name)?.lastTouched ?? null;
    const bTouched = statsByName.get(b.name)?.lastTouched ?? null;
    if (aTouched === null && bTouched === null) return a.name.localeCompare(b.name);
    if (aTouched === null) return 1;
    if (bTouched === null) return -1;
    return bTouched === aTouched ? a.name.localeCompare(b.name) : bTouched.localeCompare(aTouched);
  }
  return a.name.localeCompare(b.name);
}
