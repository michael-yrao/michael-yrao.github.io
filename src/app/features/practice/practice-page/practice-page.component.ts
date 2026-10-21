import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  effect,
  signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { CoachContextService, CoachPracticeSnapshot } from '../../../core/coach/coach-context.service';
import { isCoachOwner } from '../../../core/data/site-links';
import { AttemptMeta, AttemptRecognition, RATING_OPTIONS, parseAttemptFile } from '../../../core/practice/practice-attempt';
import { gateState, recognitionChoices } from '../../../core/practice/recognition-gate';
import { BigOService } from '../../../core/services/big-o.service';
import { PracticeSaveService } from '../../../core/services/practice-save.service';
import { ProgressService } from '../../../core/services/progress.service';
import { todayLocalISO } from '../../../core/utils/local-date';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import type { PracticeProblem } from '../../../core/models/practice.model';
import type { RepoRef } from '../../../core/services/github-file.service';
import { RunState } from '../../../core/runner/runner.model';
import { lockedProblem } from '../../interview/session/candidate-lock';
import { CaseResultsComponent } from '../../../shared/components/case-results/case-results.component';
import { CodeEditorComponent } from '../../../shared/components/code-editor/code-editor.component';
import { PracticeDescriptionComponent } from '../../../shared/components/practice-description/practice-description.component';
import { PracticeHeaderComponent } from '../practice-header/practice-header.component';
import { CompleteRepPanelComponent, CompletedRep, ReferenceBounds } from '../complete-rep-panel/complete-rep-panel.component';
import { injectPracticeProblem } from '../practice-problem';
import { loadPick, savePick } from '../practice-pick';
import { RECOGNITION_MARKS, RecognitionGateComponent } from '../recognition-gate/recognition-gate.component';
import { MAX_SOLUTION_TABS, SolutionTabs, loadDraftStamp, loadTabs, saveTabs } from '../practice-tabs';
import { activeCaseIndex, countPassed, errorLine, toResultRow } from '../../../shared/utils/practice-results';
import { SAMPLE_CASE_COUNT, shortcutFor } from '../../../shared/utils/practice-shortcuts';
import {
  DEFAULT_PROBLEM_SHARE,
  KEYBOARD_STEP,
  MAX_OUTPUT_SHARE,
  MAX_PROBLEM_SHARE,
  MIN_OUTPUT_SHARE,
  MIN_PROBLEM_SHARE,
  OUTPUT_SPEC,
  clampShare,
  loadShare,
  saveShare,
  shareFromPointer,
} from '../../../shared/utils/practice-split';

const DRAFT_SAVE_DELAY_MS = 500;
const COPY_FEEDBACK_MS = 1500;
const COPY_OK_MARK = '✓';
const COPY_FAIL_MARK = '✗';
const PERCENT = 100;
const RESET_CONFIRM = 'Reset this solution to the starter code?';
const closeConfirm = (position: number): string => `Close Solution ${position}? Its code will be deleted.`;

