import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { AlgorithmMeta, Step } from '../../../core/models/algorithm.model';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { buildDisplay } from '../../../core/showcase/display';
import { resolveSteps } from '../../../core/showcase/anchor-resolver';
import { groundednessOf } from '../../../core/showcase/groundedness';
import { showcaseKey } from '../../../core/showcase/showcase-key';
import { ExplanationCardComponent } from '../../../shared/components/explanation-card/explanation-card.component';
import { GroundedCodePanelComponent } from '../../../shared/components/grounded-code-panel/grounded-code-panel.component';
import { StepControlsComponent } from '../../../shared/components/step-controls/step-controls.component';
import { ArrayVisualizerComponent } from '../../../shared/visualizers/array-visualizer/array-visualizer.component';
import { GraphVisualizerComponent } from '../../../shared/visualizers/graph-visualizer/graph-visualizer.component';
import { GridVisualizerComponent } from '../../../shared/visualizers/grid-visualizer/grid-visualizer.component';
import { LinkedListVisualizerComponent } from '../../../shared/visualizers/linked-list-visualizer/linked-list-visualizer.component';
import { TreeVisualizerComponent } from '../../../shared/visualizers/tree-visualizer/tree-visualizer.component';

const SHOW_WHY_STORAGE_KEY = 'po-show-why';

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
 * The Solution tab: variant tabs, the step-by-step visualizer and the grounded solution code,
 * with the problem's tags and time/space complexity above them.
 */
@Component({
  selector: 'app-solution-walkthrough',
  templateUrl: './solution-walkthrough.component.html',
  styleUrls: ['./solution-walkthrough.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ArrayVisualizerComponent,
    GridVisualizerComponent,
    LinkedListVisualizerComponent,
    TreeVisualizerComponent,
    GraphVisualizerComponent,
    ExplanationCardComponent,
    StepControlsComponent,
    GroundedCodePanelComponent,
  ],
})
export class SolutionWalkthroughComponent {
  readonly showcase = inject(ShowcaseService);

  readonly meta = input.required<AlgorithmMeta>();

  readonly isVizShown = signal(true);
  readonly isCodeShown = signal(false);
  readonly isWhyShown = signal(loadShowWhy());

  /** The learner's variant choice, tagged with its problem. */
  private readonly selection = signal<{ id: string; index: number } | null>(null);
  private readonly progress = signal<WalkthroughProgress | null>(null);

  readonly activeSolutionIndex = computed(() => {
    const selection = this.selection();
    return selection && selection.id === this.meta().id ? selection.index : 0;
  });
  readonly activeSolution = computed(() => this.meta().solutions[this.activeSolutionIndex()] ?? null);
  readonly hasMultipleSolutions = computed(() => this.meta().solutions.length > 1);

  readonly steps = computed<Step[]>(() => this.activeSolution()?.generateSteps() ?? []);
  readonly hasVisualization = computed(() => this.steps().length > 0);

  private readonly progressKey = computed(() => `${this.meta().id}:${this.activeSolutionIndex()}`);
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

  // Showcase (grounded solution code) view, recomputed whenever the fetched contract, the
  // problem or the variant changes.
  readonly entry = computed(() => {
    const variant = this.activeSolution();
    if (!this.showcase.data() || !variant) return null;
    return this.showcase.entryFor(showcaseKey(this.meta(), variant));
  });
  readonly rows = computed(() => {
    const entry = this.entry();
    return entry ? buildDisplay(entry) : [];
  });
  readonly resolved = computed(() => resolveSteps(this.rows(), this.steps()));
  readonly groundedness = computed(() => {
    const variant = this.activeSolution();
    const data = this.showcase.data();
    return variant && data ? groundednessOf(this.meta(), variant, data) : null;
  });

  constructor() {
    // Gold-standard only — this view never reads `?repo=` (a step generator is a hand-written
    // trace of one specific attempt, so it cannot follow anyone else's code). A no-op if
    // already loaded/loading this session.
    this.showcase.load();
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

  togglePanel(panel: 'viz' | 'code'): void {
    const shown = panel === 'viz' ? this.isVizShown : this.isCodeShown;
    shown.update((isShown) => !isShown);
  }

  selectSolution(index: number): void {
    if (index === this.activeSolutionIndex()) return;
    this.selection.set({ id: this.meta().id, index });
    this.progress.set(null);
  }

  retryShowcase(): void {
    this.showcase.load(true);
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
