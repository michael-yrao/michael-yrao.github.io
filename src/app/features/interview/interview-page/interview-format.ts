import type { Debrief } from '../session/debrief';
import type { InterviewSchedule } from '../session/interview-schedule';

const ROLE_LABELS: Readonly<Record<Debrief['role'], string>> = {
  candidate: 'Candidate',
  interviewer: 'Interviewer',
};

/** A debrief's date as the landing rows and the debrief page show it, e.g. `Oct 5`. */
export function formatDebriefDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** An interview's start as the setup and the invite show it, e.g. `Tue, Oct 6, 3:00 PM`. */
export function formatScheduledAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** The start and the length together, e.g. `Tue, Oct 6, 3:00 PM (45 min)`. */
export function scheduleWhen(schedule: Pick<InterviewSchedule, 'scheduledAt' | 'durationMin'>): string {
  return `${formatScheduledAt(schedule.scheduledAt)} (${schedule.durationMin} min)`;
}

export function roleLabel(role: Debrief['role']): string {
  return ROLE_LABELS[role];
}
