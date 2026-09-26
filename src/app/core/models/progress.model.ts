// The client-side mirror of the cse-coach progress contract (progress.schema.json,
// emitted by cse-progress/scripts/gamify.py). Kept in lockstep with that schema:
// SCHEMA_VERSION guards against rendering an incompatible file.

export const PROGRESS_SCHEMA_VERSION = 1;

export type Comfort = '🔴' | '🟡' | '🟢' | '🎓' | '🏆';

export interface TimelinePoint {
  date: string;
  comfort: Comfort | null; // null where a rep predates the schedule archive (activity dot)
  level: number | null; // comfort as an ordinal 0-4, for plotting
}

export interface ProblemProgress {
  lcNumber: number;
  title: string;
  url?: string | null;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  category?: string | null;
  comfort: Comfort;
  level: number | null;
  streak: number;
  nextReview?: string;
  /** Repo-relative path of the learner's own solution file (cse-progress gamify.py's
   *  `solution_path`, from `links.solution_files()`), or null when none exists yet. A path,
   *  never code — the Problems tab turns it into a `src` link to the GitHub blob. Optional so
   *  an older contract predating it still renders. */
  file?: string | null;
  repDates: string[];
  timeline: TimelinePoint[];
}

export interface RetiredProblem {
  lcNumber: number;
  title: string;
  retiredOn?: string;
}

export interface Pipeline {
  blank: number;
  shaky: number;
  clean: { s0: number; s1: number; s2plus: number; total: number };
  graduated: number;
  retired: number;
}

export interface Streak {
  current: number;
  longest: number;
  lastStudyDay: string | null;
  studyDays: number;
  restDayAllowance: number;
}

export interface Coverage {
  total: number;
  started: number;
  noGreen: number;
  thin: number;
  variantGaps: number;
}

export interface OnSchedule {
  totalActive: number;
  dueToday: number;
  overdue: number;
}

export interface Badge {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  earned: boolean;
}

/** Curriculum tier for the honest technique-breadth denominator (Sep 21, 2026): 'core' =
 *  already-started NC150/pattern-doc techniques; 'dp' = the not-yet-started DP framework
 *  lenses + core 1D/2D DP; 'tier1' = Knowledge Expansion Queue ABOVE the interview-ROI
 *  line (still shows up in hard interviews); 'tier2'/'tier3' = BELOW the line —
 *  competitive-programming horizon only. See cse-progress's study_guide.md. */
export type TechniqueTier = 'core' | 'dp' | 'tier1' | 'tier2' | 'tier3';

/** One row of technique_coverage.md's Coverage table (cse-progress gamify.py's
 *  parse_techniques()) — the drill-through detail behind the technique-breadth header. */
export interface Technique {
  name: string;
  family: string;
  tier: TechniqueTier;
  /** Has the learner solved anything under this technique — technique_coverage.py's
   *  `is_started`. false for a declared-but-not-yet-begun tier1/2/3/dp entry. */
  started: boolean;
  /** The per-technique coverage bar (techniques.yml's min_problems — 1 for most, up to 5
   *  for one) — makes `thin` self-explanatory as problemCount/minProblems instead of a
   *  bare label. A not-started technique still carries its declared target (0/minProblems). */
  minProblems: number;
  problemCount: number;
  problems: number[];
  bestComfort: Comfort | null;
  hasGreen: boolean;
  thin: boolean;
  hasVariantGap: boolean;
}

/** One row of the current week's Daily Schedule table (cse-progress gamify.py's
 *  parse_current_week_schedule()) — the "what do I do today" drill. `lcNumber` is null for
 *  a 🆕 intake row not yet scaffolded to a local solution file (no solution-walkthrough/
 *  LeetCode deep link for that row); `startComfort` is null for a 🆕/🎯-tagged row (no prior
 *  comfort); `difficulty` is null when the number isn't in the tracker yet (joined by
 *  lcNumber — the schedule file itself carries no difficulty column).
 *
 *  `tags` and `kind` (both optional — an older contract predating them still renders
 *  identically) are the enriched-row markers: `tags` values are one or more of `protected,
 *  backfill, new, probe, variant, primer, moved`; `kind` distinguishes a normal rep from a
 *  🆕 intake row, a cold probe re-ask, a Sunday complexity-gate re-ask, or a primer.
 *
 *  `endComfort`/`endNote`/`nextReview` (all optional, additive — an older contract predating
 *  them still renders identically) carry the rep's earned outcome once `done`: the E-column
 *  comfort and its short note (`s2`, `prov`, …), and the Next-rep date; `endNote` is only
 *  ever present alongside a non-null `endComfort` and never falls back to `startComfort`. */
export interface ScheduleItem {
  lcNumber: number | null;
  title: string;
  technique: string | null;
  startComfort: Comfort | null;
  difficulty: 'Easy' | 'Medium' | 'Hard' | null;
  url?: string | null;
  done: boolean;
  tags?: string[];
  kind?: 'rep' | 'new' | 'probe' | 'complexity' | 'primer';
  endComfort?: Comfort | null;
  endNote?: string | null;
  nextReview?: string | null;
  /** Same as `ProblemProgress.file` — the row's own solution file path (null for a row with
   *  no lcNumber, or no file yet); optional, additive. */
  file?: string | null;
}

