import type { PreparedSummary } from '../session/prepared-summary';

type ScheduledSummary = PreparedSummary & { readonly schedule: NonNullable<PreparedSummary['schedule']> };

const isScheduled = (summary: PreparedSummary): summary is ScheduledSummary => summary.schedule !== null;

/** The interviews still to run: debriefed ones dropped, scheduled ones soonest first, then unscheduled ones newest first. */
export function upcomingInterviews(
  summaries: readonly PreparedSummary[],
  debriefedIds: ReadonlySet<string>,
): readonly PreparedSummary[] {
  const open = summaries.filter((summary) => !debriefedIds.has(summary.sessionId));
  const scheduled = open.filter(isScheduled).sort((a, b) => a.schedule.scheduledAt - b.schedule.scheduledAt);
  const unscheduled = open.filter((summary) => !isScheduled(summary)).sort((a, b) => b.createdAt - a.createdAt);
  return [...scheduled, ...unscheduled];
}
