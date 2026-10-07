// Pure helpers for the progress page: tab and filter types, problem filtering, on-schedule counts, segment and label builders.
import { Comfort, OnSchedule, Pipeline, ProblemProgress, ProgressSummary } from '../../../core/models/progress.model';
import { daysBetweenISO } from '../../../core/utils/local-date';
import { SegmentedBarSegment } from '../segmented-bar/segmented-bar.component';

export type ComfortFilter = 'all' | Comfort;
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

// Segmented tabs (replaces round-1's single "Full breakdown" toggle — round-2 learner
// feedback: the toggle "doesn't connect the top and bottom"). Overview is the default —
// streak hero + Today's board, the at-a-glance landing. Everything else has a home tab;
// all existing drill behavior keeps working inside them, just re-homed. Techniques (round 5)
// folded into Mastery — the honest denominator and the technique list belong next to the
// pipeline they both describe.
export type ProgressTab = 'overview' | 'mastery' | 'recognition' | 'problems' | 'activity';
export const TAB_ORDER: readonly ProgressTab[] = ['overview', 'mastery', 'recognition', 'problems', 'activity'];
export const TAB_LABEL: Readonly<Record<ProgressTab, string>> = {
  overview: 'Overview',
  mastery: 'Mastery',
  recognition: 'Recognition',
  problems: 'Problems',
  activity: 'Activity',
};

// The Explore list's unified filter facet. `null` = show everything. Each drill button on
// the landing (a pipeline tier, a difficulty count) sets one of these and triggers
// loadDetails() + switches to the Problems tab. The On-schedule gauge's "Needs attention"
// list is not one of these drills — it expands inline in the gauge card instead, so this
// facet only ever carries comfort or difficulty.
export type ListFacet = { kind: 'comfort'; value: Comfort } | { kind: 'difficulty'; value: Difficulty };

export const COMFORT_FILTERS: readonly ComfortFilter[] = ['all', '🔴', '🟡', '🟢', '🎓'];

const MISSING_GENERATED_AT = '—';
const FULL_PCT = 100;

// The pipeline segment KEY -> comfort glyph it drills into.
const PIPELINE_COMFORT: Readonly<Record<string, Comfort>> = {
  blank: '🔴',
  shaky: '🟡',
  clean: '🟢',
  grad: '🎓',
  retired: '🏆',
};

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
export function problemRowKey(p: ProblemProgress): string {
  return `${p.lcNumber}-${p.title}`;
}

/** The new set with `key` added, or removed when already present — never mutates `keys`. */
export function toggledKeys(keys: ReadonlySet<string>, key: string): ReadonlySet<string> {
  return keys.has(key) ? new Set([...keys].filter((k) => k !== key)) : new Set([...keys, key]);
}

/** The Explore list after the facet filter; no facet shows everything. */
export function filterProblems(list: readonly ProblemProgress[], facet: ListFacet | null): ProblemProgress[] {
  if (!facet) return [...list];
  if (facet.kind === 'comfort') return list.filter((p) => p.comfort === facet.value);
  return list.filter((p) => p.difficulty === facet.value);
}

/** Overdue or due-today as of `today` — the On-schedule gauge's inline "Needs attention"
 *  list. A problem with no `nextReview` yet (never reviewed) is never in this state. */
function isDueOrOverdue(p: ProblemProgress, today: string): boolean {
  return !!p.nextReview && p.nextReview <= today;
}

/** The attention list: due or overdue rows, oldest `nextReview` first (ties by LC number). */
export function attentionProblems(problems: readonly ProblemProgress[], today: string): ProblemProgress[] {
  return problems
    .filter((p) => isDueOrOverdue(p, today))
    .sort((a, b) => (a.nextReview ?? '').localeCompare(b.nextReview ?? '') || a.lcNumber - b.lcNumber);
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

/** The attention row's due label: "due today", or "Nd overdue" for a past nextReview. */
export function dueLabel(p: ProblemProgress, today: string): string {
  const nextReview = p.nextReview ?? today;
  if (nextReview === today) return 'due today';
  return `${daysBetweenISO(nextReview, today)}d overdue`;
}

/** Pipeline as ordered segments for the shared segmented bar — each a drill into the Problems
 *  tab filtered to that comfort tier. Zero-value tiers are dropped. */
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