export interface ScheduleDay {
  date: string;
  weekday: string;
  label: string | null;
  units?: number | null;
  items: ScheduleItem[];
}

/** The current week's board — always 7 days; the viewer picks "today" by its OWN local
 *  date against each day's `date`, never a server-baked one (the summary can be viewed
 *  days after it was generated). */
export interface Schedule {
  weekOf: string;
  days: ScheduleDay[];
}

/** One scheduled day's effort-unit accounting (cse-progress gamify.py's workload export) —
 *  one entry per day that has a schedule header, live week or archive, sorted by date.
 *  `planned` is the header's stated units (null when the header states none); `done` sums
 *  the struck-through rows' price and `built` sums every row's price (done + remaining),
 *  both re-priced under the CURRENT cse.config.yml — a rep struck weeks ago under an older
 *  config still contributes its current-config price, not what it cost at the time.
 *  `partial` is true when any row on the day couldn't be priced exactly (e.g. no match in
 *  the price table), so a consumer can flag the day's numbers as approximate. Backs the
 *  Activity tab's workload chart (planned vs completed units, by day or by week). */
export interface WorkloadDay {
  date: string;
  planned: number | null;
  done: number;
  built: number;
  partial: boolean;
}

/** One row of the Probe log (dsa/probes/README.md — cold, label-stripped, disposable
 *  recognition reps). `result` is the FIRST comfort glyph in the Result cell — the row is
 *  scored on the COLD call, not a later conversion (e.g. "🔴 → 🟡 (re-rep Sep 16)" reads 🔴). */
export interface Probe {
  date: string;
  lcNumber: number | null;
  title: string;
  technique: string;
  result: Comfort | null;
  url?: string | null;
}

/** The Probe log's tally — the ONLY place a disposable, cold 🟢 probe is counted (it earns
 *  no tracker row). `cleanRate` = count(result === 🟢) / total; the README's own built-in
 *  diagnostic reads >=0.85 as "the pool has stopped teaching" and <=0.70 as "real gaps
 *  remain". */
export interface Probes {
  total: number;
  cleanRate: number;
  items: Probe[];
}

export interface ProgressData {
  schemaVersion: number;
  generatedAt: string;
  totals: { problems: number; solutions: number; reps: number };
  pipeline: Pipeline;
  difficulty?: { Easy: number; Medium: number; Hard: number };
  streak: Streak;
  coverage: Coverage | null;
  onSchedule?: OnSchedule;
  trophyCase?: { graduated: ProblemProgress[]; retired: RetiredProblem[] };
  badges: Badge[];
  problems: ProblemProgress[];
  techniques?: Technique[];
  studyDays?: string[];
  schedule?: Schedule | null;
  effortCeiling?: number;
  effortFloor?: number;
  probes?: Probes | null;
  warnings?: string[];
  /** The full, uncapped per-day effort-unit history — see `WorkloadDay`. Optional/additive:
   *  an older contract predating it still renders identically (the workload chart's card
   *  simply doesn't appear). */
  workload?: WorkloadDay[];
}

/** A trophy-case graduate reduced to the fields the landing needs — no timeline/repDates. */
export interface TrophyGraduateSummary {
  lcNumber: number;
  title: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

/**
 * The lightweight landing contract (progress-summary.json, emitted by gamify.py's
 * summary_of()): the aggregate fields only — same shape as ProgressData minus `problems[]`,
 * with a compact `trophyCase`. This is what the page fetches on every navigation; the full
 * ProgressData (with `problems[]`) is fetched only on explicit opt-in.
 */
export interface ProgressSummary {
  schemaVersion: number;
  generatedAt: string;
  totals: { problems: number; solutions: number; reps: number };
  pipeline: Pipeline;
  difficulty?: { Easy: number; Medium: number; Hard: number };
  streak: Streak;
  coverage: Coverage | null;
  onSchedule?: OnSchedule;
  trophyCase?: { graduated: TrophyGraduateSummary[]; retired: RetiredProblem[] };
  badges: Badge[];
  /** Per-technique detail (name/family/problemCount/bestComfort/thin/hasVariantGap) — small
   *  (~56 rows), rides the summary so the technique-breadth drill renders with no fetch. */
  techniques?: Technique[];
  /** Sorted distinct ISO study-day dates — small, rides the summary so the streak-calendar
   *  drill renders with no fetch. */
  studyDays?: string[];
  /** The current week's board — the landing's lead tile. Rides the summary (one week of
   *  compact rows) so Today's board renders with no fetch. null when no current weekly
   *  schedule file was found. */
  schedule?: Schedule | null;
  /** The learner's daily effort-budget ceiling/floor (units) — backs the Today's-board
   *  workload bar's Heavy (>= 0.9x ceiling) / Light (<= floor) / Moderate bands. */
  effortCeiling?: number;
  effortFloor?: number;
  /** The Probe log tally — backs the Recognition tab. Rides the summary (~1 row/week,
   *  small either way); null when no Probe log table was found. */
  probes?: Probes | null;
  warnings?: string[];
  /** The last `SUMMARY_STUDY_DAYS_WINDOW` days of `WorkloadDay` entries (cse-progress caps
   *  this file's window; the full, uncapped history lives on `ProgressData.workload`) —
   *  small either way, rides the summary so the Activity tab's workload chart renders with
   *  no fetch. See `WorkloadDay`. */
  workload?: WorkloadDay[];
}
