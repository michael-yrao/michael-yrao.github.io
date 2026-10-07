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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { PracticeProblem } from '../../../core/models/practice.model';
import { CodeEditorComponent } from '../../../shared/components/code-editor/code-editor.component';
import { PracticeDescriptionComponent } from '../../../shared/components/practice-description/practice-description.component';
import { shortcutFor } from '../../../shared/utils/practice-shortcuts';
import { PROBLEM_TRACK, WORK_TRACK } from '../../../shared/utils/practice-split';
import { toPracticeProblem } from '../problem-import';
import { ProblemEditorComponent } from '../problem-editor/problem-editor.component';
import { InterviewNotesComponent } from '../interview-notes/interview-notes.component';
import { InterviewsCardComponent } from '../interviews-card/interviews-card.component';
import { injectCodeRun } from '../run/code-run';
import { RunPanelComponent } from '../run-panel/run-panel.component';
import { PageHeaderComponent, type BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import { LibrarySubnavComponent } from '../../../shared/components/library-subnav/library-subnav.component';
import { PRACTICE_SECTIONS } from '../../../core/data/practice-sections';
import { InterviewBarComponent } from '../session/interview-bar/interview-bar.component';
import { parseInterviewProblem, type InterviewProblem } from '../session/interview-problem';
import { CODE_PARAM, HOST_PARAM, JOIN_PARAM } from '../session/interview-params';
import { InterviewSessionService } from '../session/interview-session.service';
import { PreparedInterviewsService } from '../session/prepared-interviews.service';
import { EMPTY_PROBLEM } from '../interview-prepare/interview-draft';
import type { DebriefSummary } from '../session/debrief';
import { listDebriefs, saveDebrief } from '../session/store/debrief-store';
import { clearNotes } from '../session/store/notes-store';
import { formatDebriefDate, roleLabel } from './interview-format';
import { LANDING_MESSAGES } from './landing-messages';
import { SavedProblemsCardComponent } from './saved-problems-card/saved-problems-card.component';

/** How long edits rest before the problem is published in a session. */
export const PUBLISH_DELAY_MS = 500;
/** How many unanswered publishes are remembered; a tab whose publishes are being dropped stops growing the list. */
const UNECHOED_MAX = 8;

type LeftTab = 'edit' | 'view' | 'notes';

/** The interviewer's left-pane tabs, in order; Edit is the default. */
const LEFT_TABS: readonly { readonly id: LeftTab; readonly label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'view', label: 'View' },
  { id: 'notes', label: 'Notes' },
];

const LANDING_BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Practice', link: '/practice' },
  { label: 'Interview' },
];

const DEBRIEF_PATH = '/interview/debrief';

/** The interview page: a code landing, then in a session the problem (editable by the
 *  interviewer) beside the shared editor, with Run over the cases or a free run. */
