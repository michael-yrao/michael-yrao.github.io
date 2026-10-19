import { isRecord } from '../github/write-file';
import { COACH_LIMITS, type CoachMessageRequest, type CoachPageContext } from './contract';

type Run = NonNullable<CoachPageContext['run']>;
type Problem = NonNullable<CoachPageContext['problem']>;

// The JSON envelope around the two largest fields (message and code) plus the small ones.
const BODY_ENVELOPE_CHARS = 2_000;
// Quote, backslash and newline escapes double a character, so the raw body gets that much room.
const MAX_ESCAPE_FACTOR = 2;
export const MAX_BODY_CHARS =
  (COACH_LIMITS.messageChars + COACH_LIMITS.codeChars) * MAX_ESCAPE_FACTOR + BODY_ENVELOPE_CHARS;

function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function parseProblem(raw: unknown): Problem | null {
  if (!isRecord(raw)) return null;
  const { number, title } = raw;
  if (!isCount(number) || number === 0) return null;
  if (!isBoundedString(title, COACH_LIMITS.routeChars)) return null;
  return { number, title };
}

function parseRun(raw: unknown): Run | null {
  if (!isRecord(raw)) return null;
  const { passed, total, verdicts } = raw;
  if (!isCount(passed) || !isCount(total) || passed > total) return null;
  if (typeof verdicts !== 'string' || verdicts.length > COACH_LIMITS.verdictChars) return null;
  return { passed, total, verdicts };
}

function parseContext(raw: unknown): CoachPageContext | null {
  if (!isRecord(raw)) return null;
  const { route, repo, problem, code, run } = raw;
  if (!isBoundedString(route, COACH_LIMITS.routeChars)) return null;
  if (!isBoundedString(repo, COACH_LIMITS.routeChars)) return null;

  const parsedProblem = problem === undefined ? undefined : parseProblem(problem);
  if (parsedProblem === null) return null;
  const parsedRun = run === undefined ? undefined : parseRun(run);
  if (parsedRun === null) return null;
  if (code !== undefined && (typeof code !== 'string' || code.length > COACH_LIMITS.codeChars)) {
    return null;
  }

  return {
    route,
    repo,
    ...(parsedProblem === undefined ? {} : { problem: parsedProblem }),
    ...(code === undefined ? {} : { code }),
    ...(parsedRun === undefined ? {} : { run: parsedRun }),
  };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The request body parsed and re-built from known fields only, or null when it is not a valid message request. */
export function parseCoachRequest(text: string): CoachMessageRequest | null {
  if (text.length > MAX_BODY_CHARS) return null;
  const raw = parseJson(text);
  if (!isRecord(raw)) return null;
  const { sessionId, message, context } = raw;
  if (sessionId !== null && !isBoundedString(sessionId, COACH_LIMITS.routeChars)) return null;
  if (!isBoundedString(message, COACH_LIMITS.messageChars) || message.trim() === '') return null;

  const parsedContext = parseContext(context);
  if (parsedContext === null) return null;
  return { sessionId, message, context: parsedContext };
}
