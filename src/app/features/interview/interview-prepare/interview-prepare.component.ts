import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked, type WritableSignal } from '@angular/core';
import { EditorState, type Extension } from '@codemirror/state';

import type { PracticeProblem } from '../../../core/models/practice.model';
import { CodeEditorComponent } from '../../practice/code-editor/code-editor.component';
import { PracticeDescriptionComponent } from '../../practice/practice-description/practice-description.component';
import { PROBLEM_TRACK, WORK_TRACK } from '../../practice/practice-split';
import { COPY_FEEDBACK_MS, copyText, type CopyMark } from '../copy-text';
import { formatCode } from '../directory/interview-code';
import { ProblemEditorComponent } from '../problem-editor/problem-editor.component';
import { toPracticeProblem } from '../problem-import';
import { parseInterviewProblem, type InterviewProblem } from '../session/interview-problem';
import { HOST_PARAM } from '../session/interview-params';
import { InterviewSessionService } from '../session/interview-session.service';
import { PreparedInterviewsService, type PreparedDetail } from '../session/prepared-interviews.service';
import { loadInterviewDraft, saveInterviewDraft } from './interview-draft';
import { OFFLINE_MESSAGE, SAVE_REFUSED_MESSAGE, preparedLabel } from './prepared-picker';
import { STATE_VIEWS } from './publish-state-views';

/** How long edits rest before they are saved to the draft or the selected prepared interview. */
export const AUTOSAVE_DELAY_MS = 500;
/** The picker's value for the unsaved draft. */
const NEW_ENTRY = '';
const DELETE_CONFIRM = 'Delete this prepared interview?';
/** The View tab's starter is for reading only. */
const READ_ONLY_EXTENSIONS: readonly Extension[] = [EditorState.readOnly.of(true)];

type Tab = 'edit' | 'view';

const TABS: readonly { readonly id: Tab; readonly label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'view', label: 'View' },
];

