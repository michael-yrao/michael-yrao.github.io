import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { ALL_ALGORITHMS } from '../../../core/data/algorithms.data';
import { leetCodeUrlFor } from '../../../core/data/lc-url';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { RunState } from '../../../core/runner/runner.model';
import { PracticeService } from '../../../core/services/practice.service';
import { ShowcaseService } from '../../../core/services/showcase.service';
import { showcaseKey } from '../../../core/showcase/showcase-key';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { PracticeDescriptionComponent } from '../practice-description/practice-description.component';
import { injectPracticeContract } from '../practice-contract';
import { CatalogueNeighbors, buildCatalogue, neighborsOf } from '../practice-catalogue';
import { PracticeTab, WALKTHROUGH_TABS } from '../practice-route';
import { SolutionCodeComponent } from '../solution-code/solution-code.component';
import { StepVisualizerComponent } from '../step-visualizer/step-visualizer.component';
import { VariantBarComponent } from '../variant-bar/variant-bar.component';
import { WalkthroughStateService } from '../walkthrough-state.service';
import { clearDraft, draftKey, loadDraft, saveDraft } from '../practice-draft';
import { countPassed, toResultRow } from '../practice-results';
import {
  DEFAULT_PROBLEM_SHARE,
  KEYBOARD_STEP,
  MAX_PROBLEM_SHARE,
  MIN_PROBLEM_SHARE,
  clampShare,
  loadShare,
  saveShare,
  shareFromPointer,
} from '../practice-split';

const DRAFT_SAVE_DELAY_MS = 500;
const COPY_FEEDBACK_MS = 1500;
const COPY_OK_MARK = '✓';
const COPY_FAIL_MARK = '✗';
const POSITIVE_INTEGER = /^[1-9]\d*$/;
const PERCENT = 100;

const DESCRIPTION_TAB: PracticeTab = 'description';
const NO_NEIGHBORS: CatalogueNeighbors = { prev: null, next: null };

