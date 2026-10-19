import { COACH_LIMITS, type CoachMessageRequest, type CoachPageContext } from './contract.js';

type Run = NonNullable<CoachPageContext['run']>;
type Problem = NonNullable<CoachPageContext['problem']>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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

/** Defensive re-check of the Worker's validation: the request or null. Unknown fields are dropped. */
export function parseMessageRequest(raw: unknown): CoachMessageRequest | null {
  if (!isRecord(raw)) return null;
  const { sessionId, message, context } = raw;
  if (sessionId !== null && !isBoundedString(sessionId, COACH_LIMITS.routeChars)) return null;
  if (!isBoundedString(message, COACH_LIMITS.messageChars) || message.trim() === '') return null;

  const parsedContext = parseContext(context);
  if (parsedContext === null) return null;
  return { sessionId, message, context: parsedContext };
}
