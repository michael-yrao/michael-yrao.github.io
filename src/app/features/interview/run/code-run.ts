import { DestroyRef, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import type { Subscription } from 'rxjs';

import type { PracticeProblem } from '../../../core/models/practice.model';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { FreeRunState, RunState, RunStatus } from '../../../core/runner/runner.model';
import { countPassed } from '../../practice/practice-results';
import { toPracticeProblem } from '../problem-import';
import type { InterviewProblem } from '../session/interview-problem';

/** How a run over the cases went, as a debrief records it. */
export interface LastRun {
  readonly passed: number;
  readonly total: number;
}

/** A code run: its state signals and the call that starts one. */
export interface CodeRun {
  /** A run over the cases, and the problem it ran, so its tabs and count stay the run's own. */
  readonly runState: Signal<RunState | null>;
  readonly ranProblem: Signal<PracticeProblem | null>;
  readonly freeRunState: Signal<FreeRunState | null>;
  /** The tab the user clicked; null until they click, so the default follows the first failure. */
  readonly selectedCase: WritableSignal<number | null>;
  readonly isBusy: Signal<boolean>;
  readonly isLoadingPython: Signal<boolean>;
  readonly passedCount: Signal<number>;
  readonly runCaseCount: Signal<number>;
  /** The last run over the cases, or null when none ran. */
  readonly lastRun: Signal<LastRun | null>;
  /** Runs the cases when the problem has cases and an entry; otherwise prints what the code prints. */
  start(text: string, problem: InterviewProblem | null): void;
}

const isRunning = (status: RunStatus | undefined): boolean => status === 'loading' || status === 'running';
const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** A problem with cases and an entry runs against its cases; anything else is a free run. */
const isCaseRunnable = (problem: InterviewProblem | null): boolean =>
  problem !== null && problem.cases.length > 0 && problem.entry !== null;

/** Runs code in the browser's Python runner. Call from an injection context (a field initializer). */
export function injectCodeRun(): CodeRun {
  const runner = inject(PythonRunnerService);
  const runState = signal<RunState | null>(null);
  const ranProblem = signal<PracticeProblem | null>(null);
  const freeRunState = signal<FreeRunState | null>(null);
  const selectedCase = signal<number | null>(null);
  let runSubscription: Subscription | null = null;

  inject(DestroyRef).onDestroy(() => runSubscription?.unsubscribe());

  const isBusy = computed(() => isRunning(runState()?.status) || isRunning(freeRunState()?.status));
  const isLoadingPython = computed(() => runState()?.status === 'loading' || freeRunState()?.status === 'loading');
  const passedCount = computed(() => countPassed(runState()?.results ?? []));
  const runCaseCount = computed(() => ranProblem()?.cases.length ?? 0);
  const lastRun = computed<LastRun | null>(() =>
    runState() ? { passed: passedCount(), total: runCaseCount() } : null,
  );

  function runCases(text: string, problem: PracticeProblem): void {
    freeRunState.set(null);
    selectedCase.set(null);
    ranProblem.set(problem);
    runSubscription = runner.run(text, problem).subscribe({
      next: (state) => runState.set(state),
      error: (err: unknown) => {
        console.error('Interview: case run failed', err);
        runState.set({ status: 'done', results: [], runError: errorMessage(err) });
      },
    });
  }

  function runFree(text: string): void {
    runState.set(null);
    ranProblem.set(null);
    runSubscription = runner.runFree(text).subscribe({
      next: (state) => freeRunState.set(state),
      error: (err: unknown) => {
        console.error('Interview: free run failed', err);
        freeRunState.set({ status: 'done', stdout: '', error: errorMessage(err), isTimedOut: false });
      },
    });
  }

  function start(text: string, problem: InterviewProblem | null): void {
    if (isBusy()) return;
    runSubscription?.unsubscribe();
    if (problem && isCaseRunnable(problem)) runCases(text, toPracticeProblem(problem));
    else runFree(text);
  }

  return { runState, ranProblem, freeRunState, selectedCase, isBusy, isLoadingPython, passedCount, runCaseCount, lastRun, start };
}
