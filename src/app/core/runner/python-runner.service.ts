import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PracticeProblem } from '../models/practice.model';
import { matches } from '../practice/compare';
import {
  CaseOutcome,
  CaseResult,
  CaseVerdict,
  FreeRunRequest,
  FreeRunState,
  RunRequest,
  RunState,
  RunStatus,
  WorkerMessage,
} from './runner.model';

/** Builds the Pyodide worker; replaced in tests with a fake. */
export const PYTHON_WORKER_FACTORY = new InjectionToken<() => Worker>('PYTHON_WORKER_FACTORY', {
  providedIn: 'root',
  factory: () => () =>
    new Worker(new URL('./python-runner.worker', import.meta.url), { type: 'module' }),
});

/** Budget for a whole run, measured from the worker's `ready` message so a cold Pyodide
 *  download is never counted against it. */
export const RUN_TIME_LIMIT_MS = 10_000;

const LOADING_STATE: RunState = { status: 'loading', results: [], runError: null };
const LOADING_FREE_STATE: FreeRunState = { status: 'loading', stdout: '', error: null, isTimedOut: false };

/** How one kind of run reacts to the worker; `execute` owns the worker plumbing around it. */
interface RunSpec<S extends { readonly status: RunStatus }> {
  readonly initial: S;
  readonly buildRequest: (id: number) => RunRequest | FreeRunRequest;
  readonly apply: (state: S, message: WorkerMessage) => S;
  /** The state when the time limit kills the worker. */
  readonly onTimeLimit: (state: S) => S;
  /** The state when the worker crashes with `message`. */
  readonly onCrash: (state: S, message: string) => S;
}

function verdictFor(outcome: CaseOutcome, expected: unknown, problem: PracticeProblem): CaseVerdict {
  if (outcome.status === 'error') return outcome.kind === 'recursion' ? 'recursion' : 'error';
  return outcome.hasJson && matches(outcome.gotJson, expected, problem.compare) ? 'pass' : 'fail';
}

/** The next state after one worker message; never mutates `state`. */
function applyMessage(state: RunState, message: WorkerMessage, problem: PracticeProblem): RunState {
  switch (message.type) {
    case 'ready':
      return { ...state, status: 'running' };
    case 'case': {
      const testCase = problem.cases[message.index];
      if (!testCase) return state;
      const verdict = verdictFor(message.outcome, testCase.expected, problem);
      const result: CaseResult = { index: message.index, verdict, outcome: message.outcome };
      return { ...state, results: [...state.results, result] };
    }
    case 'free-result':
      return state;
    case 'run-error':
      return { ...state, runError: message.message };
    case 'done':
      return { ...state, status: 'done' };
  }
}

/** Every case without a result gets `verdict` and no outcome, in case order. */
function fillMissing(
  results: readonly CaseResult[],
  caseCount: number,
  verdict: CaseVerdict,
): readonly CaseResult[] {
  const finished = new Set(results.map((result) => result.index));
  const missing: CaseResult[] = [];
  for (let index = 0; index < caseCount; index++) {
    if (!finished.has(index)) missing.push({ index, verdict, outcome: null });
  }
  return [...results, ...missing].sort((a, b) => a.index - b.index);
}

/** The next free-run state after one worker message; never mutates `state`. */
function applyFreeMessage(state: FreeRunState, message: WorkerMessage): FreeRunState {
  switch (message.type) {
    case 'ready':
      return { ...state, status: 'running' };
    case 'free-result':
      return { ...state, stdout: message.stdout, error: message.error };
    case 'run-error':
      return { ...state, error: message.message };
    case 'case':
    case 'done':
      return state;
  }
}

function buildRequest(id: number, code: string, problem: PracticeProblem): RunRequest {
  return {
    id,
    code,
    entry: problem.entry,
    result: problem.result,
    types: problem.types,
    cases: problem.cases.map((testCase) => ({ args: testCase.args, ops: testCase.ops })),
  };
}

/**
 * Runs a learner's Python against a problem's cases in a module Web Worker (Pyodide, loaded
 * from a CDN inside the worker). The worker is built lazily, reused across runs, and replaced
 * after a time-limit kill or a crash.
 */
@Injectable({ providedIn: 'root' })
export class PythonRunnerService {
  private readonly createWorker = inject(PYTHON_WORKER_FACTORY);
  private worker: Worker | null = null;
  private runId = 0;

  /** Emits a fresh `RunState` on every change and completes once the run ends. */
  run(code: string, problem: PracticeProblem): Observable<RunState> {
    const withMissing = (state: RunState, verdict: CaseVerdict, runError: string | null): RunState => ({
      ...state,
      results: fillMissing(state.results, problem.cases.length, verdict),
      runError,
    });
    return this.execute<RunState>({
      initial: LOADING_STATE,
      buildRequest: (id) => buildRequest(id, code, problem),
      apply: (state, message) => applyMessage(state, message, problem),
      onTimeLimit: (state) => withMissing(state, 'time-limit', state.runError),
      onCrash: (state, message) => withMissing(state, 'error', message),
    });
  }

  /** Runs `code` once and emits its printed output; completes once the run ends. */
  runFree(code: string): Observable<FreeRunState> {
    return this.execute<FreeRunState>({
      initial: LOADING_FREE_STATE,
      buildRequest: (id): FreeRunRequest => ({ id, kind: 'free', code }),
      apply: applyFreeMessage,
      onTimeLimit: (state) => ({ ...state, isTimedOut: true }),
      onCrash: (state, message) => ({ ...state, error: message }),
    });
  }

  private execute<S extends { readonly status: RunStatus }>(spec: RunSpec<S>): Observable<S> {
    return new Observable<S>((subscriber) => {
      const id = ++this.runId;
      const worker = this.ensureWorker();
      let state = spec.initial;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let isEnded = false;

      const publish = (next: S): void => {
        state = next;
        subscriber.next(next);
      };
      const detach = (): void => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };
      const end = (final: S): void => {
        isEnded = true;
        detach();
        publish({ ...final, status: 'done' });
        subscriber.complete();
      };
      // The worker is unusable (killed or crashed): replace it and close out the run.
      const abort = (next: S): void => {
        this.discard(worker);
        end(next);
      };
      const onMessage = (event: MessageEvent<WorkerMessage>): void => {
        const message = event.data;
        if (message.id !== id) return;
        if (message.type === 'done') {
          end(state);
          return;
        }
        publish(spec.apply(state, message));
        if (message.type === 'ready') {
          timer = setTimeout(() => abort(spec.onTimeLimit(state)), RUN_TIME_LIMIT_MS);
        }
      };
      const onError = (event: ErrorEvent): void => abort(spec.onCrash(state, event.message || event.type));

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      publish(state);
      worker.postMessage(spec.buildRequest(id));

      return () => {
        if (isEnded) return;
        detach();
        this.discard(worker); // an abandoned run would keep the worker busy
      };
    });
  }

  private ensureWorker(): Worker {
    if (this.worker === null) this.worker = this.createWorker();
    return this.worker;
  }

  private discard(worker: Worker): void {
    worker.terminate();
    if (this.worker === worker) this.worker = null;
  }
}
