import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import type { Extension } from '@codemirror/state';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import type { PracticeProblem } from '../../../core/models/practice.model';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { FreeRunState, RunState, RunStatus } from '../../../core/runner/runner.model';
import { CaseResultsComponent } from '../../practice/case-results/case-results.component';
import { CodeEditorComponent } from '../../practice/code-editor/code-editor.component';
import { PracticeDescriptionComponent } from '../../practice/practice-description/practice-description.component';
import { TIME_LIMIT_WORD, countPassed } from '../../practice/practice-results';
import { shortcutFor } from '../../practice/practice-shortcuts';
import { PROBLEM_TRACK, WORK_TRACK } from '../../practice/practice-split';
import { toPracticeProblem } from '../problem-import';
import { ProblemEditorComponent } from '../problem-editor/problem-editor.component';
import { InterviewBarComponent } from '../session/interview-bar/interview-bar.component';
import { parseInterviewProblem, type InterviewProblem } from '../session/interview-problem';
import { HOST_PARAM, JOIN_PARAM, InterviewSessionService } from '../session/interview-session.service';
import { loadInterviewDraft, saveInterviewDraft } from './interview-draft';

/** How long edits rest before the draft is saved (setup) or the problem is published (in a session). */
export const PUBLISH_DELAY_MS = 500;
/** How many unanswered publishes are remembered; a tab whose publishes are being dropped stops growing the list. */
const UNECHOED_MAX = 8;

type LeftTab = 'edit' | 'view';

/** The interviewer's left-pane tabs, in order; Edit is the default. */
const LEFT_TABS: readonly { readonly id: LeftTab; readonly label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'view', label: 'View' },
];

const isRunning = (status: RunStatus | undefined): boolean => status === 'loading' || status === 'running';
const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** A problem with cases and an entry runs against its cases; anything else is a free run. */
const isCaseRunnable = (problem: InterviewProblem | null): boolean =>
  problem !== null && problem.cases.length > 0 && problem.entry !== null;

/** The interviewer's problem: a setup form, then in a session the problem (editable by the
 *  interviewer) beside the shared editor, with Run over the cases or a free run. */
