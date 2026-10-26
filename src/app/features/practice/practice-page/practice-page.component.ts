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
import {
  AttemptMeta,
  RATING_OPTIONS,
  attemptPath,
  buildAttemptFile,
  parseAttemptFile,
} from '../../../core/practice/practice-attempt';
import { BigOService } from '../../../core/services/big-o.service';
import { PracticeSaveService } from '../../../core/services/practice-save.service';
import { TodaySessionService } from '../../../core/today-session/today-session.service';
import { ProvisionalRepService } from '../../../core/services/provisional-rep.service';
import { addRecord } from '../../../core/services/provisional-records';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import type { PracticeProblem } from '../../../core/models/practice.model';
import type { RepoRef } from '../../../core/services/github-file.service';
import { RunState } from '../../../core/runner/runner.model';
import { lockedProblem } from '../../interview/session/candidate-lock';
import { CaseResultsComponent } from '../../../shared/components/case-results/case-results.component';
import { CodeEditorComponent } from '../../../shared/components/code-editor/code-editor.component';
import { CodeViewerComponent } from '../../../shared/components/code-viewer/code-viewer.component';
import { PracticeDescriptionComponent } from '../../../shared/components/practice-description/practice-description.component';
import { PracticeHeaderComponent } from '../practice-header/practice-header.component';
import { CompleteRepPanelComponent, CompletedRep, ReferenceBounds } from '../complete-rep-panel/complete-rep-panel.component';
import { injectPracticeProblem } from '../practice-problem';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import type { IconName } from '../../../shared/components/icon/icon-paths';
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
const COPY_OK_ICON: IconName = 'check';
const COPY_FAIL_ICON: IconName = 'x';
const COPY_ICON_SIZE_PX = 14;
const COMPLETE_REP_ICON: IconName = 'check';
const PERCENT = 100;
const RESET_CONFIRM = 'Reset this solution to the starter code?';
const LEAVE_CONFIRM = 'Leave without rating? The rep is saved as unrated.';
/** How long leaving waits for the provisional save before it lets the navigation through. */
const PROVISIONAL_SAVE_TIMEOUT_MS = 4000;

/** A full pass and the provisional rep built from it. */
interface PassRecord {
  readonly run: RunState;
  readonly ref: RepoRef;
  readonly path: string;
  readonly content: string;
}

