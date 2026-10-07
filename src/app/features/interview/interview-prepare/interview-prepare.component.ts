import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { EditorState, type Extension } from '@codemirror/state';
import { ActivatedRoute, Router } from '@angular/router';

import { findByNumber } from '../../../core/data/algorithms.data';
import { loadMetaOrNull } from '../../../core/data/load-meta';
import type { PracticeProblem } from '../../../core/models/practice.model';
import { PracticeService } from '../../../core/services/practice.service';
import { PageHeaderComponent, type BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import { CodeEditorComponent } from '../../practice/code-editor/code-editor.component';
import { PracticeDescriptionComponent } from '../../practice/practice-description/practice-description.component';
import { PROBLEM_TRACK, WORK_TRACK } from '../../practice/practice-split';
import { SAVE_REFUSED_MESSAGE } from '../interview-messages';
import { ProblemEditorComponent } from '../problem-editor/problem-editor.component';
import { importProblem, toPracticeProblem } from '../problem-import';
import { createSavedProblem, loadSavedProblem, updateSavedProblem } from '../saved-problem-store';
import { parseInterviewProblem, type InterviewProblem } from '../session/interview-problem';
import { clearInterviewDraft, loadInterviewDraft, saveInterviewDraft } from './interview-draft';

/** How long edits rest before they are saved to the draft or the saved problem. */
export const AUTOSAVE_DELAY_MS = 500;
/** The query parameter that opens the editor with a site problem imported. */
const IMPORT_PARAM = 'import';
/** The query parameter that opens the editor on a saved problem. */
const PROBLEM_PARAM = 'problem';
export const DRAFT_STATUS = 'Not saved yet.';
export const SAVED_STATUS = 'Changes save automatically.';
export const PROBLEM_NOT_FOUND_MESSAGE = 'That saved problem was not found.';
/** The View tab's starter is for reading only. */
const READ_ONLY_EXTENSIONS: readonly Extension[] = [EditorState.readOnly.of(true)];

type Tab = 'edit' | 'view';

const TABS: readonly { readonly id: Tab; readonly label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'view', label: 'View' },
];