@Component({
  selector: 'app-interview-page',
  templateUrl: './interview-page.component.html',
  styleUrls: ['./interview-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CodeEditorComponent,
    InterviewBarComponent,
    InterviewNotesComponent,
    InterviewsCardComponent,
    LibrarySubnavComponent,
    PageHeaderComponent,
    PracticeDescriptionComponent,
    ProblemEditorComponent,
    RouterLink,
    RunPanelComponent,
    SavedProblemsCardComponent,
  ],
  // Host metadata rather than @HostListener: another runtime symbol would land in the initial bundle.
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class InterviewPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly session = inject(InterviewSessionService);
  private readonly prepared = inject(PreparedInterviewsService);

  // Decorator queries, not viewChild(): the signal-query helper is another runtime symbol
  // that would land in the initial bundle.
  @ViewChild(ProblemEditorComponent) private problemEditor?: ProblemEditorComponent;
  @ViewChild(CodeEditorComponent) private sessionEditor?: CodeEditorComponent;

  protected readonly problemTrack = PROBLEM_TRACK;
  protected readonly workTrack = WORK_TRACK;
  protected readonly leftTabs = LEFT_TABS;
  protected readonly breadcrumb = LANDING_BREADCRUMB;
  protected readonly practiceSections = PRACTICE_SECTIONS;
  protected readonly debriefPath = DEBRIEF_PATH;
  protected readonly formatDate = formatDebriefDate;
  protected readonly roleLabel = roleLabel;

  /** The finished interviews kept in this browser, read when the landing shows. */
  protected readonly pastInterviews = signal<readonly DebriefSummary[]>([]);

  /** The in-session problem editor's problem: empty until the session's problem arrives, then whatever is typed or adopted. */
  protected readonly form = signal<InterviewProblem>(EMPTY_PROBLEM);
  protected readonly leftTab = signal<LeftTab>('edit');
  /** True while the form holds a problem the session would reject (an over-long starter or problem). */
  protected readonly isRejected = signal(false);
  /** Why the entered code did not open an interview. */
  protected readonly message = signal<string | null>(null);

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

  protected readonly codeRun = injectCodeRun();

  /** The one debounce timer: it publishes the form's problem in a session. */
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** The JSON of each problem this tab published that has not come back from the session yet, oldest first. */
  private unechoed: readonly string[] = [];
  /** The newest problem this tab knows: the last it published, or the last one it received from elsewhere. */
  private latest: InterviewProblem | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.flushPending());
    this.restoreUrlParams();
    this.adoptPublishedProblem();
    this.refreshPastInterviews();
    this.routeEndedSession();
    this.enterFromUrl();
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
    if (this.codeRun.isBusy()) return;
    this.codeRun.start(this.text(), this.session.problem());
  }

  /** Puts the problem's starter back into the shared document. */
  protected reset(): void {
    this.sessionEditor?.setText(this.session.problem()?.starter ?? '');
  }

  /** Enters the typed code: an interviewer code resumes its interview, a candidate code joins; anything else says why not. */
  protected onSubmitCode(event: Event, input: string): void {
    event.preventDefault();
    this.enterCode(input).catch((err: unknown) => console.error('Interview: entering a code failed', err));
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  /** Does the waiting save or publish now (also run when an interview is opened or the page is left). */
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
    if (this.session.role() === 'interviewer') this.publish(valid);
  }

  private async enterCode(input: string): Promise<void> {
    const entry = await this.prepared.enterCode(input);
    if (entry.status === 'interviewer') {
      this.message.set(null);
      await this.session.resume(entry.packed);
    } else if (entry.status === 'candidate') {
      this.message.set(null);
      await this.session.join(entry.publicRaw);
    } else {
      this.message.set(LANDING_MESSAGES[entry.status]);
    }
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

  /** Reads the saved debriefs whenever the landing shows: on creation and when the role returns to none. */
  private refreshPastInterviews(): void {
    effect(() => {
      if (this.session.role() !== 'none') return;
      untracked(() => this.pastInterviews.set(listDebriefs()));
    });
  }

  /** When a session with a candidate ends, saves its debrief and opens it; a refused save leaves the landing. */
  private routeEndedSession(): void {
    effect(() => {
      const ended = this.session.ended();
      if (!ended) return;
      untracked(() => {
        this.session.clearEnded();
        if (!saveDebrief({ ...ended, lastRun: this.codeRun.lastRun() })) return;
        if (ended.role === 'interviewer') clearNotes(ended.sessionId);
        this.router
          .navigate([DEBRIEF_PATH, ended.sessionId], { replaceUrl: true })
          .catch((err: unknown) => console.error('Interview: opening the debrief failed', err));
      });
    });
  }

  /** Puts the session's link parameter in the address bar (other params kept, a typed `code` dropped) so a reload resumes or rejoins it without the network. */
  private restoreUrlParams(): void {
    effect(() => {
      const role = this.session.role();
      const linkParams = this.session.linkParams();
      if (role === 'none' || Object.keys(linkParams).length === 0) return;
      untracked(() => {
        const query = this.router.parseUrl(this.router.url).queryParamMap;
        const isAddressCurrent = !query.has(CODE_PARAM) && Object.entries(linkParams).every(([key, value]) => query.get(key) === value);
        if (isAddressCurrent) return;
        this.router
          .navigate([], {
            relativeTo: this.route,
            queryParams: { [CODE_PARAM]: null, ...linkParams },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          })
          .catch((err: unknown) => console.error('Interview: link navigation failed', err));
      });
    });
  }

  /** Opens what the address names: `?code=` enters like the form, `?host=` resumes, `?join=` joins. */
  private enterFromUrl(): void {
    const query = this.route.snapshot.queryParamMap;
    const code = query.get(CODE_PARAM);
    const secret = query.get(HOST_PARAM);
    const peerId = query.get(JOIN_PARAM);
    if (code) this.enterCode(code).catch((err: unknown) => console.error('Interview: entering a code failed', err));
    else if (secret) this.session.resume(secret).catch((err: unknown) => console.error('Interview: resume failed', err));
    else if (peerId) this.session.join(peerId).catch((err: unknown) => console.error('Interview: join failed', err));
  }
}
