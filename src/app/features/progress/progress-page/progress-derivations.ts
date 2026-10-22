// Pure helpers for the progress page: tab types, on-schedule counts, segment and label builders.
import { CLEAN_COMFORT, COMFORT_ORDER } from '../../../core/models/comfort';
import { Comfort, OnSchedule, Pipeline, ProblemProgress, ProgressSummary } from '../../../core/models/progress.model';
import { SegmentedBarSegment } from '../segmented-bar/segmented-bar.component';

// Segmented tabs (replaces round-1's single "Full breakdown" toggle — round-2 learner
// feedback: the toggle "doesn't connect the top and bottom"). Overview is the default —
// streak hero + Today's board, the at-a-glance landing. Everything else has a home tab;
// the per-problem list lives on the Practice list and the probe log on the Quiz hub.
// Techniques (round 5) folded into Mastery — the honest denominator and the technique list
// belong next to the pipeline they both describe.
export type ProgressTab = 'overview' | 'mastery' | 'activity';
export const TAB_ORDER: readonly ProgressTab[] = ['overview', 'mastery', 'activity'];
export const TAB_LABEL: Readonly<Record<ProgressTab, string>> = {
  overview: 'Overview',
  mastery: 'Mastery',
  activity: 'Activity',
};

const MISSING_GENERATED_AT = '—';
const FULL_PCT = 100;

// The pipeline segment KEY -> comfort glyph it drills into.
const PIPELINE_COMFORT: Readonly<Record<string, Comfort>> = {
  blank: COMFORT_ORDER[0],
  shaky: COMFORT_ORDER[1],
  clean: COMFORT_ORDER[2],
  grad: COMFORT_ORDER[3],
  retired: COMFORT_ORDER[4],
};

export interface MaturityStage {
  readonly comfort: Comfort;
  readonly streak: number | null;
}

/** The seven visible comfort stages, weakest to strongest, for the Mastery subtitle key. */
export const MATURITY_STAGES: readonly MaturityStage[] = [
  { comfort: COMFORT_ORDER[0], streak: null },
  { comfort: COMFORT_ORDER[1], streak: null },
  { comfort: CLEAN_COMFORT, streak: 0 },
  { comfort: CLEAN_COMFORT, streak: 1 },
  { comfort: CLEAN_COMFORT, streak: 2 },
  { comfort: COMFORT_ORDER[3], streak: null },
  { comfort: COMFORT_ORDER[4], streak: null },
];

/** The comfort tier a pipeline segment key drills into, or null for an unknown key. */
export function comfortForPipelineKey(key: string): Comfort | null {
  return PIPELINE_COMFORT[key] ?? null;
}

/** Shared tail of the Refresh button's title and aria-label — the freshness line, minus the
 *  leading word each caller supplies ("Data " for the title; "Refresh — data " for the
 *  aria-label, which overrides visible text so it must still say "Refresh"). */
export function asOfLine(generatedAt: string | undefined): string {
  return `as of ${generatedAt ?? MISSING_GENERATED_AT} · pull the latest from GitHub`;
}

/** The always-visible freshness label — same fallback, no "pull the latest…" tail. */
export function generatedAtLabel(generatedAt: string | undefined): string {
  return generatedAt ?? MISSING_GENERATED_AT;
}

/** lcNumber + title identifies a row uniquely even when a number carries several method
 *  variants (e.g. 21 Recursion vs Iterative) — same key the funnel/timeline `track` uses. */
export function problemRowKey(p: Pick<ProblemProgress, 'lcNumber' | 'title'>): string {
  return `${p.lcNumber}-${p.title}`;
}

/** The new set with `key` added, or removed when already present — never mutates `keys`. */
export function toggledKeys(keys: ReadonlySet<string>, key: string): ReadonlySet<string> {
  return keys.has(key) ? new Set([...keys].filter((k) => k !== key)) : new Set([...keys, key]);
}

/** The On-schedule gauge's counts recomputed client-side from the loaded problem rows —
 *  the same arithmetic as cse-progress gamify.py's `on_schedule()`, but against the
 *  viewer's `today` rather than the exporter's session date. */
export function countOnSchedule(problems: readonly ProblemProgress[], today: string): OnSchedule {
  const overdue = problems.filter((p) => !!p.nextReview && p.nextReview < today).length;
  const dueToday = problems.filter((p) => p.nextReview === today).length;
  return { totalActive: problems.length, dueToday, overdue };
}

/** Percent of active problems not overdue; an empty or absent gauge reads 100. */
export function onSchedulePct(os: OnSchedule | null): number {
  if (!os || !os.totalActive) return FULL_PCT;
  return Math.round(((os.totalActive - os.overdue) / os.totalActive) * FULL_PCT);
}

/** Whether a problem's next review is today — the accent modifier on its due label. */
export function isDueToday(p: ProblemProgress, today: string): boolean {
  return p.nextReview === today;
}

/** Pipeline as ordered segments for the shared segmented bar — each a drill into the Practice
 *  list filtered to that comfort tier. Zero-value tiers are dropped. */
export function pipelineSegments(p: Pipeline): SegmentedBarSegment[] {
  return (
    [
      { key: 'blank', label: 'Blank', value: p.blank, cls: 'seg-blank' },
      { key: 'shaky', label: 'Shaky', value: p.shaky, cls: 'seg-shaky' },
      { key: 'clean', label: 'Clean', value: p.clean.total, cls: 'seg-clean' },
      { key: 'grad', label: 'Graduated', value: p.graduated, cls: 'seg-grad' },
      { key: 'retired', label: 'Retired', value: p.retired, cls: 'seg-retired' },
    ] satisfies SegmentedBarSegment[]
  ).filter((s) => s.value > 0);
}

/** Difficulty mix as segments for the same shared bar; zero-value levels are dropped. */
export function difficultySegments(diff: NonNullable<ProgressSummary['difficulty']>): SegmentedBarSegment[] {
  return (
    [
      { key: 'Easy', label: 'Easy', value: diff.Easy, cls: 'seg-easy' },
      { key: 'Medium', label: 'Medium', value: diff.Medium, cls: 'seg-medium' },
      { key: 'Hard', label: 'Hard', value: diff.Hard, cls: 'seg-hard' },
    ] satisfies SegmentedBarSegment[]
  ).filter((s) => s.value > 0);
}

/** The tab index a tablist key press moves to (ArrowLeft/Right wrap, Home/End jump), or null
 *  for any other key. */
export function nextTabIndex(key: string, index: number, count: number): number | null {
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index - 1 + count) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return null;
}
