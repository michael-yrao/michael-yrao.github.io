import { Injectable, Signal, computed, signal } from '@angular/core';

import { AlgorithmMeta, Step } from '../../core/models/algorithm.model';

const SHOW_WHY_STORAGE_KEY = 'po-show-why';
const NO_META: Signal<AlgorithmMeta | null> = signal(null);

/** Where the learner is in one variant of one problem. Tagged with its `key` so it never
 *  leaks onto another problem or variant. */
interface WalkthroughProgress {
  readonly key: string;
  readonly isStarted: boolean;
  readonly stepIndex: number;
}

function loadShowWhy(): boolean {
  try {
    const pref = localStorage.getItem(SHOW_WHY_STORAGE_KEY);
    return pref === null ? true : pref === '1';
  } catch {
    return true; // localStorage unavailable — keep default
  }
}

/**
 * The walkthrough's state for one practice page, shared by the Visualizer and Code tabs so
 * stepping in one is seen in the other and switching tabs loses nothing. Provided by the page,
 * so it lives exactly as long as the page; the page hands it the problem's `meta` via `connect`.
 */
@Injectable()
export class WalkthroughStateService {
  /** The page's current problem; a signal of a signal so `connect` stays reactive. */
  private readonly metaSource = signal<Signal<AlgorithmMeta | null>>(NO_META);

  readonly meta = computed(() => this.metaSource()());

  readonly isWhyShown = signal(loadShowWhy());

  /** The learner's variant choice, tagged with its problem. */
  private readonly selection = signal<{ id: string; index: number } | null>(null);
  private readonly progress = signal<WalkthroughProgress | null>(null);

  readonly activeSolutionIndex = computed(() => {
    const selection = this.selection();
    const meta = this.meta();
    return selection && meta && selection.id === meta.id ? selection.index : 0;
  });
  readonly activeSolution = computed(
    () => this.meta()?.solutions[this.activeSolutionIndex()] ?? null,
  );
  readonly hasMultipleSolutions = computed(() => (this.meta()?.solutions.length ?? 0) > 1);

  readonly steps = computed<Step[]>(() => this.activeSolution()?.generateSteps() ?? []);
  readonly hasVisualization = computed(() => this.steps().length > 0);

  private readonly progressKey = computed(
    () => `${this.meta()?.id ?? ''}:${this.activeSolutionIndex()}`,
  );
  private readonly currentProgress = computed<WalkthroughProgress>(() => {
    const progress = this.progress();
    const key = this.progressKey();
    return progress && progress.key === key ? progress : { key, isStarted: false, stepIndex: 0 };
  });
  readonly isStarted = computed(() => this.currentProgress().isStarted);
  readonly currentStepIndex = computed(() => this.currentProgress().stepIndex);

  readonly currentStep = computed(() => this.steps()[this.currentStepIndex()] ?? null);
  readonly currentState = computed(() => this.currentStep()?.state ?? null);
  readonly stateType = computed(() => this.currentState()?.type);

  /** Called once by the page with its `meta` signal. */
  connect(meta: Signal<AlgorithmMeta | null>): void {
    this.metaSource.set(meta);
  }

  toggleWhy(): void {
    const next = !this.isWhyShown();
    this.isWhyShown.set(next);
    try {
      localStorage.setItem(SHOW_WHY_STORAGE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  selectVariant(index: number): void {
    const meta = this.meta();
    if (!meta || index === this.activeSolutionIndex()) return;
    this.selection.set({ id: meta.id, index });
    this.progress.set(null);
  }

  startViz(): void {
    this.setProgress({ isStarted: true });
  }

  onStepChange(stepIndex: number): void {
    this.setProgress({ isStarted: true, stepIndex });
  }

  onReset(): void {
    this.setProgress({ stepIndex: 0 });
  }

  private setProgress(change: Partial<Pick<WalkthroughProgress, 'isStarted' | 'stepIndex'>>): void {
    this.progress.set({ ...this.currentProgress(), ...change });
  }
}
