import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import type { Extension } from '@codemirror/state';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import type { CompareMode, PracticeEntry, PracticeProblem } from '../../../core/models/practice.model';
import { PythonRunnerService } from '../../../core/runner/python-runner.service';
import { FreeRunState } from '../../../core/runner/runner.model';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { InterviewBarComponent } from '../interview/interview-bar/interview-bar.component';
import {
  CUSTOM_PROBLEM,
  HOST_PARAM,
  JOIN_PARAM,
  InterviewSessionService,
} from '../interview/interview-session.service';
import { STATEMENT_MAX_LENGTH, TITLE_MAX_LENGTH } from '../interview/session-message';
import { sessionRoute } from '../interview/session-support';
import { PracticeDescriptionComponent } from '../practice-description/practice-description.component';
import { TIME_LIMIT_WORD } from '../practice-results';
import { shortcutFor } from '../practice-shortcuts';
import { DEFAULT_PROBLEM_SHARE } from '../practice-split';
import { CustomDraft, loadDraft, saveDraft } from './custom-draft';

const PERCENT = 100;
/** The split's fixed track weights, as the practice page's `--problem-track` / `--work-track` bindings. */
const PROBLEM_TRACK = `${DEFAULT_PROBLEM_SHARE * PERCENT}fr`;
const WORK_TRACK = `${(1 - DEFAULT_PROBLEM_SHARE) * PERCENT}fr`;

/** The description pane reads only `title`, `statement` and `cases`; the entry and compare mode below
 *  satisfy the type and are never read, since a free run has no cases. */
const UNUSED_ENTRY: PracticeEntry = { className: 'Solution', method: 'run' };
const UNUSED_COMPARE: CompareMode = 'exact';

/** The interviewer's own problem: a setup form, then in a session the statement beside the shared
 *  editor, with a free Run that prints what the code prints. */
@Component({
  selector: 'app-custom-interview-page',
  templateUrl: './custom-interview-page.component.html',
  styleUrls: ['../practice-page/practice-page.component.scss', './custom-interview-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditorComponent, InterviewBarComponent, PracticeDescriptionComponent],
  // Host metadata rather than @HostListener: another runtime symbol would land in the initial bundle.
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class CustomInterviewPageComponent {
  private readonly runner = inject(PythonRunnerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly session = inject(InterviewSessionService);

  protected readonly titleMaxLength = TITLE_MAX_LENGTH;
  protected readonly statementMaxLength = STATEMENT_MAX_LENGTH;
  protected readonly problemTrack = PROBLEM_TRACK;
  protected readonly workTrack = WORK_TRACK;
  protected readonly timeLimitWord = TIME_LIMIT_WORD;

  /** What the setup form holds; read once from storage, then saved on every change. */
  protected readonly draft = signal<CustomDraft>(loadDraft());

  /** A session pinned to the interviewer's own problem; any other session leaves this page a setup form. */
  protected readonly isInSession = computed(
    () => this.session.role() !== 'none' && this.session.problem() === CUSTOM_PROBLEM,
  );
  /** Start needs both texts, and no session already held (it would be replaced). */
  protected readonly canStart = computed(() => {
    const { title, statement } = this.draft();
    return title.trim() !== '' && statement.trim() !== '' && this.session.role() === 'none';
  });
  protected readonly problemLabel = computed(() => this.session.custom()?.title ?? '');

  protected readonly descriptionProblem = computed<PracticeProblem | null>(() => {
    const custom = this.session.custom();
    if (!custom) return null;
    return {
      number: CUSTOM_PROBLEM,
      title: custom.title,
      url: null,
      statement: custom.statement,
      stub: '',
      entry: UNUSED_ENTRY,
      compare: UNUSED_COMPARE,
      cases: [],
    };
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

  protected readonly runState = signal<FreeRunState | null>(null);
  protected readonly isBusy = computed(() => {
    const status = this.runState()?.status;
    return status === 'loading' || status === 'running';
  });
  protected readonly isLoadingPython = computed(() => this.runState()?.status === 'loading');

  private runSubscription: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.runSubscription?.unsubscribe());
    this.joinFromUrl();
  }

  protected onTitleInput(event: Event): void {
    this.updateDraft({ title: (event.target as HTMLInputElement).value });
  }

  protected onStatementInput(event: Event): void {
    this.updateDraft({ statement: (event.target as HTMLTextAreaElement).value });
  }

  protected onStarterChange(starter: string): void {
    this.updateDraft({ starter });
  }

  protected onSessionTextChange(text: string): void {
    this.edited.set({ epoch: this.sessionEpoch(), text });
  }

  protected onShortcut(event: KeyboardEvent): void {
    if (!this.isInSession() || shortcutFor(event) === null) return;
    event.preventDefault();
    this.run();
  }

  protected run(): void {
    if (this.isBusy()) return;
    this.runSubscription?.unsubscribe();
    this.runSubscription = this.runner.runFree(this.text()).subscribe({
      next: (state) => this.runState.set(state),
      error: (err: unknown) => {
        console.error('Custom problem: free run failed', err);
        const message = err instanceof Error ? err.message : String(err);
        this.runState.set({ status: 'done', stdout: '', error: message, isTimedOut: false });
      },
    });
  }

  protected startInterview(): void {
    const { title, statement, starter } = this.draft();
    this.session
      .start(CUSTOM_PROBLEM, starter, window.location.href, { title: title.trim(), statement })
      .then(() => this.showHostLink())
      .catch((err: unknown) => console.error('Custom problem: interview start failed', err));
  }

  private updateDraft(patch: Partial<CustomDraft>): void {
    const next = { ...this.draft(), ...patch };
    this.draft.set(next);
    saveDraft(next);
  }

  /** Puts the interviewer's resume link in the address bar (other params kept) so a reload resumes the session. */
  private showHostLink(): void {
    if (this.session.status() === 'error') return;
    const hostUrl = this.session.hostUrl();
    if (!hostUrl) return;
    const secret = new URL(hostUrl).searchParams.get(HOST_PARAM);
    if (!secret) return;
    this.router
      .navigate(sessionRoute(CUSTOM_PROBLEM), {
        queryParams: { [HOST_PARAM]: secret },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
      .catch((err: unknown) => console.error('Custom problem: host link navigation failed', err));
  }

  private joinFromUrl(): void {
    const query = this.route.snapshot.queryParamMap;
    const secret = query.get(HOST_PARAM);
    const peerId = query.get(JOIN_PARAM);
    if (secret) {
      this.session
        .resume(secret, CUSTOM_PROBLEM, () => '')
        .catch((err: unknown) => console.error('Custom problem: interview resume failed', err));
      return;
    }
    if (!peerId) return;
    this.session
      .join(peerId, CUSTOM_PROBLEM)
      .catch((err: unknown) => console.error('Custom problem: interview join failed', err));
  }
}
