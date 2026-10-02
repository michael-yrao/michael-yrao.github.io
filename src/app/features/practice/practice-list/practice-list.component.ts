import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PracticeProblem } from '../../../core/models/practice.model';
import { PracticeService } from '../../../core/services/practice.service';
import {
  BreadcrumbEntry,
  PageHeaderComponent,
} from '../../../shared/components/page-header/page-header.component';
import { injectPracticeContract } from '../practice-contract';

/** The list shows only a number and a title: anything more would give away the technique. */
export interface PracticeListRow {
  readonly number: number;
  readonly title: string;
}

function toRow(problem: PracticeProblem): PracticeListRow {
  return { number: problem.number, title: problem.title };
}

@Component({
  selector: 'app-practice-list',
  templateUrl: './practice-list.component.html',
  styleUrls: ['./practice-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
})
export class PracticeListComponent {
  private readonly practice = inject(PracticeService);
  private readonly contract = injectPracticeContract();

  readonly breadcrumb: BreadcrumbEntry[] = [{ label: 'Home', link: '/' }, { label: 'Practice' }];
  readonly invalidSlug = this.contract.invalidSlug;
  readonly status = this.contract.status;
  readonly error = this.contract.error;

  /** Every problem in the contract, ascending by number; empty until the contract is ready. */
  readonly rows = computed<readonly PracticeListRow[]>(() => {
    if (this.status() !== 'ready') return [];
    const problems = this.practice.data()?.problems ?? [];
    return problems.map(toRow).sort((a, b) => a.number - b.number);
  });
}
