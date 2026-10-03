import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import type { Extension } from '@codemirror/state';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import type { PracticeProblem } from '../../../core/models/practice.model';
import { RunState } from '../../../core/runner/runner.model';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { JOIN_PARAM, InterviewSessionService } from '../interview/interview-session.service';
import { PracticeDescriptionComponent } from '../practice-description/practice-description.component';
import { PracticeHeaderComponent } from '../practice-header/practice-header.component';
import { injectPracticeProblem } from '../practice-problem';
import { clearDraft, draftKey, loadDraft, saveDraft } from '../practice-draft';
import { countPassed, defaultCaseIndex, toResultRow } from '../practice-results';
import { SAMPLE_CASE_COUNT, shortcutFor } from '../practice-shortcuts';
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
const PERCENT = 100;

@Component({
  selector: 'app-practice-page',
  templateUrl: './practice-page.component.html',
  styleUrls: ['./practice-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditorComponent, PracticeDescriptionComponent, PracticeHeaderComponent],
  // Host metadata rather than @HostListener: another runtime symbol would land in the initial bundle.
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class PracticePageComponent {
  private readonly runner = inject(PythonRunnerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  protected readonly session = inject(InterviewSessionService);

  // A decorator query, not viewChild(): the signal-query helper is another runtime symbol
  // that would land in the initial bundle.
  @ViewChild('editor') private editor?: CodeEditorComponent;

  private readonly view = injectPracticeProblem();
  readonly ref = this.view.ref;
  readonly invalidSlug = this.view.invalidSlug;
  readonly rawNumber = this.view.rawNumber;
  readonly contractStatus = this.view.contractStatus;
  readonly error = this.view.error;
  readonly contractMessage = this.view.contractMessage;
  readonly number = this.view.number;
  readonly problem = this.view.problem;
  readonly meta = this.view.meta;
  readonly hasProblem = this.view.hasProblem;
  readonly title = this.view.title;
  readonly titleUrl = this.view.titleUrl;
  readonly neighbors = this.view.neighbors;

  /** A session pins the page to one problem and never touches the learner's own draft. */
  readonly isInSession = computed(() => this.session.role() !== 'none');
  readonly isCandidate = computed(() => this.session.role() === 'candidate');

  /** The session editor's extensions, built once per shared document: a fresh array on every
   *  evaluation would trip the dev-mode no-changes check. */
  protected readonly sessionExtensions = computed<readonly Extension[]>(() =>
    this.session.sharedDoc() ? this.session.collabExtensions() : [],
  );

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
  private readonly edited = signal<{ number: number; text: string; isSession: boolean } | null>(null);

  /** The editor's current text. */
  private readonly text = computed(() => {
    const edited = this.edited();
    if (edited && edited.number === this.problem()?.number && edited.isSession === this.isInSession()) {
      return edited.text;
    }
    return this.isInSession() ? (this.session.sharedDoc()?.doc ?? '') : this.initialText();
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
  /** The tab the learner clicked; null until they click, so the default follows the first failure. */
  readonly selectedCase = signal<number | null>(null);
  readonly activeIndex = computed(() => {
    const selected = this.selectedCase();
    return selected !== null && selected < this.rows().length ? selected : defaultCaseIndex(this.rows());
  });
  readonly activeRow = computed(() => this.rows()[this.activeIndex()] ?? null);
  readonly copyMark = signal<string | null>(null);
  /** How many cases the last run was asked to run (all of them, or the sample). */
  readonly runCaseCount = signal(0);

  readonly isProblemOpen = signal(true);
  readonly isCodeOpen = signal(true);
  readonly isOutputOpen = signal(false);

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
    this.joinFromUrl();
    this.destroyRef.onDestroy(() => {
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.runSubscription?.unsubscribe();
    });
  }

  onTextChange(text: string): void {
    const problem = this.problem();
    if (!problem || text === this.text()) return;
    this.edited.set({ number: problem.number, text, isSession: this.isInSession() });
    this.cancelPendingSave();
    if (this.isInSession()) return;
    this.saveTimer = setTimeout(() => this.flushPendingSave(), DRAFT_SAVE_DELAY_MS);
  }

  onShortcut(event: KeyboardEvent): void {
    const shortcut = shortcutFor(event);
    if (shortcut === null) return;
    event.preventDefault();
    if (shortcut === 'all') this.run();
    else this.runSample();
  }

  toggleProblem(): void {
    this.isProblemOpen.update((isOpen) => !isOpen);
  }

  toggleCode(): void {
    this.isCodeOpen.update((isOpen) => !isOpen);
  }

  toggleOutput(): void {
    this.isOutputOpen.update((isOpen) => !isOpen);
  }

  run(): void {
    const problem = this.problem();
    if (problem) this.runCases(problem, problem.cases);
  }

  runSample(): void {
    const problem = this.problem();
    if (problem) this.runCases(problem, problem.cases.slice(0, SAMPLE_CASE_COUNT));
  }

  private runCases(problem: PracticeProblem, cases: PracticeProblem['cases']): void {
    if (this.isBusy()) return;
    this.runSubscription?.unsubscribe();
    this.selectedCase.set(null);
    this.runCaseCount.set(cases.length);
    this.isOutputOpen.set(true);
    this.runSubscription = this.runner.run(this.text(), { ...problem, cases }).subscribe({
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
    this.edited.set({ number: problem.number, text: problem.stub, isSession: this.isInSession() });
    this.editor?.setText(problem.stub);
    const key = this.key();
    if (key && !this.isInSession()) clearDraft(key);
  }

  /** The header's Interview button: the session starts from the stub, never from a draft. */
  startInterview(): void {
    const problem = this.problem();
    if (!problem) return;
    this.flushPendingSave();
    this.edited.set(null);
    this.session
      .start(problem.number, problem.stub, window.location.href)
      .catch((err: unknown) => console.error(`Interview start failed for #${problem.number}`, err));
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

  private joinFromUrl(): void {
    const peerId = this.route.snapshot.queryParamMap.get(JOIN_PARAM);
    const number = this.number();
    if (!peerId || number === null) return;
    this.session
      .join(peerId, number)
      .catch((err: unknown) => console.error(`Interview join failed for #${number}`, err));
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
    if (key && !this.isInSession()) saveDraft(key, this.text());
  }
}
