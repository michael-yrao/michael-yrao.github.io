import { SolutionVariant } from '../src/app/core/models/algorithm.model';
import { PracticeProblem } from '../src/app/core/models/practice.model';
import { matches } from '../src/app/core/practice/compare';

export type Trace = NonNullable<SolutionVariant['trace']>;

/** Null when the trace is a case of the practice problem (same args, and an expected the
 *  problem's compare mode accepts), or when the problem is an 'ops' design problem (exempt).
 *  Otherwise a message saying which half of the trace has no matching case. */
export function traceMismatch(trace: Trace, problem: PracticeProblem): string | null {
  if (problem.entry.kind === 'ops') return null;
  const wantedArgs = JSON.stringify(trace.args);
  const sameArgs = problem.cases.filter((c) => JSON.stringify(c.args) === wantedArgs);
  if (sameArgs.length === 0) return 'args are not a case of the practice spec';
  const isExpectedFound = sameArgs.some((c) =>
    matches(trace.expected, c.expected, problem.compare, problem.tolerance),
  );
  return isExpectedFound ? null : 'expected differs from the spec case with these args';
}
