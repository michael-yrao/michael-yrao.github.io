import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Difficulty } from '../../../core/models/algorithm.model';
import { InterviewBarComponent } from '../interview/interview-bar/interview-bar.component';
import { CatalogueNeighbors } from '../practice-catalogue';

export type PracticeHeaderTab = 'description' | 'solution';

/** A problem's heading, its previous / next links and the Description | Solution tab row, shared
 *  by the practice page and the solution page. Renders its inputs; its one choice is which tab the
 *  previous / next links keep. */
@Component({
  selector: 'app-practice-header',
  templateUrl: './practice-header.component.html',
  styleUrls: ['./practice-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InterviewBarComponent, NgClass, RouterLink],
})
export class PracticeHeaderComponent {
  readonly number = input.required<number | null>();
  readonly title = input.required<string>();
  readonly titleUrl = input.required<string | null>();
  readonly difficulty = input.required<Difficulty | null>();
  readonly neighbors = input.required<CatalogueNeighbors>();
  readonly activeTab = input.required<PracticeHeaderTab>();
  readonly hasSolution = input.required<boolean>();
  /** A candidate sees no difficulty and no Solution tab. */
  readonly isCandidate = input(false);
  /** A session is pinned to one problem: no prev / next, and the Solution tab opens in a new tab. */
  readonly isInSession = input(false);
  /** The practice page hosts the interview controls; the solution page leaves them out. */
  readonly showInterview = input(false);
  /** The Interview button inside the bar was pressed. */
  readonly interviewStart = output<void>();

  /** Prev / next stay on the current tab: a problem's solution page links to the next solution page. */
  protected readonly neighborCommands = computed(() => {
    const suffix = this.activeTab() === 'solution' ? ['solution'] : [];
    return (number: number): readonly (string | number)[] => ['/practice', number, ...suffix];
  });
}
