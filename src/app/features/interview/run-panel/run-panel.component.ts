import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { CaseResultsComponent } from '../../practice/case-results/case-results.component';
import { TIME_LIMIT_WORD } from '../../practice/practice-results';
import type { CodeRun } from '../run/code-run';

/** The Run and Reset toolbar and the output of a code run. */
@Component({
  selector: 'app-run-panel',
  templateUrl: './run-panel.component.html',
  styleUrls: ['../../practice/practice-page/practice-page.component.scss'],
  styles: [':host { display: contents; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseResultsComponent],
})
export class RunPanelComponent {
  readonly run = input.required<CodeRun>();
  readonly canReset = input(true);
  readonly runRequest = output<void>();
  readonly resetRequest = output<void>();

  protected readonly timeLimitWord = TIME_LIMIT_WORD;
}
