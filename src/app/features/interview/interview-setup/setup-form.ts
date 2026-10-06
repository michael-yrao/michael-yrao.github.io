import {
  DEFAULT_DURATION_MIN,
  DURATION_PRESETS_MIN,
  EMAIL_MAX_LENGTH,
  FOCUS_NOTES_MAX_LENGTH,
  type InterviewSchedule,
} from '../session/interview-schedule';
import { NAME_MAX_LENGTH } from '../session/session-message';

/** A start this far in the past still counts as now: the form may sit open a while before it is submitted. */
export const SCHEDULE_PAST_GRACE_MS = 5 * 60_000;
/** The worker keeps an interview for 180 days; a start within half of that is plausible. */
export const SCHEDULE_MAX_AHEAD_DAYS = 90;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** What a `datetime-local` input holds: local date and time to the minute. */
export const DATETIME_LOCAL_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const MS_PER_DAY = 24 * 60 * 60_000;

/** The form's fields as the browser hands them over: raw strings. */
export interface SetupInput {
  readonly when: string;
  readonly durationMin: string;
  readonly candidateName: string;
  readonly candidateEmail: string;
  readonly interviewerName: string;
  readonly notes: string;
}

export type SetupError = 'when-missing' | 'when-past' | 'when-too-far' | 'candidate-name-missing' | 'email-invalid';

export type SetupSchedule = Omit<InterviewSchedule, 'problemId'>;

export const SETUP_ERROR_TEXT: Readonly<Record<SetupError, string>> = {
  'when-missing': 'Pick a date and time.',
  'when-past': 'Pick a time that has not passed.',
  'when-too-far': 'Pick a time within the next 90 days.',
  'candidate-name-missing': "Enter the candidate's name.",
  'email-invalid': 'Enter a valid email address, or leave it blank.',
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** `ms` as the local `YYYY-MM-DDTHH:mm` a `datetime-local` input takes. */
export function toDateTimeLocal(ms: number): string {
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The next full local hour after `now`, in epoch milliseconds. */
export function defaultStart(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() + 1).getTime();
}

/** The local time `value` names, or null when it is not a real date and time (`2026-13-40T25:00` is not). */
function parseLocalTime(value: string): number | null {
  if (!DATETIME_LOCAL_PATTERN.test(value)) {
    return null;
  }
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  const ms = new Date(year, month - 1, day, hour, minute).getTime();
  return toDateTimeLocal(ms) === value ? ms : null;
}

function whenError(ms: number | null, now: number): SetupError | null {
  if (ms === null) {
    return 'when-missing';
  }
  if (ms < now - SCHEDULE_PAST_GRACE_MS) {
    return 'when-past';
  }
  return ms > now + SCHEDULE_MAX_AHEAD_DAYS * MS_PER_DAY ? 'when-too-far' : null;
}

function durationOf(value: string): number {
  const minutes = Number(value);
  return DURATION_PRESETS_MIN.includes(minutes) ? minutes : DEFAULT_DURATION_MIN;
}

function isEmailValid(email: string): boolean {
  return email.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(email);
}

/** The schedule the form describes, or every error it has at once. */
export function parseSetupForm(input: SetupInput, now: number): { readonly schedule: SetupSchedule } | { readonly errors: readonly SetupError[] } {
  const scheduledAt = parseLocalTime(input.when);
  const candidateName = input.candidateName.trim().slice(0, NAME_MAX_LENGTH);
  const candidateEmail = input.candidateEmail.trim();
  const errors = [
    whenError(scheduledAt, now),
    candidateName === '' ? 'candidate-name-missing' : null,
    candidateEmail !== '' && !isEmailValid(candidateEmail) ? 'email-invalid' : null,
  ].filter((error): error is SetupError => error !== null);
  if (errors.length > 0 || scheduledAt === null) {
    return { errors };
  }
  return {
    schedule: {
      scheduledAt,
      durationMin: durationOf(input.durationMin),
      candidateName,
      candidateEmail,
      interviewerName: input.interviewerName.trim().slice(0, NAME_MAX_LENGTH),
      notes: input.notes.trim().slice(0, FOCUS_NOTES_MAX_LENGTH),
    },
  };
}
