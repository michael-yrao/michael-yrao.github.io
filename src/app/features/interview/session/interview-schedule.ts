import { NAME_MAX_LENGTH } from './session-message';

/** The durations the setup form offers, in minutes. */
export const DURATION_PRESETS_MIN: readonly number[] = [30, 45, 60, 90];
export const DEFAULT_DURATION_MIN = 45;
export const DURATION_MIN_MIN = 15;
export const DURATION_MAX_MIN = 180;
export const EMAIL_MAX_LENGTH = 254;
export const FOCUS_NOTES_MAX_LENGTH = 2_000;
export const PROBLEM_ID_MAX_LENGTH = 64;

/** When an interview is, who is in it and what to focus on; fixed when the interview is set up. */
export interface InterviewSchedule {
  readonly problemId: string;
  /** Epoch milliseconds. */
  readonly scheduledAt: number;
  readonly durationMin: number;
  readonly candidateName: string;
  /** Empty when there is none. */
  readonly candidateEmail: string;
  readonly interviewerName: string;
  readonly notes: string;
}

function isTextUpTo(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= DURATION_MIN_MIN && value <= DURATION_MAX_MIN;
}

/**
 * A stored or remote value as a schedule, or null when any field is missing, mistyped or over its cap. Past dates are
 * kept: an interview that has happened is still scheduled. Only the named fields are carried over.
 */
export function parseSchedule(value: unknown): InterviewSchedule | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const { problemId, scheduledAt, durationMin, candidateName, candidateEmail, interviewerName, notes } = record;
  if (
    isTextUpTo(problemId, PROBLEM_ID_MAX_LENGTH) &&
    typeof scheduledAt === 'number' &&
    Number.isFinite(scheduledAt) &&
    isDuration(durationMin) &&
    isTextUpTo(candidateName, NAME_MAX_LENGTH) &&
    candidateName.length > 0 &&
    isTextUpTo(candidateEmail, EMAIL_MAX_LENGTH) &&
    isTextUpTo(interviewerName, NAME_MAX_LENGTH) &&
    isTextUpTo(notes, FOCUS_NOTES_MAX_LENGTH)
  ) {
    return { problemId, scheduledAt, durationMin, candidateName, candidateEmail, interviewerName, notes };
  }
  return null;
}
