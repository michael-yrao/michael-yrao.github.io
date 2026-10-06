import type { Debrief } from '../session/debrief';

const ROLE_LABELS: Readonly<Record<Debrief['role'], string>> = {
  candidate: 'Candidate',
  interviewer: 'Interviewer',
};

/** A debrief's date as the landing rows and the debrief page show it, e.g. `Oct 5`. */
export function formatDebriefDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function roleLabel(role: Debrief['role']): string {
  return ROLE_LABELS[role];
}