/** The problem editor: a draft until it is saved, then a saved problem, never connected to a session. */
@Component({
  selector: 'app-interview-prepare',
  templateUrl: './interview-prepare.component.html',
  styleUrls: ['../../practice/practice-page/practice-page.component.scss', './interview-prepare.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditorComponent, PageHeaderComponent, PracticeDescriptionComponent, ProblemEditorComponent],
})
export class InterviewPrepareComponent {
  private readonly practice = inject(PracticeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly breadcrumb: BreadcrumbEntry[] = [
    { label: 'Home', link: '/' },
    { label: 'Practice', link: '/practice' },
    { label: 'Interview', link: '/interview' },
    { label: 'Problem' },
  ];

  protected readonly tabs = TABS;
  protected readonly problemTrack = PROBLEM_TRACK;
  protected readonly workTrack = WORK_TRACK;
  protected readonly readOnlyExtensions = READ_ONLY_EXTENSIONS;

  /** The saved problem being edited; null while the form is the draft. */
  private readonly problemId = signal<string | null>(null);
  /** The editor's problem: the saved draft at first, then the saved problem's or whatever is typed. */
  protected readonly form = signal<InterviewProblem>(loadInterviewDraft());
  protected readonly tab = signal<Tab>('edit');
  /** True while the form holds a problem the session would reject (an over-long starter or problem). */
  protected readonly isRejected = signal(false);
  protected readonly message = signal<string | null>(null);
  protected readonly status = computed(() => (this.problemId() === null ? DRAFT_STATUS : SAVED_STATUS));
  protected readonly preview = computed<PracticeProblem | null>(() => {
    const problem = parseInterviewProblem(this.form());
    return problem ? toPracticeProblem(problem) : null;
  });

  /** The site problem number the page opened with in `?import=`; null once handled or when none was given. */
  private pendingImport: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.flushPending());
    this.openSavedProblem();
    this.startImport();
  }

  /** Reads `?problem=` once; a saved problem fills the form, an unknown id says so and drops the parameter. */
  private openSavedProblem(): void {
    const id = this.route.snapshot.queryParamMap.get(PROBLEM_PARAM);
    if (id === null) return;
    const loaded = loadSavedProblem(id);
    if (loaded === null) {
      this.message.set(PROBLEM_NOT_FOUND_MESSAGE);
      this.dropParam(PROBLEM_PARAM);
      return;
    }
    this.form.set(loaded.problem);
    this.problemId.set(id);
  }

  /** Reads `?import=` once; a value that is not a number is dropped at once, a number waits for the practice data. */
  private startImport(): void {
    const raw = this.route.snapshot.queryParamMap.get(IMPORT_PARAM);
    if (raw === null || this.problemId() !== null) return;
    const number = raw.trim() === '' ? NaN : Number(raw);
    if (!Number.isInteger(number)) {
      this.dropParam(IMPORT_PARAM);
      return;
    }
    this.pendingImport = number;
    effect(() => {
      const problems = this.practice.data()?.problems;
      if (problems) untracked(() => void this.finishImport(problems));
    });
  }

  /** Fills the draft from the site problem, as the editor's Import select does, then drops the
   *  parameter. The full algorithm loads here, at the moment of import, never at render. */
  private async finishImport(problems: readonly PracticeProblem[]): Promise<void> {
    const number = this.pendingImport;
    if (number === null) return;
    this.pendingImport = null;
    const site = problems.find((candidate) => candidate.number === number);
    if (site) {
      const meta = await loadMetaOrNull(findByNumber(site.number));
      this.onFormChange(importProblem(site, meta));
    }
    this.dropParam(IMPORT_PARAM);
  }

  private dropParam(name: string): void {
    this.router
      .navigate([], { relativeTo: this.route, queryParams: { [name]: null }, queryParamsHandling: 'merge', replaceUrl: true })
      .catch((err: unknown) => console.error(`Interview prepare: could not drop the ${name} parameter`, err));
  }

  protected onFormChange(next: InterviewProblem): void {
    this.form.set(next);
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.autosave();
    }, AUTOSAVE_DELAY_MS);
  }

  /** The Save button: the draft becomes a saved problem; a saved problem is written now. */
  protected save(): void {
    if (!this.validateForm()) return;
    this.clearTimer();
    const id = this.problemId();
    if (id === null) {
      this.saveDraftAsProblem();
      return;
    }
    this.writeSaved(id);
  }

  private saveDraftAsProblem(): void {
    const id = createSavedProblem(this.form(), Date.now());
    if (id === null) {
      this.message.set(SAVE_REFUSED_MESSAGE);
      return;
    }
    this.message.set(null);
    clearInterviewDraft();
    this.problemId.set(id);
    this.router
      .navigate([], { relativeTo: this.route, queryParams: { [PROBLEM_PARAM]: id }, queryParamsHandling: 'merge', replaceUrl: true })
      .catch((err: unknown) => console.error('Interview prepare: could not add the problem parameter', err));
  }

  /** Writes the form to the draft, or to the saved problem; a refused write says so. */
  private autosave(): void {
    if (!this.validateForm()) return;
    const id = this.problemId();
    if (id === null) {
      saveInterviewDraft(this.form());
      return;
    }
    this.writeSaved(id);
  }

  /** Checks the form as the session would and records the result in `isRejected`; true when it is valid. */
  private validateForm(): boolean {
    const isValid = parseInterviewProblem(this.form()) !== null;
    this.isRejected.set(!isValid);
    return isValid;
  }

  private writeSaved(id: string): void {
    const isSaved = updateSavedProblem(id, this.form(), Date.now());
    this.message.set(isSaved ? null : SAVE_REFUSED_MESSAGE);
  }

  private flushPending(): void {
    if (this.timer === null) return;
    this.clearTimer();
    this.autosave();
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}
