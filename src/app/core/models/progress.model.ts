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

/** One row of technique_coverage.md's Coverage table (cse-progress gamify.py's
 *  parse_techniques()) — the drill-through detail behind the technique-breadth header. */
export interface Technique {
  name: string;
  family: string;
  problemCount: number;
  problems: number[];
  bestComfort: Comfort | null;
  hasGreen: boolean;
  thin: boolean;
  hasVariantGap: boolean;
}

/** One row of the current week's Daily Schedule table (cse-progress gamify.py's
 *  parse_current_week_schedule()) — the "what do I do today" drill. `lcNumber` is null for
 *  a 🆕 intake row not yet scaffolded to a local solution file (no Visualize/LeetCode deep
 *  link for that row); `startComfort` is null for a 🆕/🎯-tagged row (no prior comfort). */
export interface ScheduleItem {
  lcNumber: number | null;
  title: string;
  technique: string | null;
  startComfort: Comfort | null;
  done: boolean;
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
  warnings?: string[];
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
  warnings?: string[];
}
