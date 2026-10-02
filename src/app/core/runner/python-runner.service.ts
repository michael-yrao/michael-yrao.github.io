import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { PracticeProblem } from '../models/practice.model';
import { matches } from '../practice/compare';
import {
  CaseOutcome,
  CaseResult,
  CaseVerdict,
  RunRequest,
  RunState,
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
    return new Observable<RunState>((subscriber) => {
      const id = ++this.runId;
      const worker = this.ensureWorker();
      let state = LOADING_STATE;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let isEnded = false;

      const publish = (next: RunState): void => {
        state = next;
        subscriber.next(next);
      };
      const detach = (): void => {
        if (timer !== null) clearTimeout(timer);
        timer = null;
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };
      const end = (final: RunState): void => {
        isEnded = true;
        detach();
        publish({ ...final, status: 'done' });
        subscriber.complete();
      };
      // The worker is unusable (killed or crashed): replace it and close out the run.
      const abort = (verdict: CaseVerdict, runError: string | null): void => {
        this.discard(worker);
        const results = fillMissing(state.results, problem.cases.length, verdict);
        end({ ...state, results, runError });
      };
      const onMessage = (event: MessageEvent<WorkerMessage>): void => {
        const message = event.data;
        if (message.id !== id) return;
        if (message.type === 'done') {
          end(state);
          return;
        }
        publish(applyMessage(state, message, problem));
        if (message.type === 'ready') {
          timer = setTimeout(() => abort('time-limit', state.runError), RUN_TIME_LIMIT_MS);
        }
      };
      const onError = (event: ErrorEvent): void => abort('error', event.message || event.type);

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      publish(state);
      worker.postMessage(buildRequest(id, code, problem));

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
