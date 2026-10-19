import type { CoachPracticeSnapshot } from '../../core/coach/coach-context.service';
import { COACH_LIMITS, type CoachPageContext } from '../../core/models/coach.model';
import type { CaseVerdict } from '../../core/runner/runner.model';

const VERDICT_MARKS: Readonly<Record<CaseVerdict, string>> = {
  pass: '✓',
  fail: '✗',
  error: '!',
  recursion: '!',
  'time-limit': '⏱',
};

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

function withSnapshot(base: CoachPageContext, snapshot: CoachPracticeSnapshot): CoachPageContext {
  const run = snapshot.run;
  return {
    ...base,
    problem: { number: snapshot.number, title: snapshot.title },
    code: truncate(snapshot.code, COACH_LIMITS.codeChars),
    ...(run === null
      ? {}
      : {
          run: {
            passed: run.passed,
            total: run.total,
            verdicts: truncate(run.verdicts.map((v) => VERDICT_MARKS[v]).join(''), COACH_LIMITS.verdictChars),
          },
        }),
  };
}

/** What the coach is told about the page: route and repo always; problem, code and run only on a practice page. */
export function buildPageContext(
  url: string,
  repo: string,
  snapshot: CoachPracticeSnapshot | null,
): CoachPageContext {
  const base: CoachPageContext = { route: truncate(url, COACH_LIMITS.routeChars), repo };
  return snapshot === null ? base : withSnapshot(base, snapshot);
}

/** The message text, capped at the contract limit. */
export function clampMessage(message: string): string {
  return truncate(message, COACH_LIMITS.messageChars);
}
