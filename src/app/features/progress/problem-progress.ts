// Pure per-problem progress helpers shared by the Practice list and the Progress page: comfort and difficulty facets, the due label, the attention list.
import { Comfort, ProblemProgress } from '../../core/models/progress.model';
import { daysBetweenISO } from '../../core/utils/local-date';

export type ComfortFilter = 'all' | Comfort;
export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export const COMFORT_FILTERS: readonly ComfortFilter[] = ['all', '🔴', '🟡', '🟢', '🎓'];

/** Whether a problem passes the comfort chip; `all` passes everything. */
export function hasComfort(p: Pick<ProblemProgress, 'comfort'>, filter: ComfortFilter): boolean {
  return filter === 'all' || p.comfort === filter;
}

/** Overdue or due-today as of `today` — the On-schedule gauge's inline "Needs attention"
 *  list. A problem with no `nextReview` yet (never reviewed) is never in this state. */
export function isDueOrOverdue(p: ProblemProgress, today: string): boolean {
  return !!p.nextReview && p.nextReview <= today;
}

/** The attention list: due or overdue rows, oldest `nextReview` first (ties by LC number). */
export function attentionProblems(problems: readonly ProblemProgress[], today: string): ProblemProgress[] {
  return problems
    .filter((p) => isDueOrOverdue(p, today))
    .sort((a, b) => (a.nextReview ?? '').localeCompare(b.nextReview ?? '') || a.lcNumber - b.lcNumber);
}

/** The attention row's due label: "due today", or "Nd overdue" for a past nextReview. */
export function dueLabel(p: ProblemProgress, today: string): string {
  const nextReview = p.nextReview ?? today;
  if (nextReview === today) return 'due today';
  return `${daysBetweenISO(nextReview, today)}d overdue`;
}