/** The route's `:number` as a positive integer, or null (the not-found state). */
function parseProblemNumber(raw: string | null): number | null {
  if (raw === null || !POSITIVE_INTEGER.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

@Component({
  selector: 'app-practice-page',
  templateUrl: './practice-page.component.html',
  styleUrls: ['./practice-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgClass,
    RouterLink,
    CodeEditorComponent,
    PracticeDescriptionComponent,
    VariantBarComponent,
    StepVisualizerComponent,
    SolutionCodeComponent,
  ],
  providers: [WalkthroughStateService],
})
export class PracticePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly practice = inject(PracticeService);
  private readonly runner = inject(PythonRunnerService);
  private readonly showcase = inject(ShowcaseService);
  private readonly destroyRef = inject(DestroyRef);

  // A decorator query, not viewChild(): the signal-query helper is another runtime symbol
  // that would land in the initial bundle.
  @ViewChild('editor') private editor?: CodeEditorComponent;

  private readonly contract = injectPracticeContract();
  private readonly params = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly numberParam = computed(() => this.params().get('number'));
  private readonly tabParam = computed(() => this.params().get('tab'));

  readonly ref = this.contract.ref;
  readonly invalidSlug = this.contract.invalidSlug;
  readonly rawNumber = computed(() => this.numberParam() ?? '');
  readonly contractStatus = this.contract.status;
  readonly error = this.contract.error;

  /** The contract's own message (bad slug or failed load), as the list page shows it. */
  readonly contractMessage = computed(() => {
    const invalid = this.invalidSlug();
    if (invalid) return invalid;
    return this.contractStatus() === 'error' ? this.error() : null;
  });

  readonly number = computed(() => parseProblemNumber(this.numberParam()));

  /** The contract's problem for the number, once the contract is ready. */
  readonly problem = computed(() => {
    const number = this.number();
    if (number === null || this.contractStatus() !== 'ready') return null;
    return this.practice.problemFor(number);
  });

  /** The number's static algorithm, when `ALL_ALGORITHMS` has it: the Visualizer and Code tabs' source. */
  readonly meta = computed(() => {
    const number = this.number();
    if (number === null) return null;
    return ALL_ALGORITHMS.find((algorithm) => algorithm.lcNumber === number) ?? null;
  });

  /** Either source has the number, so the page can draw; a static-only number never waits for
   *  the contract. */
  readonly hasProblem = computed(() => this.problem() !== null || this.meta() !== null);

  readonly activeTab = computed<PracticeTab>(() => {
    const tab = WALKTHROUGH_TABS.find((candidate) => candidate === this.tabParam());
    return tab !== undefined && this.meta() !== null ? tab : DESCRIPTION_TAB;
  });

  /** The contract's title wins, as in the catalogue. */
  readonly title = computed(() => this.problem()?.title ?? this.meta()?.title ?? '');
  /** The contract's URL, else the showcase entry's for the first variant, else the number's. */
  readonly titleUrl = computed(() =>
    leetCodeUrlFor(this.problem()?.url ?? this.firstVariantEntryUrl(), this.meta()?.lcNumber),
  );

  private readonly firstVariantEntryUrl = computed(() => {
    const meta = this.meta();
    const variant = meta?.solutions[0];
    if (!meta || !variant || !this.showcase.data()) return undefined;
    return this.showcase.entryFor(showcaseKey(meta, variant))?.url;
  });

  readonly neighbors = computed(() => {
    const number = this.number();
    const problems = this.contractStatus() === 'ready' ? (this.practice.data()?.problems ?? []) : [];
    if (number === null) return NO_NEIGHBORS;
    return neighborsOf(buildCatalogue(ALL_ALGORITHMS, problems), number);
  });

  private readonly key = computed(() => {
    const ref = this.ref();
    const problem = this.problem();
    return ref && problem ? draftKey(ref, problem.number) : null;
  });

  /** Read once per problem by the editor: a saved draft wins over the stub. */
  readonly initialText = computed(() => {
    const problem = this.problem();
    if (!problem) return '';
    const key = this.key();
    return (key ? loadDraft(key) : null) ?? problem.stub;
  });

  /** What the learner has typed (or Reset to) for one problem; null until they do. Tagged
   *  with its problem so it never leaks onto another problem. */
  private readonly edited = signal<{ number: number; text: string } | null>(null);

  /** The editor's current text. */
  private readonly text = computed(() => {
    const edited = this.edited();
    return edited && edited.number === this.problem()?.number ? edited.text : this.initialText();
  });

  readonly runState = signal<RunState | null>(null);
  readonly isBusy = computed(() => {
    const state = this.runState()?.status;
    return state === 'loading' || state === 'running';
  });
  readonly isLoadingPython = computed(() => this.runState()?.status === 'loading');
  readonly rows = computed(() => {
    const cases = this.problem()?.cases ?? [];
    return (this.runState()?.results ?? []).map((result) => toResultRow(result, cases));
  });
  readonly passedCount = computed(() => countPassed(this.runState()?.results ?? []));
  readonly copyMark = signal<string | null>(null);

  /** The left pane's fraction of the split's width, read once from the viewer's saved value. */
  readonly problemShare = signal(loadShare());
  readonly isDragging = signal(false);
  readonly minPercent = MIN_PROBLEM_SHARE * PERCENT;
  readonly maxPercent = MAX_PROBLEM_SHARE * PERCENT;
  readonly sharePercent = computed(() => Math.round(this.problemShare() * PERCENT));
  /** Grid track sizes in percent weights, which always sum to at least 1fr. */
  readonly problemTrack = computed(() => `${this.problemShare() * PERCENT}fr`);
  readonly workTrack = computed(() => `${(1 - this.problemShare()) * PERCENT}fr`);

  private runSubscription: Subscription | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(WalkthroughStateService).connect(this.meta);
    // The title link and the Code tab both read the showcase, so load it for every tab.
    // Gold-standard only — the walkthrough never reads `?repo=` (a step generator is a
    // hand-written trace of one specific attempt, so it cannot follow anyone else's code).
    // A no-op if already loaded/loading this session.
    this.showcase.load();
    this.destroyRef.onDestroy(() => this.flushPendingSave());
    this.destroyRef.onDestroy(() => {
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.runSubscription?.unsubscribe();
    });
  }

  onTextChange(text: string): void {
    const problem = this.problem();
    if (!problem || text === this.text()) return;
    this.edited.set({ number: problem.number, text });
    this.cancelPendingSave();
    this.saveTimer = setTimeout(() => this.flushPendingSave(), DRAFT_SAVE_DELAY_MS);
  }

  run(): void {
    const problem = this.problem();
    if (!problem || this.isBusy()) return;
    this.runSubscription?.unsubscribe();
    this.runSubscription = this.runner.run(this.text(), problem).subscribe({
      next: (state) => this.runState.set(state),
      error: (err: unknown) => {
        console.error(`Practice run failed for #${problem.number}`, err);
        const message = err instanceof Error ? err.message : String(err);
        this.runState.set({ status: 'done', results: [], runError: message });
      },
    });
  }

  reset(): void {
    const problem = this.problem();
    if (!problem) return;
    this.cancelPendingSave();
    this.edited.set({ number: problem.number, text: problem.stub });
    this.editor?.setText(problem.stub);
    const key = this.key();
    if (key) clearDraft(key);
  }

  copy(): void {
    const failCopy = (err: unknown): void => {
      console.error('Practice copy: clipboard write failed', err);
      this.showCopyMark(COPY_FAIL_MARK);
    };
    // `navigator.clipboard` is undefined in an insecure context or an unsupported browser.
    if (!navigator.clipboard) {
      failCopy(new Error('navigator.clipboard is unavailable'));
      return;
    }
    navigator.clipboard.writeText(this.text()).then(() => this.showCopyMark(COPY_OK_MARK), failCopy);
  }

  startDrag(event: PointerEvent): void {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
    this.isDragging.set(true);
  }

  drag(event: PointerEvent): void {
    if (!this.isDragging()) return;
    const split = (event.currentTarget as HTMLElement).parentElement;
    if (!split) return;
    const { left, width } = split.getBoundingClientRect();
    this.problemShare.set(shareFromPointer(event.clientX, left, width));
  }

  endDrag(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    saveShare(this.problemShare());
  }

  onDividerKey(event: KeyboardEvent): void {
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    this.setShare(this.problemShare() + direction * KEYBOARD_STEP);
  }

  resetShare(): void {
    this.setShare(DEFAULT_PROBLEM_SHARE);
  }

  private setShare(share: number): void {
    const next = clampShare(share);
    this.problemShare.set(next);
    saveShare(next);
  }

  private showCopyMark(mark: string): void {
    this.copyMark.set(mark);
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.copyMark.set(null), COPY_FEEDBACK_MS);
  }

  private cancelPendingSave(): void {
    if (this.saveTimer === null) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
  }

  /** Writes the draft now if a debounced save is waiting (also run when the page is left). */
  private flushPendingSave(): void {
    if (this.saveTimer === null) return;
    this.cancelPendingSave();
    const key = this.key();
    if (key) saveDraft(key, this.text());
  }
}
