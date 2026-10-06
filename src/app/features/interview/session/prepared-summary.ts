import { codeUrl } from '../directory/interview-code';
import { InterviewProblem, parseInterviewProblem } from './interview-problem';
import { InterviewSchedule } from './interview-schedule';
import { PreparedEntry } from './prepared-store';

/** The revision a prepared problem is first signed at: the one a session starts with. */
export const FIRST_PROBLEM_REV = 1;

/** `local`: codes are switched off, so the entry lives in this browser only; `pending`: the server holds an older revision. */
export type PublishState = 'local' | 'pending' | 'published';

/** What the picker shows for one prepared interview. */
export interface PreparedSummary {
  readonly sessionId: string;
  readonly title: string;
  readonly createdAt: number;
  readonly publish: PublishState;
  /** Null for an interview prepared before schedules existed. */
  readonly schedule: InterviewSchedule | null;
}

export interface PreparedLinks {
  readonly candidateUrl: string;
  readonly interviewerUrl: string;
}

export type PreparedCodes = PreparedLinks & { readonly candidateCode: string; readonly interviewerCode: string };

/** The problem in `json`, or null when it is not valid JSON of a valid problem. */
export function problemFromJson(json: string): InterviewProblem | null {
  try {
    return parseInterviewProblem(JSON.parse(json));
  } catch {
    return null;
  }
}

export function publishStateOf(entry: PreparedEntry, isEnabled: boolean): PublishState {
  if (!isEnabled) {
    return 'local';
  }
  return entry.pushedRev >= entry.problem.rev ? 'published' : 'pending';
}

/** Codes are shown once the server has accepted the interview, or at once when there is no server. */
export function areCodesShown(entry: PreparedEntry, isEnabled: boolean): boolean {
  return !isEnabled || entry.pushedRev >= FIRST_PROBLEM_REV;
}

export function summaryOf(sessionId: string, entry: PreparedEntry, isEnabled: boolean): PreparedSummary {
  return {
    sessionId,
    title: problemFromJson(entry.problem.json)?.title ?? '',
    createdAt: entry.createdAt,
    publish: publishStateOf(entry, isEnabled),
    schedule: entry.schedule ?? null,
  };
}

/** The entry's two codes and their links; null until the codes are shown. */
export function codesOf(entry: PreparedEntry, isEnabled: boolean, baseUrl: string): PreparedCodes | null {
  if (!areCodesShown(entry, isEnabled)) {
    return null;
  }
  const { candidateCode, interviewerCode } = entry;
  return {
    candidateCode,
    interviewerCode,
    candidateUrl: codeUrl(baseUrl, candidateCode),
    interviewerUrl: codeUrl(baseUrl, interviewerCode),
  };
}

/** `summaries` with `summary` in place of any earlier one for its session, newest first. */
export function withSummary(summaries: readonly PreparedSummary[], summary: PreparedSummary): readonly PreparedSummary[] {
  return [...summaries.filter((item) => item.sessionId !== summary.sessionId), summary].sort((a, b) => b.createdAt - a.createdAt);
}

/** `task`'s result, or `fallback` once `ms` pass or it fails. */
export function withTimeout<T>(task: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    const settle = (value: T): void => {
      clearTimeout(timer);
      resolve(value);
    };
    task.then(settle, () => settle(fallback));
  });
}
