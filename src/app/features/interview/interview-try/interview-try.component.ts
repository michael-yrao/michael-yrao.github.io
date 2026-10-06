import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type { PracticeProblem } from '../../../core/models/practice.model';
import { PageHeaderComponent, type BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import { CodeEditorComponent } from '../../practice/code-editor/code-editor.component';
import { PracticeDescriptionComponent } from '../../practice/practice-description/practice-description.component';
import { shortcutFor } from '../../practice/practice-shortcuts';
import { PROBLEM_TRACK, WORK_TRACK } from '../../practice/practice-split';
import { toPracticeProblem } from '../problem-import';
import { RunPanelComponent } from '../run-panel/run-panel.component';
import { injectCodeRun } from '../run/code-run';
import { loadSavedProblem } from '../saved-problem-store';
import type { InterviewProblem } from '../session/interview-problem';

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Practice', link: '/practice' },
  { label: 'Interview', link: '/interview' },
  { label: 'Test run' },
];

/** A saved problem as the candidate sees it: the description beside an editor and Run. Nothing here is shared or saved. */
@Component({
  selector: 'app-interview-try',
  templateUrl: './interview-try.component.html',
  styleUrls: ['../../practice/practice-page/practice-page.component.scss', './interview-try.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CodeEditorComponent, PageHeaderComponent, PracticeDescriptionComponent, RouterLink, RunPanelComponent],
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class InterviewTryComponent {
  private readonly editor = viewChild(CodeEditorComponent);

  protected readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
  protected readonly problem: InterviewProblem | null = loadSavedProblem(this.id)?.problem ?? null;
  protected readonly practiceProblem: PracticeProblem | null = this.problem ? toPracticeProblem(this.problem) : null;
  protected readonly starter = this.problem?.starter ?? '';
  protected readonly breadcrumb = BREADCRUMB;
  protected readonly problemTrack = PROBLEM_TRACK;
  protected readonly workTrack = WORK_TRACK;
  protected readonly codeRun = injectCodeRun();

  protected readonly text = signal(this.starter);

  protected onKeydown(event: KeyboardEvent): void {
    if (this.problem === null || shortcutFor(event) === null) return;
    event.preventDefault();
    this.run();
  }

  protected run(): void {
    if (this.codeRun.isBusy()) return;
    this.codeRun.start(this.text(), this.problem);
  }

  /** Puts the problem's starter back into the editor. */
  protected reset(): void {
    this.editor()?.setText(this.starter);
  }
}
