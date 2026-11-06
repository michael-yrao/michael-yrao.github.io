import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Difficulty } from '../../../core/models/algorithm.model';
import type { RepoRef } from '../../../core/services/github-file.service';
import { TodaySessionService } from '../../../core/today-session/today-session.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CatalogueEntry, CatalogueNeighbors } from '../practice-catalogue';
import { ProblemListPanelComponent } from '../problem-list/problem-list-panel.component';
import { TodayStripComponent } from '../today-strip/today-strip.component';

export type PracticeHeaderTab = 'description' | 'solution';

/** The practice page's left-pane views a header tab can select. */
export type PracticePaneView = 'description' | 'code';

/** The left pane's state for the header: the view it shows (null while collapsed) and whether Code is offered. */
export interface PracticeHeaderPane {
  readonly shown: PracticePaneView | null;
  readonly hasCode: boolean;
}

/** A problem's heading (unless the page names the problem itself), its Description | Solution tabs
 *  and its previous / next links on one bar, shared by the practice page and the solution page. Renders its inputs; its one choice is which tab the
 *  previous / next links keep. */
@Component({
  selector: 'app-practice-header',
  templateUrl: './practice-header.component.html',
  styleUrls: ['./practice-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, ProblemListPanelComponent, RouterLink, IconComponent, TodayStripComponent],
})
export class PracticeHeaderComponent {
  readonly number = input.required<number | null>();
  readonly title = input.required<string>();
  readonly titleUrl = input.required<string | null>();
  readonly difficulty = input.required<Difficulty | null>();
  readonly neighbors = input.required<CatalogueNeighbors>();
  readonly activeTab = input.required<PracticeHeaderTab>();
  readonly hasSolution = input.required<boolean>();
  readonly catalogue = input.required<readonly CatalogueEntry[]>();
  readonly repo = input.required<RepoRef | null>();
  /** False where the page names the problem itself (the practice page's problem pane bar). */
  readonly isTitleShown = input(true);
  /** True while the page celebrates a fresh pass; the today strip ripples its current dot. */
  readonly isPassFresh = input(false);
  /** Set by the practice page: Description (and Code) become buttons that select the left pane's view.
   *  Null (the solution page) keeps Description a link back to the practice page. */
  readonly pane = input<PracticeHeaderPane | null>(null);
  readonly paneSelect = output<PracticePaneView>();

  private readonly session = inject(TodaySessionService);

  /** During a run-through the today strip is the only navigation, so prev / next hide. */
  protected readonly isRunThrough = computed(() => {
    const n = this.number();
    return n !== null && this.session.isRunning(n);
  });

  /** Prev / next stay on the current tab: a problem's solution page links to the next solution page. */
  protected readonly neighborCommands = computed(() => {
    const suffix = this.activeTab() === 'solution' ? ['solution'] : [];
    return (number: number): readonly (string | number)[] => ['/practice', number, ...suffix];
  });
}