/** The editor for prepared interviews: a draft ("New") or a saved entry, never connected to a session. */
@Component({
  selector: 'app-interview-prepare',
  templateUrl: './interview-prepare.component.html',
  styleUrls: ['../../practice/practice-page/practice-page.component.scss', './interview-prepare.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditorComponent, NgTemplateOutlet, PracticeDescriptionComponent, ProblemEditorComponent],
})
export class InterviewPrepareComponent {
  private readonly session = inject(InterviewSessionService);
  protected readonly prepared = inject(PreparedInterviewsService);

  protected readonly tabs = TABS;
  protected readonly problemTrack = PROBLEM_TRACK;
  protected readonly workTrack = WORK_TRACK;
  protected readonly readOnlyExtensions = READ_ONLY_EXTENSIONS;
  protected readonly preparedLabel = preparedLabel;
  protected readonly newEntry = NEW_ENTRY;

  /** The editor's problem: the saved draft at first, then the selected entry's or whatever is typed. */
  protected readonly form = signal<InterviewProblem>(loadInterviewDraft());
  protected readonly tab = signal<Tab>('edit');
  /** True while the form holds a problem the session would reject (an over-long starter or problem). */
  protected readonly isRejected = signal(false);
  protected readonly message = signal<string | null>(null);
  /** The picked prepared interview's session id; `NEW_ENTRY` is the draft. */
  protected readonly selectedId = signal(NEW_ENTRY);
  private readonly loadedDetail = signal<PreparedDetail | null>(null);
  protected readonly copyMarks = { candidate: signal<CopyMark | null>(null), interviewer: signal<CopyMark | null>(null) };

  /** The loaded detail, only while it is the selected entry's. */
  protected readonly detail = computed(() => {
    const loaded = this.loadedDetail();
    return loaded && loaded.sessionId === this.selectedId() ? loaded : null;
  });
  /** The formatted codes; null until the server has accepted the entry once. */
  protected readonly codes = computed(() => {
    const detail = this.detail();
    if (!detail || !detail.candidateCode) return null;
    return { candidate: formatCode(detail.candidateCode), interviewer: formatCode(detail.interviewerCode) };
  });
  protected readonly stateView = computed(() => {
    const detail = this.detail();
    return detail ? STATE_VIEWS[detail.publish] : null;
  });
  /** The entry open in this tab's live interview, found once per list or session change. */
  protected readonly liveId = computed(() => {
    const packed = this.session.linkParams()[HOST_PARAM];
    if (packed === undefined) return null;
    return this.prepared.list().find((item) => this.prepared.packedOf(item.sessionId) === packed)?.sessionId ?? null;
  });
  protected readonly preview = computed<PracticeProblem | null>(() => {
    const problem = parseInterviewProblem(this.form());
    return problem ? toPracticeProblem(problem) : null;
  });
  private readonly selectedSummary = computed(() => this.prepared.list().find((item) => item.sessionId === this.selectedId()) ?? null);

  private timer: ReturnType<typeof setTimeout> | null = null;
  /** The entry whose problem the form should take when its detail arrives. */
  private awaitingForm: string | null = null;
  /** Counts the detail loads, so a slow answer for an earlier selection or save is ignored. */
  private detailLoads = 0;
  private readonly markTimers = new Map<WritableSignal<CopyMark | null>, ReturnType<typeof setTimeout>>();

  constructor() {
    this.prepared.retryUnpublished().catch((err: unknown) => console.error('Interview prepare: retry failed', err));
    inject(DestroyRef).onDestroy(() => {
      this.leaveEntry(this.selectedId(), this.flushPending());
      this.markTimers.forEach((timer) => clearTimeout(timer));
    });
    // The entry's summary is replaced on every local save and publish change, which re-reads the codes and the mark.
    effect(() => {
      const summary = this.selectedSummary();
      untracked(() => {
        if (summary) void this.loadDetail(summary.sessionId);
        else this.detailLoads++;
      });
    });
  }

  protected onFormChange(next: InterviewProblem): void {
    this.form.set(next);
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.save();
    }, AUTOSAVE_DELAY_MS);
  }

  /** Loads the picked entry (or the draft) for editing. It never opens an interview. */
  protected onSelectPrepared(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const previous = this.selectedId();
    if (id === previous) return;
    this.leaveEntry(previous, this.flushPending());
    this.message.set(null);
    if (id === NEW_ENTRY) this.showDraft();
    else this.awaitingForm = id;
    this.selectedId.set(id);
  }

  protected prepareInterview(): void {
    this.prepareFromForm().catch((err: unknown) => console.error('Interview prepare: prepare failed', err));
  }

  /** After a confirm: removes the entry on the server and here, then shows the draft; a server that cannot be reached keeps the entry and says so. */
  protected async deleteSelected(): Promise<void> {
    const id = this.selectedId();
    if (id === NEW_ENTRY || !window.confirm(DELETE_CONFIRM)) return;
    this.clearTimer();
    let isRemoved = false;
    try {
      isRemoved = await this.prepared.remove(id);
    } catch (err) {
      console.error('Interview prepare: delete failed', err);
    }
    if (!isRemoved) {
      this.message.set(OFFLINE_MESSAGE);
      return;
    }
    this.message.set(null);
    this.showDraft();
    this.selectedId.set(NEW_ENTRY);
  }

  /** Copies the loaded link; the click calls `copyText` with no await before it. */
  protected copyLink(role: 'candidate' | 'interviewer'): void {
    const detail = this.detail();
    const url = role === 'candidate' ? detail?.candidateUrl : detail?.interviewerUrl;
    if (!url) return;
    copyText(url).then((isCopied) => this.showCopyMark(this.copyMarks[role], isCopied ? 'ok' : 'fail'));
  }

  private async prepareFromForm(): Promise<void> {
    await this.flushPending();
    if (this.isRejected()) return;
    const id = await this.prepared.prepare(this.form());
    if (id === null) {
      this.message.set(SAVE_REFUSED_MESSAGE);
      return;
    }
    this.message.set(null);
    this.awaitingForm = null;
    this.selectedId.set(id);
  }

  /** Saves the form to the draft, or to the selected entry; a refused save says so. */
  private async save(): Promise<void> {
    const valid = parseInterviewProblem(this.form());
    this.isRejected.set(valid === null);
    if (valid === null) return;
    const id = this.selectedId();
    if (id === NEW_ENTRY) {
      saveInterviewDraft(this.form());
      return;
    }
    const isSaved = await this.prepared.update(id, this.form());
    this.message.set(isSaved ? null : SAVE_REFUSED_MESSAGE);
  }

  /** Does the waiting save now; it is aimed at the current selection when this is called. */
  private flushPending(): Promise<void> {
    if (this.timer === null) return Promise.resolve();
    this.clearTimer();
    return this.save();
  }

  /** Pushes the entry being left, once its last local save is done. */
  private leaveEntry(id: string, saved: Promise<void>): void {
    if (id === NEW_ENTRY) return;
    saved
      .then(() => this.prepared.flush(id))
      .catch((err: unknown) => console.error('Interview prepare: publish on leaving failed', err));
  }

  private showDraft(): void {
    this.form.set(loadInterviewDraft());
    this.isRejected.set(false);
  }

  /** Reads the entry's codes and state; a newly picked entry also fills the form. Only the newest read counts.
   *  A picked entry that cannot be read puts the page back on the draft. */
  private async loadDetail(id: string): Promise<void> {
    const load = ++this.detailLoads;
    let loaded: PreparedDetail | null = null;
    try {
      loaded = await this.prepared.detail(id, window.location.href);
    } catch (err) {
      console.error('Interview prepare: could not read the prepared interview', err);
    }
    if (load !== this.detailLoads) return;
    if (loaded === null) {
      if (this.awaitingForm === id) this.backToDraft();
      return;
    }
    this.loadedDetail.set(loaded);
    if (this.awaitingForm !== id) return;
    this.awaitingForm = null;
    this.form.set(loaded.problem);
    this.isRejected.set(false);
  }

  private backToDraft(): void {
    this.awaitingForm = null;
    this.showDraft();
    this.selectedId.set(NEW_ENTRY);
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  private showCopyMark(target: WritableSignal<CopyMark | null>, mark: CopyMark): void {
    target.set(mark);
    const timer = this.markTimers.get(target);
    if (timer) clearTimeout(timer);
    this.markTimers.set(target, setTimeout(() => target.set(null), COPY_FEEDBACK_MS));
  }
}
