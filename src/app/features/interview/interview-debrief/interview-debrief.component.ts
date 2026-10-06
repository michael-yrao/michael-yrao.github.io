import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { EditorState, type Extension } from '@codemirror/state';
import { ActivatedRoute, Router } from '@angular/router';

import { PRACTICE_SECTIONS } from '../../../core/data/practice-sections';
import { LibrarySubnavComponent } from '../../../shared/components/library-subnav/library-subnav.component';
import { PageHeaderComponent, type BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import { CodeEditorComponent } from '../../practice/code-editor/code-editor.component';
import { COPY_FEEDBACK_MS, copyText, type CopyMark } from '../copy-text';
import { formatDebriefDate, roleLabel } from '../interview-page/interview-format';
import { VERDICT_LABELS } from '../interview-notes/verdict-labels';
import { CHECK_KEYS, CHECK_NAMES, debriefMarkdown, verdictOf, type Debrief } from '../session/debrief';
import { loadDebrief, removeDebrief } from '../session/debrief-store';

const MS_PER_MINUTE = 60_000;
const DELETE_CONFIRM = 'Delete this debrief?';
const INTERVIEW_PATH = '/interview';
/** The final code is for reading only. */
const READ_ONLY_EXTENSIONS: readonly Extension[] = [EditorState.readOnly.of(true)];

/** A finished interview, read from this browser: the meta, the checklist and verdict, the notes, the
 *  final code and the Markdown export. An id with nothing stored goes back to the landing. */
@Component({
  selector: 'app-interview-debrief',
  templateUrl: './interview-debrief.component.html',
  styleUrls: ['../../practice/practice-page/practice-page.component.scss', './interview-debrief.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditorComponent, LibrarySubnavComponent, PageHeaderComponent],
})
export class InterviewDebriefComponent {
  private readonly router = inject(Router);

  protected readonly practiceSections = PRACTICE_SECTIONS;
  protected readonly checkKeys = CHECK_KEYS;
  protected readonly checkNames = CHECK_NAMES;
  protected readonly readOnlyExtensions = READ_ONLY_EXTENSIONS;
  protected readonly formatDate = formatDebriefDate;
  protected readonly roleLabel = roleLabel;

  protected readonly debrief = signal<Debrief | null>(null);
  protected readonly breadcrumb: BreadcrumbEntry[] = [
    { label: 'Home', link: '/' },
    { label: 'Practice', link: '/practice' },
    { label: 'Interview', link: INTERVIEW_PATH },
  ];
  protected readonly durationMinutes = computed(() => {
    const summary = this.debrief()?.summary;
    return summary ? Math.round((summary.endedAt - summary.startedAt) / MS_PER_MINUTE) : 0;
  });
  protected readonly verdict = computed(() => {
    const summary = this.debrief()?.summary;
    return summary ? verdictOf(summary.notes) : null;
  });
  protected readonly verdictLabel = computed(() => {
    const verdict = this.verdict();
    return verdict === null ? null : VERDICT_LABELS[verdict];
  });
  /** The export, built once per loaded debrief. */
  private readonly markdown = computed(() => {
    const debrief = this.debrief();
    return debrief ? debriefMarkdown(debrief) : '';
  });
  protected readonly copyMark = signal<CopyMark | null>(null);
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearCopyTimer());
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id');
    const loaded = id === null ? null : loadDebrief(id);
    if (loaded === null) this.goToLanding();
    else this.debrief.set(loaded);
  }

  /** Copies the Markdown; the click calls `copyText` with no await before it. */
  protected copyMarkdown(): void {
    copyText(this.markdown()).then((isCopied) => this.showCopyMark(isCopied ? 'ok' : 'fail'));
  }

  protected deleteDebrief(): void {
    const debrief = this.debrief();
    if (!debrief || !window.confirm(DELETE_CONFIRM)) return;
    removeDebrief(debrief.sessionId);
    this.goToLanding(false);
  }

  private goToLanding(isReplace = true): void {
    this.router
      .navigate([INTERVIEW_PATH], { replaceUrl: isReplace })
      .catch((err: unknown) => console.error('Interview debrief: leaving the page failed', err));
  }

  private showCopyMark(mark: CopyMark): void {
    this.copyMark.set(mark);
    this.clearCopyTimer();
    this.copyTimer = setTimeout(() => this.copyMark.set(null), COPY_FEEDBACK_MS);
  }

  private clearCopyTimer(): void {
    if (this.copyTimer === null) return;
    clearTimeout(this.copyTimer);
    this.copyTimer = null;
  }
}