@Component({
  selector: 'app-practice-page',
  templateUrl: './practice-page.component.html',
  styleUrls: ['./practice-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CaseResultsComponent,
    CodeEditorComponent,
    CompleteRepPanelComponent,
    PracticeDescriptionComponent,
    PracticeHeaderComponent,
    RecognitionGateComponent,
  ],
  // Host metadata rather than @HostListener: another runtime symbol would land in the initial bundle.
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class PracticePageComponent {
  private readonly runner = inject(PythonRunnerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly saver = inject(PracticeSaveService);
  private readonly coachContext = inject(CoachContextService);
  protected readonly bigO = inject(BigOService);
  private readonly progress = inject(ProgressService);

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
  readonly entry = this.view.entry;
  readonly meta = this.view.meta;
  readonly hasProblem = this.view.hasProblem;
  readonly title = this.view.title;
  readonly titleUrl = this.view.titleUrl;
  readonly neighbors = this.view.neighbors;
  readonly catalogue = this.view.catalogue;

  /** The header's Solution tab: hidden while a live candidate lock names this problem. Re-reads
   *  storage whenever the problem number changes. */
  protected readonly hasSolution = computed(() => {
    const number = this.number();
    return this.entry() !== null && !(number !== null && lockedProblem() === number);
  });

  /** Read once per problem: the saved tabs (an old single draft becomes Solution 1), else the stub. */
  private readonly savedTabs = computed<SolutionTabs>(() => {
    const ref = this.ref();
    const problem = this.problem();
    if (!ref || !problem) return { texts: [''], active: 0 };
    return loadTabs(ref, problem.number, problem.stub);
  });

  /** Read once per problem by the editor: the open tab's saved text. */
  readonly initialText = computed(() => this.savedTabs().texts[this.savedTabs().active]);

  /** The tabs the learner has changed (typed, added, closed, switched) for one problem; null until
   *  they do. Tagged with its problem so it never leaks onto another problem. */
  private readonly edited = signal<{ number: number; tabs: SolutionTabs } | null>(null);

  readonly tabs = computed<SolutionTabs>(() => {
    const edited = this.edited();
    return edited && edited.number === this.problem()?.number ? edited.tabs : this.savedTabs();
  });

  /** The editor's current text: the open tab's. */
  private readonly text = computed(() => this.tabs().texts[this.tabs().active]);

  readonly canAddTab = computed(() => this.tabs().texts.length < MAX_SOLUTION_TABS);
  readonly canCloseTab = computed(() => this.tabs().texts.length > 1);

  readonly runState = signal<RunState | null>(null);
  readonly isBusy = computed(() => {
    const state = this.runState()?.status;
    return state === 'loading' || state === 'running';
  });
  readonly isLoadingPython = computed(() => this.runState()?.status === 'loading');
  readonly passedCount = computed(() => countPassed(this.runState()?.results ?? []));
  /** The tab the learner clicked; null until they click, so the default follows the first failure. */
  readonly selectedCase = signal<number | null>(null);
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

  /** The Output pane's fraction of the work column's height, read once from the viewer's saved value. */
  readonly outputShare = signal(loadShare(OUTPUT_SPEC));
  readonly minOutputPercent = MIN_OUTPUT_SHARE * PERCENT;
  readonly maxOutputPercent = MAX_OUTPUT_SHARE * PERCENT;
  readonly outputSharePercent = computed(() => Math.round(this.outputShare() * PERCENT));
  /** The editor and Output share the column only while both are showing. */
  readonly isOutputResizable = computed(() => this.isOutputOpen() && this.isCodeOpen() && this.runState() !== null);

  /** The code and problem the last Run was asked to run. */
  private readonly lastRun = signal<{ number: number; code: string } | null>(null);

  /** Saving shows only for the signed-in viewer who owns the loaded practice repo. */
  readonly canSave = computed(() => {
    const ref = this.ref();
    const login = this.auth.login();
    if (!this.auth.isSignedIn() || ref === null || login === null || this.problem() === null) return false;
    return ref.owner.toLowerCase() === login.toLowerCase();
  });

  /** The progress the gate reads is for this page's repo (owner and repo, case-insensitive). */
  private readonly isProgressForRepo = computed(() => this.isThisRepo(this.progress.source()));

  /** The details the gate reads were loaded from this page's repo. */
  private readonly isDetailsForRepo = computed(() => this.isThisRepo(this.progress.detailsSource()));

  /** The problems already done in this repo; null until known, which keeps the gate shut. */
  private readonly doneNumbers = computed<ReadonlySet<number> | null>(() => {
    const details = this.progress.details();
    if (!this.isDetailsForRepo() || this.progress.detailsStatus() !== 'ready' || details === null) return null;
    return new Set(details.map((p) => p.lcNumber));
  });

  protected readonly choices = computed(() =>
    this.isProgressForRepo() ? recognitionChoices(this.progress.data()?.techniques ?? []) : [],
  );

  /** With nothing to pick from (the summary failed, is empty, or lists no technique) the gate stays open. */
  private readonly hasNothingToPick = computed(() => {
    if (!this.isProgressForRepo()) return false;
    const status = this.progress.status();
    return status === 'error' || status === 'empty' || (status === 'ready' && this.choices().length === 0);
  });

  /** The technique picked for this problem: made on this page, else the one stored today. */
  private readonly madePick = signal<{ number: number; pick: AttemptRecognition } | null>(null);
  protected readonly pick = computed<AttemptRecognition | null>(() => {
    const ref = this.ref();
    const number = this.problem()?.number;
    if (!ref || number === undefined) return null;
    const made = this.madePick();
    return made?.number === number ? made.pick : loadPick(ref, number, todayLocalISO());
  });

  protected readonly isLocked = computed(() => {
    const number = this.problem()?.number;
    if (number === undefined || this.hasNothingToPick()) return false;
    return gateState({ canSave: this.canSave(), number, doneNumbers: this.doneNumbers(), pick: this.pick() }) === 'locked';
  });

  protected readonly marks = RECOGNITION_MARKS;

  readonly saveStatus = computed(() => this.saver.statusFor(this.number() ?? 0));
  readonly installUrl = `https://github.com/apps/${this.auth.appSlug}/installations/new`;
  readonly isCompleting = signal(false);
  /** The rep each problem was last marked complete with, for the marks beside the status. */
  private readonly completedReps = signal<Readonly<Record<number, CompletedRep>>>({});

  /** The latest Run on this problem, once finished: how many cases it ran and passed. */
  private readonly latestTally = computed(() => {
    const state = this.runState();
    const run = this.lastRun();
    if (!state || state.status !== 'done' || state.runError || run?.number !== this.number()) return null;
    const total = this.runCaseCount();
    return state.results.length === total && total > 0 ? { passed: this.passedCount(), total } : null;
  });

  /** Mark Complete: the latest Run passed every case it ran, on exactly the code now in the editor. */
  readonly canMarkComplete = computed(() => {
    const tally = this.latestTally();
    const isSameCode = this.lastRun()?.code === this.text();
    const isFullRun = tally?.total === this.problem()?.cases.length;
    return tally !== null && isFullRun && tally.passed === tally.total && isSameCode && this.saveStatus().state !== 'saving';
  });

  /** The finished run the coach sees: the tally plus each case's raw verdict; null until a run has finished. */
  private readonly coachRun = computed<CoachPracticeSnapshot['run']>(() => {
    const tally = this.latestTally();
    if (!tally) return null;
    return { ...tally, verdicts: this.runState()?.results.map((result) => result.verdict) ?? [] };
  });

  /** Mark Complete needs the Big-O reference loaded as well, since the dialog judges against it. */
  readonly canCompleteRep = computed(() => this.canMarkComplete() && this.bigO.status() === 'ready');

  /** This problem's reference bounds from big-o.json; null when it has no entry. */
  readonly reference = computed<ReferenceBounds | null>(() => {
    const entry = this.bigO.entryFor(this.number() ?? 0);
    return entry === null
      ? null
      : { time: entry.time, space: entry.space, whyTime: entry.whyTime, whySpace: entry.whySpace };
  });

  /** `<comfort emoji> · <time> / <space>` once this problem was marked complete from this page. */
  readonly completedMarks = computed(() => {
    const rep = this.completedReps()[this.number() ?? 0];
    const label = rep === undefined ? undefined : RATING_OPTIONS.find((option) => option.rating === rep.rating)?.label;
    if (rep === undefined || label === undefined) return '';
    return ` · ${Array.from(label)[0]} · ${rep.complexity.time} / ${rep.complexity.space}`;
  });

  private runSubscription: Subscription | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const ref = this.ref();
      if (ref) untracked(() => this.bigO.load(ref));
      const number = this.problem()?.number;
      if (!this.canSave() || !ref || number === undefined) return;
      untracked(() => {
        this.progress.loadSummary(`${ref.owner}/${ref.repo}@${ref.branch}`);
        this.progress.loadDetails();
        void this.loadRemote(ref, number);
      });
    });
    effect(() => {
      const problem = this.problem();
      if (!isCoachOwner(this.auth.login()) || !problem) {
        untracked(() => this.coachContext.clear());
        return;
      }
      this.coachContext.publish({ number: problem.number, title: problem.title, code: this.text(), run: this.coachRun() });
    });
    this.destroyRef.onDestroy(() => this.coachContext.clear());
    this.destroyRef.onDestroy(() => this.flushPendingSave());
    this.destroyRef.onDestroy(() => {
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.runSubscription?.unsubscribe();
    });
  }

  /** Owner and repo match this page's repo, case-insensitive. */
  private isThisRepo(other: RepoRef | null): boolean {
    const ref = this.ref();
    return ref !== null && other !== null && `${other.owner}/${other.repo}`.toLowerCase() === `${ref.owner}/${ref.repo}`.toLowerCase();
  }

  onTextChange(text: string): void {
    const problem = this.problem();
    if (!problem || text === this.text()) return;
    const { texts, active } = this.tabs();
    this.edited.set({ number: problem.number, tabs: { texts: texts.map((t, i) => (i === active ? text : t)), active } });
    this.cancelPendingSave();
    this.saveTimer = setTimeout(() => this.flushPendingSave(), DRAFT_SAVE_DELAY_MS);
  }

  onShortcut(event: KeyboardEvent): void {
    if (this.isLocked()) return;
    const shortcut = shortcutFor(event);
    if (shortcut === null) return;
    event.preventDefault();
    if (shortcut === 'all') this.run();
    else this.runSample();
  }

  /** The gate's choice: final for the day, so a pick that exists is never replaced. */
  protected onPick(name: string): void {
    const ref = this.ref();
    const number = this.problem()?.number;
    if (!ref || number === undefined || this.pick() !== null) return;
    this.setPick(ref, number, { picked: name, at: new Date().toISOString() });
  }

  private setPick(ref: RepoRef, number: number, pick: AttemptRecognition): void {
    this.madePick.set({ number, pick });
    savePick(ref, number, pick, todayLocalISO());
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
    this.isCompleting.set(false);
    this.lastRun.set({ number: problem.number, code: this.text() });
    this.runCaseCount.set(cases.length);
    this.isOutputOpen.set(true);
    this.runSubscription = this.runner.run(this.text(), { ...problem, cases }).subscribe({
      next: (state) => this.showRunState(state),
      error: (err: unknown) => {
        console.error(`Practice run failed for #${problem.number}`, err);
        const message = err instanceof Error ? err.message : String(err);
        this.showRunState({ status: 'done', results: [], runError: message });
      },
    });
  }

  private showRunState(state: RunState): void {
    this.runState.set(state);
    this.syncErrorLine();
  }

  /** A click on a case tab in Output: the tinted line follows the case shown. */
  selectCase(index: number | null): void {
    this.selectedCase.set(index);
    this.syncErrorLine();
  }

  /** Tints the editor line that raised the error shown in Output (a run error, else the shown case's). */
  private syncErrorLine(): void {
    this.editor?.setErrorLine(errorLine(this.shownErrorMessage()));
  }

  private shownErrorMessage(): string | null {
    const state = this.runState();
    const problem = this.problem();
    if (!state || !problem) return null;
    if (state.runError) return state.runError;
    const rows = state.results.map((result) => toResultRow(result, problem.cases, problem.types?.result ?? null));
    return rows[activeCaseIndex(rows, this.selectedCase())]?.errorMessage ?? null;
  }

  reset(): void {
    const problem = this.problem();
    if (!problem || !window.confirm(RESET_CONFIRM)) return;
    const { texts, active } = this.tabs();
    this.openTabs({ texts: texts.map((text, i) => (i === active ? problem.stub : text)), active });
  }

  addTab(): void {
    const problem = this.problem();
    if (!problem || !this.canAddTab()) return;
    const { texts } = this.tabs();
    this.openTabs({ texts: [...texts, problem.stub], active: texts.length });
  }

  selectTab(index: number): void {
    const { texts, active } = this.tabs();
    if (index === active) return;
    this.openTabs({ texts, active: index });
  }

  closeTab(index: number): void {
    const problem = this.problem();
    const { texts, active } = this.tabs();
    if (!problem || texts.length < 2) return;
    if (texts[index] !== problem.stub && !window.confirm(closeConfirm(index + 1))) return;
    const remaining = texts.filter((_, i) => i !== index);
    const nextActive = index < active ? active - 1 : Math.min(active, remaining.length - 1);
    const next = { texts: remaining, active: nextActive };
    // Closing another tab leaves the open code, its cursor and its Output alone.
    if (index === active) this.openTabs(next);
    else this.commitTabs(next);
  }

  private commitTabs(tabs: SolutionTabs): void {
    const problem = this.problem();
    if (!problem) return;
    this.edited.set({ number: problem.number, tabs });
    this.persistTabs();
  }

  /** Saves `tabs` and puts its open tab's text in the editor. Output belongs to the code that
   *  ran, so a run in flight is dropped and the results cleared. */
  private openTabs(tabs: SolutionTabs): void {
    this.commitTabs(tabs);
    this.runSubscription?.unsubscribe();
    this.runState.set(null);
    this.selectedCase.set(null);
    this.editor?.setText(tabs.texts[tabs.active]);
    this.editor?.setErrorLine(null);
  }

  saveToGithub(): void {
    this.saveAttempt({ complete: false, rating: null, tests: this.testsLabel(), complexity: null });
  }

  toggleCompleteRep(): void {
    if (this.isCompleting()) {
      this.isCompleting.set(false);
      return;
    }
    if (!this.canCompleteRep()) return;
    this.isCompleting.set(true);
    this.isOutputOpen.set(true);
  }

  completeRep(rep: CompletedRep): void {
    this.isCompleting.set(false);
    const number = this.number();
    if (number !== null) this.completedReps.update((all) => ({ ...all, [number]: rep }));
    this.saveAttempt({ complete: true, rating: rep.rating, tests: this.testsLabel(), complexity: rep.complexity });
  }

  private testsLabel(): string | null {
    const tally = this.latestTally();
    return tally === null ? null : `${tally.passed}/${tally.total}`;
  }

  private saveAttempt(meta: AttemptMeta): void {
    const ref = this.ref();
    const problem = this.problem();
    if (!this.canSave() || !ref || !problem) return;
    void this.saver.save(ref, problem, this.text(), { ...meta, recognition: this.pick() });
  }

  /** Loads the newest GitHub copy into the open tab when it is newer than the local draft. A legacy
   *  draft with no time keeps winning, and so does anything typed while the request was out. */
  private async loadRemote(ref: RepoRef, number: number): Promise<void> {
    const content = await this.saver.latest(ref, number);
    const remote = content === null ? null : parseAttemptFile(content);
    if (remote === null || this.problem()?.number !== number) return;
    if (remote.recognition !== null && this.pick() === null) this.setPick(ref, number, remote.recognition);
    if (this.edited()?.number === number) return;
    const draft = loadDraftStamp(ref, number);
    if (draft.exists && (draft.savedAt === null || draft.savedAt >= remote.savedAt)) return;
    const { texts, active } = this.tabs();
    this.openTabs({ texts: texts.map((text, i) => (i === active ? remote.code : text)), active });
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

  dragOutput(event: PointerEvent): void {
    if (!this.isDragging()) return;
    const work = (event.currentTarget as HTMLElement).parentElement;
    if (!work) return;
    const { bottom, height } = work.getBoundingClientRect();
    this.outputShare.set(shareFromPointer(bottom - event.clientY, 0, height, OUTPUT_SPEC));
  }

  endOutputDrag(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    saveShare(this.outputShare(), OUTPUT_SPEC);
  }

  onOutputDividerKey(event: KeyboardEvent): void {
    const direction = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
    if (direction === 0) return;
    event.preventDefault();
    this.setOutputShare(this.outputShare() + direction * KEYBOARD_STEP);
  }

  resetOutputShare(): void {
    this.setOutputShare(OUTPUT_SPEC.fallback);
  }

  private setOutputShare(share: number): void {
    const next = clampShare(share, OUTPUT_SPEC);
    this.outputShare.set(next);
    saveShare(next, OUTPUT_SPEC);
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

  /** Writes the tabs now if a debounced save is waiting (also run when the page is left). */
  private flushPendingSave(): void {
    if (this.saveTimer === null) return;
    this.persistTabs();
  }

  private persistTabs(): void {
    this.cancelPendingSave();
    const ref = this.ref();
    const problem = this.problem();
    if (ref && problem) saveTabs(ref, problem.number, this.tabs());
  }
}