@Component({
  selector: 'app-interview-page',
  templateUrl: './interview-page.component.html',
  styleUrls: ['../../practice/practice-page/practice-page.component.scss', './interview-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CaseResultsComponent,
    CodeEditorComponent,
    InterviewBarComponent,
    PracticeDescriptionComponent,
    ProblemEditorComponent,
  ],
  // Host metadata rather than @HostListener: another runtime symbol would land in the initial bundle.
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class InterviewPageComponent {
  private readonly runner = inject(PythonRunnerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly session = inject(InterviewSessionService);

  // Decorator queries, not viewChild(): the signal-query helper is another runtime symbol
  // that would land in the initial bundle.
  @ViewChild(ProblemEditorComponent) private problemEditor?: ProblemEditorComponent;
  @ViewChild(CodeEditorComponent) private sessionEditor?: CodeEditorComponent;

  protected readonly problemTrack = PROBLEM_TRACK;
  protected readonly workTrack = WORK_TRACK;
  protected readonly timeLimitWord = TIME_LIMIT_WORD;
  protected readonly leftTabs = LEFT_TABS;

  /** The problem editor's problem: the saved draft at first, then whatever is typed or adopted. */
  protected readonly form = signal<InterviewProblem>(loadInterviewDraft());
  protected readonly leftTab = signal<LeftTab>('edit');
  /** True while the form holds a problem the session would reject (an over-long starter or problem). */
  protected readonly isRejected = signal(false);

  protected readonly isInSession = computed(() => this.session.role() !== 'none');
  protected readonly isInterviewer = computed(() => this.session.role() === 'interviewer');

  /** The published problem as the description and the runner take it; recomputed per published problem. */
  protected readonly practiceProblem = computed<PracticeProblem | null>(() => {
    const problem = this.session.problem();
    return problem ? toPracticeProblem(problem) : null;
  });

  /** The session's shared document as a list of at most one, so the editor block can be keyed on its epoch. */
  protected readonly sessionDocs = computed(() => {
    const shared = this.session.sharedDoc();
    return shared ? [shared] : [];
  });
  private readonly sessionEpoch = computed(() => this.session.sharedDoc()?.epoch ?? 0);

  /** The session editor's extensions, built once per shared document: a fresh array on every
   *  evaluation would trip the dev-mode no-changes check. */
  protected readonly sessionExtensions = computed<readonly Extension[]>(() =>
    this.session.sharedDoc() ? this.session.collabExtensions() : [],
  );

  /** The editor's latest text, tagged with the epoch it belongs to so a re-initialised document never inherits it. */
  private readonly edited = signal<{ epoch: number; text: string } | null>(null);
  private readonly text = computed(() => {
    const edited = this.edited();
    return edited && edited.epoch === this.sessionEpoch() ? edited.text : (this.session.sharedDoc()?.doc ?? '');
  });

  /** A run over the cases, and the problem it ran, so its tabs and count stay the run's own. */
  protected readonly runState = signal<RunState | null>(null);
  protected readonly ranProblem = signal<PracticeProblem | null>(null);
  protected readonly freeRunState = signal<FreeRunState | null>(null);
  /** The tab the interviewer clicked; null until they click, so the default follows the first failure. */
  protected readonly selectedCase = signal<number | null>(null);
  protected readonly isBusy = computed(
    () => isRunning(this.runState()?.status) || isRunning(this.freeRunState()?.status),
  );
  protected readonly isLoadingPython = computed(
    () => this.runState()?.status === 'loading' || this.freeRunState()?.status === 'loading',
  );
  protected readonly passedCount = computed(() => countPassed(this.runState()?.results ?? []));
  protected readonly runCaseCount = computed(() => this.ranProblem()?.cases.length ?? 0);

  private runSubscription: Subscription | null = null;
  /** The one debounce timer: it saves the draft before the session starts and publishes in it. */
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** The JSON of each problem this tab published that has not come back from the session yet, oldest first. */
  private unechoed: readonly string[] = [];
  /** The newest problem this tab knows: the last it published, or the last one it received from elsewhere. */
  private latest: InterviewProblem | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.flushPending();
      this.runSubscription?.unsubscribe();
    });
    this.restoreUrlParams();
    this.adoptPublishedProblem();
    this.joinFromUrl();
  }

  protected onFormChange(next: InterviewProblem): void {
    this.form.set(next);
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.applyForm();
    }, PUBLISH_DELAY_MS);
  }

  protected onSessionTextChange(text: string): void {
    this.edited.set({ epoch: this.sessionEpoch(), text });
  }

  protected onShortcut(event: KeyboardEvent): void {
    if (!this.isInSession() || shortcutFor(event) === null) return;
    event.preventDefault();
    this.run();
  }

  /** Runs the cases when the problem has cases and an entry; otherwise prints what the code prints. */
  protected run(): void {
    if (this.isBusy()) return;
    this.runSubscription?.unsubscribe();
    const practice = this.practiceProblem();
    if (practice && isCaseRunnable(this.session.problem())) this.runCases(practice);
    else this.runFree();
  }

  /** Puts the problem's starter back into the shared document. */
  protected reset(): void {
    this.sessionEditor?.setText(this.session.problem()?.starter ?? '');
  }

  protected startInterview(): void {
    this.flushPending();
    if (this.isRejected()) return;
    this.session
      .start(this.form(), window.location.href)
      .catch((err: unknown) => console.error('Interview: start failed', err));
  }

  private runCases(problem: PracticeProblem): void {
    this.freeRunState.set(null);
    this.selectedCase.set(null);
    this.ranProblem.set(problem);
    this.runSubscription = this.runner.run(this.text(), problem).subscribe({
      next: (state) => this.runState.set(state),
      error: (err: unknown) => {
        console.error('Interview: case run failed', err);
        this.runState.set({ status: 'done', results: [], runError: errorMessage(err) });
      },
    });
  }

  private runFree(): void {
    this.runState.set(null);
    this.ranProblem.set(null);
    this.runSubscription = this.runner.runFree(this.text()).subscribe({
      next: (state) => this.freeRunState.set(state),
      error: (err: unknown) => {
        console.error('Interview: free run failed', err);
        this.freeRunState.set({ status: 'done', stdout: '', error: errorMessage(err), isTimedOut: false });
      },
    });
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  /** Does the waiting save or publish now (also run when Start is pressed or the page is left). */
  private flushPending(): void {
    if (this.timer === null) return;
    this.clearTimer();
    this.applyForm();
  }

  private applyForm(): void {
    // A problem the session would reject is kept off the wire and flagged, not dropped silently.
    const valid = parseInterviewProblem(this.form());
    this.isRejected.set(valid === null);
    if (valid === null) return;
    const role = this.session.role();
    if (role === 'none') saveInterviewDraft(this.form());
    else if (role === 'interviewer') this.publish(valid);
  }

  /** Sends the form to the session. A starter the interviewer changed reaches the shared document
   *  only while that document still holds the old starter, as an ordinary edit. `parsed` is the form
   *  as the session will hold it, so its JSON is what comes back. */
  private publish(parsed: InterviewProblem): void {
    const next = this.form();
    const oldStarter = this.latest?.starter ?? '';
    if (next.starter !== oldStarter && this.text() === oldStarter) this.sessionEditor?.setText(next.starter);
    this.unechoed = [...this.unechoed, JSON.stringify(parsed)].slice(-UNECHOED_MAX);
    this.latest = next;
    this.session.editProblem(next).catch((err: unknown) => console.error('Interview: problem publish failed', err));
  }

  /** Takes a problem the session holds into the form, unless the form has typing the session has not seen. It
   *  tracks only the session's problem and never schedules a publish, so an adopted problem is not re-published.
   *  This tab's own publishes coming back are recognised and skipped. */
  private adoptPublishedProblem(): void {
    effect(() => {
      const incoming = this.session.problem();
      untracked(() => {
        if (!incoming) return;
        const json = JSON.stringify(incoming);
        const index = this.unechoed.indexOf(json);
        if (index !== -1) {
          this.unechoed = this.unechoed.slice(index + 1);
          return;
        }
        this.unechoed = [];
        this.latest = incoming;
        if (this.timer !== null || this.problemEditor?.hasInvalidField()) return;
        this.isRejected.set(false);
        if (json !== JSON.stringify(this.form())) this.form.set(incoming);
      });
    });
  }

  /** Puts the session's link parameter in the address bar (other params kept) so a reload resumes or rejoins it. */
  private restoreUrlParams(): void {
    effect(() => {
      const role = this.session.role();
      const linkParams = this.session.linkParams();
      if (role === 'none' || Object.keys(linkParams).length === 0) return;
      untracked(() => {
        const query = this.router.parseUrl(this.router.url).queryParamMap;
        if (query.has(HOST_PARAM) || query.has(JOIN_PARAM)) return;
        this.router
          .navigate([], {
            relativeTo: this.route,
            queryParams: linkParams,
            queryParamsHandling: 'merge',
            replaceUrl: true,
          })
          .catch((err: unknown) => console.error('Interview: link navigation failed', err));
      });
    });
  }

  private joinFromUrl(): void {
    const query = this.route.snapshot.queryParamMap;
    const secret = query.get(HOST_PARAM);
    const peerId = query.get(JOIN_PARAM);
    if (secret) {
      this.session.resume(secret).catch((err: unknown) => console.error('Interview: resume failed', err));
      return;
    }
    if (!peerId) return;
    this.session.join(peerId).catch((err: unknown) => console.error('Interview: join failed', err));
  }
}
