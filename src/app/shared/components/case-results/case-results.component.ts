import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { Codec, PracticeCase } from '../../../core/models/practice.model';
import { RunState } from '../../../core/runner/runner.model';
import { defaultCaseIndex, toResultRow } from '../../utils/practice-results';

/** A run's output: its error, one tab per case, and the selected case's detail. */
@Component({
  selector: 'app-case-results',
  templateUrl: './case-results.component.html',
  styleUrls: ['./case-results.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CaseResultsComponent {
  readonly runState = input.required<RunState>();
  readonly cases = input.required<readonly PracticeCase[]>();
  readonly resultCodec = input<Codec | null>(null);
  /** The tab the learner clicked; null until they click, so the default follows the first failure. */
  readonly selected = input<number | null>(null);
  readonly selectedChange = output<number | null>();

  readonly rows = computed(() =>
    this.runState().results.map((result) => toResultRow(result, this.cases(), this.resultCodec())),
  );
  readonly activeIndex = computed(() => {
    const selected = this.selected();
    return selected !== null && selected < this.rows().length ? selected : defaultCaseIndex(this.rows());
  });
  readonly activeRow = computed(() => this.rows()[this.activeIndex()] ?? null);
}
