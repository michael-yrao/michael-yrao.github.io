export interface RunEntry {
  readonly className: string;
  readonly method: string;
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
  readonly cases: readonly { readonly args: readonly unknown[] }[];
}

export type WorkerMessage =
  | { readonly id: number; readonly type: 'ready' }
  | { readonly id: number; readonly type: 'case'; readonly index: number; readonly outcome: CaseOutcome }
  | { readonly id: number; readonly type: 'run-error'; readonly message: string }
  | { readonly id: number; readonly type: 'done' };
