import type { CoachPracticeSnapshot } from '../../core/coach/coach-context.service';
import { COACH_LIMITS, type CoachPageContext } from '../../core/models/coach.model';
import { buildPageContext } from './page-context';

const SNAPSHOT: CoachPracticeSnapshot = {
  number: 1,
  title: 'Two Sum',
  code: 'x = 1',
  run: { passed: 1, total: 6, verdicts: ['pass', 'fail', 'error', 'recursion', 'time-limit', 'pass'] },
};

interface Row {
  readonly name: string;
  readonly url: string;
  readonly snapshot: CoachPracticeSnapshot | null;
  readonly check: (ctx: CoachPageContext) => void;
}

const ROWS: readonly Row[] = [
  {
    name: 'no snapshot: only route and repo',
    url: '/',
    snapshot: null,
    check: (ctx) => expect(ctx).toEqual({ route: '/', repo: 'o/r' }),
  },
  {
    name: 'a snapshot with no run leaves out run',
    url: '/practice/1',
    snapshot: { ...SNAPSHOT, run: null },
    check: (ctx) => {
      expect(ctx.problem).toEqual({ number: 1, title: 'Two Sum' });
      expect('run' in ctx).toBe(false);
    },
  },
  {
    name: 'verdicts map to marks',
    url: '/practice/1',
    snapshot: SNAPSHOT,
    check: (ctx) => expect(ctx.run).toEqual({ passed: 1, total: 6, verdicts: '✓✗!!⏱✓' }),
  },
  {
    name: 'route, code and verdicts truncate to the contract limits',
    url: '/'.padEnd(COACH_LIMITS.routeChars + 50, 'a'),
    snapshot: {
      ...SNAPSHOT,
      code: 'c'.repeat(COACH_LIMITS.codeChars + 50),
      run: { passed: 0, total: 0, verdicts: Array.from({ length: COACH_LIMITS.verdictChars + 50 }, () => 'pass' as const) },
    },
    check: (ctx) => {
      expect(ctx.route).toHaveLength(COACH_LIMITS.routeChars);
      expect(ctx.code).toHaveLength(COACH_LIMITS.codeChars);
      expect(ctx.run?.verdicts).toHaveLength(COACH_LIMITS.verdictChars);
    },
  },
];

describe('buildPageContext', () => {
  it.each(ROWS)('$name', ({ url, snapshot, check }) => {
    check(buildPageContext(url, 'o/r', snapshot));
  });
});
