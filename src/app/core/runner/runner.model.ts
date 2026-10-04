import { PracticeEntry, ResultSpec, TypeSpec } from '../models/practice.model';

export type RunEntry = PracticeEntry;

/** One case as the worker receives it: `ops` is present only for an 'ops' entry. */
export interface RunCase {
  readonly args: readonly unknown[];
  readonly ops?: readonly string[];
}

/** What one case did inside the worker. `hasJson` is false only when the return value cannot be
 *  JSON-encoded (inf, a set): `gotJson` is then null and `gotRepr` carries `repr()`. A function
 *  that returns None gives `hasJson: true, gotJson: null`. */
export type CaseOutcome =
  | {
      readonly status: 'ok';
      readonly hasJson: boolean;
      readonly gotJson: unknown;
      readonly gotRepr: string;
      readonly stdout: string;
    }
  | {
      readonly status: 'error';
      readonly kind: 'recursion' | 'exception';
      readonly message: string;
      readonly stdout: string;
    };

export type CaseVerdict = 'pass' | 'fail' | 'recursion' | 'error' | 'time-limit';

/** `outcome` is null only for 'time-limit' or a worker crash. */
export interface CaseResult {
  readonly index: number;
  readonly verdict: CaseVerdict;
  readonly outcome: CaseOutcome | null;
}

export type RunStatus = 'idle' | 'loading' | 'running' | 'done';

export interface RunState {
  readonly status: RunStatus;
  readonly results: readonly CaseResult[];
  readonly runError: string | null;
}

// Worker protocol

export interface RunRequest {
  readonly id: number;
  readonly code: string;
  readonly entry: RunEntry;
  readonly result?: ResultSpec | null;
  readonly types?: TypeSpec | null;
  readonly cases: readonly RunCase[];
}

/** The JSON the driver's `run_case` takes: the entry's fields, one case, and the problem's
 *  `result` and `types`. */
export function buildCaseSpec(request: RunRequest, testCase: RunCase): string {
  return JSON.stringify({
    ...request.entry,
    args: testCase.args,
    ops: testCase.ops,
    result: request.result,
    types: request.types,
  });
}

/** A free run: the code runs once and only its printed output comes back. */
export interface FreeRunRequest {
  readonly id: number;
  readonly kind: 'free';
  readonly code: string;
}

export interface FreeRunState {
  readonly status: RunStatus;
  readonly stdout: string;
  readonly error: string | null;
  readonly isTimedOut: boolean;
}

export type WorkerMessage =
  | { readonly id: number; readonly type: 'ready' }
  | { readonly id: number; readonly type: 'free-result'; readonly stdout: string; readonly error: string | null }
  | { readonly id: number; readonly type: 'case'; readonly index: number; readonly outcome: CaseOutcome }
  | { readonly id: number; readonly type: 'run-error'; readonly message: string }
  | { readonly id: number; readonly type: 'done' };