/** Settles with `work`, or with false once `ms` have passed. */
function withTimeout(work: Promise<boolean>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

const closeConfirm = (position: number): string => `Close Solution ${position}? Its code will be deleted.`;

@Component({
  selector: 'app-practice-page',
  templateUrl: './practice-page.component.html',
  styleUrls: ['./practice-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CaseResultsComponent,
    CodeEditorComponent,
    CodeViewerComponent,
    CompleteRepPanelComponent,
    IconComponent,
    PracticeDescriptionComponent,
    PracticeHeaderComponent,
  ],
  // Host metadata rather than @HostListener: another runtime symbol would land in the initial bundle.
  host: {
    '(document:keydown)': 'onShortcut($event)',
    '(window:beforeunload)': 'onBeforeUnload($event)',
    '(window:pagehide)': 'onPageHide()',
  },
})
export class PracticePageComponent {
  private readonly runner = inject(PythonRunnerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly saver = inject(PracticeSaveService);
  private readonly todaySession = inject(TodaySessionService);
  private readonly provisional = inject(ProvisionalRepService);
  private readonly coachContext = inject(CoachContextService);
  protected readonly bigO = inject(BigOService);

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
  readonly copyMark = signal<IconName | null>(null);
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

  protected readonly copyIconSize = COPY_ICON_SIZE_PX;
  protected readonly copyOkIcon = COPY_OK_ICON;
  protected readonly copyFailIcon = COPY_FAIL_ICON;
  protected readonly completeRepIcon = COMPLETE_REP_ICON;

  readonly saveStatus = computed(() => this.saver.statusFor(this.number() ?? 0));
  readonly installUrl = this.auth.installUrl;
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

  /** The run state of a full pass on exactly the code now in the editor; null when there is none. */
  private readonly passingRun = computed<RunState | null>(() => {
    const tally = this.latestTally();
    const isSameCode = this.lastRun()?.code === this.text();
    const isFullRun = tally?.total === this.problem()?.cases.length;
    return tally !== null && isFullRun && tally.passed === tally.total && isSameCode ? this.runState() : null;
  });

  /** Completion opens on its own: the latest Run passed every case it ran, on exactly the code now in the editor. */
  readonly canMarkComplete = computed(() => this.passingRun() !== null && this.saveStatus().state !== 'saving');

  /** The provisional rep stored for the latest full pass; null until one passes. */
  private readonly pass = signal<PassRecord | null>(null);

  /** The passing run on the current code that no complete or provisional save of this day has covered. */
  private readonly unsavedPass = computed(() => {
    const pass = this.pass();
    if (pass === null || pass.run !== this.passingRun() || this.saver.hasLanded(pass.path)) return null;
    return this.saveStatus().state === 'saving' ? null : pass;
  });

  /** A complete or provisional save of this problem for today's path is known; Save to GitHub hides. */
  readonly isDayLanded = computed(() => {
    const problem = this.problem();
    return problem !== null && this.saver.hasLanded(attemptPath(new Date(), problem.number, problem.title));
  });

  /** The finished run the coach sees: the tally plus each case's raw verdict; null until a run has finished. */
  private readonly coachRun = computed<CoachPracticeSnapshot['run']>(() => {
    const tally = this.latestTally();
    if (!tally) return null;
    return { ...tally, verdicts: this.runState()?.results.map((result) => result.verdict) ?? [] };
  });

  /** Completion needs the Big-O reference loaded as well, since the dialog judges against it. */
  readonly canCompleteRep = computed(() => this.canMarkComplete() && this.bigO.status() === 'ready');

  /** The head button reopens the rep panel whenever it could have opened on its own: a current pass, closed now. */
  protected readonly canReopenRep = computed(() => this.canSave() && this.canCompleteRep() && !this.isCompleting());

  /** The code of the run that passed, shown read-only in the left pane while the rep panel is open. */
  protected readonly passedCode = computed(() => this.lastRun()?.code ?? '');

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
    const comfort = rep === undefined ? undefined : RATING_OPTIONS.find((option) => option.rating === rep.rating)?.comfort;
    if (rep === undefined || comfort === undefined) return '';
    return ` · ${comfort} · ${rep.complexity.time} / ${rep.complexity.space}`;
  });

  private runSubscription: Subscription | null = null;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** The tabs the debounce timer will write, with the problem and repo they were typed for. */
  private pendingSave: { readonly ref: RepoRef; readonly number: number; readonly tabs: SolutionTabs } | null = null;
  private copyTimer: ReturnType<typeof setTimeout> | null = null;
  private autoOpenedRun: RunState | null = null;
  private sentRun: RunState | null = null;
  private hasResentPending = false;
  /** The problem the page last showed; null until the first one loads. */
  private shownNumber: number | null = null;

  constructor() {
    effect(() => {
      const ref = this.ref();
      if (ref) untracked(() => this.bigO.load(ref));
      const number = this.problem()?.number;
      if (!this.canSave() || !ref || number === undefined) return;
      untracked(() => void this.loadRemote(ref, number));
      untracked(() => this.resendPendingOnce());
    });
    effect(() => {
      const run = this.passingRun();
      if (run === null || !this.canSave()) return;
      untracked(() => this.recordPass(run));
    });
    effect(() => {
      const run = this.passingRun();
      if (run === null || run === this.autoOpenedRun || !this.canSave() || !this.canCompleteRep()) return;
      untracked(() => {
        this.autoOpenedRun = run;
        this.isCompleting.set(true);
        this.isOutputOpen.set(true);
      });
    });
    effect(() => {
      // An edit to the code ends the pass the rep panel was opened for.
      if (this.passingRun() === null) untracked(() => this.isCompleting.set(false));
    });
    effect(() => {
      const problem = this.problem();
      if (!isCoachOwner(this.auth.login()) || !problem) {
        untracked(() => this.coachContext.clear());
        return;
      }
      this.coachContext.publish({ number: problem.number, title: problem.title, code: this.text(), run: this.coachRun() });
    });
    effect(() => {
      const number = this.problem()?.number;
      if (number !== undefined) untracked(() => this.showProblem(number));
    });
    this.destroyRef.onDestroy(() => this.coachContext.clear());
    this.destroyRef.onDestroy(() => this.flushPendingSave());
    this.destroyRef.onDestroy(() => {
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.runSubscription?.unsubscribe();
    });
  }

  /** The route reuses this component when only `:number` changes, and the editor reads `initialText`
   *  once. So a different problem drops the last one's run, Output and open panels and puts its own
   *  saved text in the editor. The first problem shown needs none of it. */
  private showProblem(number: number): void {
    const previous = this.shownNumber;
    this.shownNumber = number;
    if (previous === null || previous === number) return;
    this.runSubscription?.unsubscribe();
    this.runState.set(null);
    this.selectedCase.set(null);
    this.runCaseCount.set(0);
    this.lastRun.set(null);
    this.isCompleting.set(false);
    this.isOutputOpen.set(false);
    this.editor?.setText(this.initialText());
    this.editor?.setErrorLine(null);
  }

  onTextChange(text: string): void {
    const problem = this.problem();
    if (!problem || text === this.text()) return;
    const { texts, active } = this.tabs();
    this.edited.set({ number: problem.number, tabs: { texts: texts.map((t, i) => (i === active ? text : t)), active } });
    this.cancelPendingSave();
    const ref = this.ref();
    // The snapshot is what the timer writes, so a move to another problem cannot redirect it.
    if (ref) this.pendingSave = { ref, number: problem.number, tabs: this.tabs() };
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
    void this.saveAttempt({ complete: false, rating: null, tests: this.testsLabel(), complexity: null });
  }

  async completeRep(rep: CompletedRep): Promise<void> {
    this.isCompleting.set(false);
    const number = this.number();
    if (number !== null) this.completedReps.update((all) => ({ ...all, [number]: rep }));
    const isSaved = await this.saveAttempt({
      complete: true,
      rating: rep.rating,
      tests: this.testsLabel(),
      complexity: rep.complexity,
    });
    // Walk on only once the rep is on GitHub, so the leave guard has nothing left to ask about.
    if (isSaved && number !== null && this.todaySession.contains(number)) {
      this.todaySession.markCompleted(number);
      this.todaySession.advanceFrom(number);
    }
  }

  private testsLabel(): string | null {
    const tally = this.latestTally();
    return tally === null ? null : `${tally.passed}/${tally.total}`;
  }

  /** Keeps the provisional rep for a full pass in localStorage until a save of it lands. */
  private recordPass(run: RunState): void {
    const ref = this.ref();
    const problem = this.problem();
    const tally = this.latestTally();
    if (this.pass()?.run === run || !ref || !problem || tally === null) return;
    const now = new Date();
    const path = attemptPath(now, problem.number, problem.title);
    const tests = `${tally.total}/${tally.total}`;
    const content = buildAttemptFile({ complete: true, rating: null, tests, complexity: null }, now, this.text());
    if (!this.saver.hasLanded(path)) addRecord({ ref, path, content, date: now.toISOString() });
    this.pass.set({ run, ref, path, content });
  }

  private resendPendingOnce(): void {
    if (this.hasResentPending) return;
    this.hasResentPending = true;
    void this.provisional.resendPending();
  }

  /** The CanDeactivate check: with an unsaved pass, ask, then save it as unrated before leaving. */
  async confirmLeave(): Promise<boolean> {
    const pass = this.unsavedPass();
    if (pass === null) return true;
    if (!window.confirm(LEAVE_CONFIRM)) return false;
    if (this.sentRun === pass.run) return true;
    this.sentRun = pass.run;
    await withTimeout(this.saver.sendProvisional(pass.ref, pass.path, pass.content), PROVISIONAL_SAVE_TIMEOUT_MS);
    return true;
  }

  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.unsavedPass() === null) return;
    event.preventDefault();
    event.returnValue = '';
  }

  /** The page is going away: send the provisional rep once, with a request that outlives it. */
  onPageHide(): void {
    const pass = this.unsavedPass();
    if (pass === null || this.sentRun === pass.run) return;
    this.sentRun = pass.run;
    void this.saver.sendKeepalive(pass.ref, pass.path, pass.content);
  }

  /** True once the save landed on GitHub; false when it could not start or failed. */
  private async saveAttempt(meta: AttemptMeta): Promise<boolean> {
    const ref = this.ref();
    const problem = this.problem();
    if (!this.canSave() || !ref || !problem) return false;
    await this.saver.save(ref, problem, this.text(), meta);
    const status = this.saver.statusFor(problem.number);
    return status.state === 'saved' && status.isComplete === meta.complete;
  }

  /** Loads the newest GitHub copy into the open tab when it is newer than the local draft. A legacy
   *  draft with no time keeps winning, and so does anything typed while the request was out. */
  private async loadRemote(ref: RepoRef, number: number): Promise<void> {
    const file = await this.saver.latestFile(ref, number);
    const remote = file === null ? null : parseAttemptFile(file.content);
    if (file === null || remote === null || this.problem()?.number !== number) return;
    const problem = this.problem();
    if (remote.complete && problem && file.path === attemptPath(new Date(), number, problem.title)) {
      this.saver.markLanded(file.path);
    }
    if (this.edited()?.number === number) return;
    const draft = loadDraftStamp(ref, number);
    if (draft.exists && (draft.savedAt === null || draft.savedAt >= remote.savedAt)) return;
    const { texts, active } = this.tabs();
    this.openTabs({ texts: texts.map((text, i) => (i === active ? remote.code : text)), active });
  }

  copy(): void {
    const failCopy = (err: unknown): void => {
      console.error('Practice copy: clipboard write failed', err);
      this.showCopyMark(COPY_FAIL_ICON);
    };
    // `navigator.clipboard` is undefined in an insecure context or an unsupported browser.
    if (!navigator.clipboard) {
      failCopy(new Error('navigator.clipboard is unavailable'));
      return;
    }
    navigator.clipboard.writeText(this.text()).then(() => this.showCopyMark(COPY_OK_ICON), failCopy);
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

  private showCopyMark(mark: IconName): void {
    this.copyMark.set(mark);
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.copyMark.set(null), COPY_FEEDBACK_MS);
  }

  private cancelPendingSave(): void {
    this.pendingSave = null;
    if (this.saveTimer === null) return;
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
  }

  /** Writes the tabs a debounced save is waiting on, for the problem they were typed on (also run
   *  when the page is left). */
  private flushPendingSave(): void {
    const pending = this.pendingSave;
    this.cancelPendingSave();
    if (pending) saveTabs(pending.ref, pending.number, pending.tabs);
  }

  private persistTabs(): void {
    this.cancelPendingSave();
    const ref = this.ref();
    const problem = this.problem();
    if (ref && problem) saveTabs(ref, problem.number, this.tabs());
  }
}
