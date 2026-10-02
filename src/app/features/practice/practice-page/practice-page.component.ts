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
import { ActivatedRoute } from '@angular/router';
import { Subscription, map } from 'rxjs';

import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { RunState } from '../../../core/runner/runner.model';
import { PracticeService } from '../../../core/services/practice.service';
import { figureStateFor } from '../../../core/practice/example-figure';
import { TextRun, splitInlineCode } from '../../../core/practice/inline-code';
import { splitStatement } from '../../../core/practice/statement-segments';
import { GraphState, GridState } from '../../../core/models/algorithm.model';
import { GraphVisualizerComponent } from '../../../shared/visualizers/graph-visualizer/graph-visualizer.component';
import { GridVisualizerComponent } from '../../../shared/visualizers/grid-visualizer/grid-visualizer.component';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { injectPracticeContract } from '../practice-contract';
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

/** One example case's input drawn as a diagram, captioned by its place among the examples. */
export interface ExampleFigure {
  readonly number: number;
  readonly caption: string;
  readonly state: GraphState | GridState;
}

/** One block of the statement card, in reading order: a segment's text with the diagram drawn
 *  right under it when the segment is that diagram's example, or (text null) a diagram whose
 *  `Example N:` the statement never names, captioned since no text names it. */
export interface StatementBlock {
  readonly text: string | null;
  /** The text split into plain and inline-code runs; empty when there is no text. */
  readonly runs: readonly TextRun[];
  readonly figure: ExampleFigure | null;
  readonly isCaptioned: boolean;
}

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
  imports: [CodeEditorComponent, GraphVisualizerComponent, GridVisualizerComponent],
})
export class PracticePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly practice = inject(PracticeService);
  private readonly runner = inject(PythonRunnerService);
  private readonly destroyRef = inject(DestroyRef);

  // A decorator query, not viewChild(): the signal-query helper is another runtime symbol
  // that would land in the initial bundle.
  @ViewChild('editor') private editor?: CodeEditorComponent;

  private readonly contract = injectPracticeContract();
  private readonly numberParam = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('number'))),
    { initialValue: this.route.snapshot.paramMap.get('number') },
  );

  readonly ref = this.contract.ref;
  readonly invalidSlug = this.contract.invalidSlug;
  readonly rawNumber = computed(() => this.numberParam() ?? '');
  readonly contractStatus = this.contract.status;
  readonly error = this.contract.error;

  readonly problem = computed(() => {
    const number = parseProblemNumber(this.numberParam());
    if (number === null || this.contractStatus() !== 'ready') return null;
    return this.practice.problemFor(number);
  });

  /** A diagram per `example: true` case whose arguments fit the problem's `figure`, in case
   *  order. Empty when the problem has no figure. */
  readonly exampleFigures = computed<readonly ExampleFigure[]>(() => {
    const problem = this.problem();
    const figure = problem?.figure;
    if (!problem || !figure) return [];
    const examples = problem.cases.filter((c) => c.example);
    return examples.flatMap((c, i) => {
      const state = figureStateFor(figure, c.args);
      return state ? [{ number: i + 1, caption: `Example ${i + 1}`, state }] : [];
    });
  });

  /** The statement's segments in order, each example carrying its own diagram; a diagram whose
   *  `Example N:` the statement lacks follows the last segment, so none is dropped. */
  readonly statementBlocks = computed<readonly StatementBlock[]>(() => {
    const segments = splitStatement(this.problem()?.statement ?? '');
    const placements = this.exampleFigures().map((figure) => ({
      figure,
      index: segments.findIndex((s) => s.exampleNumber === figure.number),
    }));
    const placed = segments.map((s, i) => ({
      text: s.text,
      runs: splitInlineCode(s.text),
      figure: placements.find((p) => p.index === i)?.figure ?? null,
      isCaptioned: false,
    }));
    const unplaced = placements
      .filter((p) => p.index < 0)
      .map((p) => ({ text: null, runs: [], figure: p.figure, isCaptioned: true }));
    return [...placed, ...unplaced];
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
