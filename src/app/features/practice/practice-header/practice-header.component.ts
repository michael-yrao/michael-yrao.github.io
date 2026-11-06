import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Difficulty } from '../../../core/models/algorithm.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TodayStripComponent } from '../today-strip/today-strip.component';

/** The practice page's left-pane views a header tab can select. */
export type PracticePaneView = 'description' | 'code';

/** The left pane's state for the header: the view it shows (null while collapsed) and whether Code is offered. */
export interface PracticeHeaderPane {
  readonly shown: PracticePaneView | null;
  readonly hasCode: boolean;
}

/** A problem's heading (unless the page names the problem itself; the title links to the practice page and a
 *  separate arrow to the external problem), its Description | Code tabs (practice page), and the today strip on one bar.
 *  Renders its inputs. */
@Component({
  selector: 'app-practice-header',
  templateUrl: './practice-header.component.html',
  styleUrls: ['./practice-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, IconComponent, TodayStripComponent],
})
export class PracticeHeaderComponent {
  readonly number = input.required<number | null>();
  readonly title = input.required<string>();
  readonly titleUrl = input.required<string | null>();
  readonly difficulty = input.required<Difficulty | null>();
  /** False where the page names the problem itself (the practice page's problem pane bar). */
  readonly isTitleShown = input(true);
  /** True while the page celebrates a fresh pass; the today strip ripples its current dot. */
  readonly isPassFresh = input(false);
  /** Set by the practice page: Description (and Code) become buttons that select the left pane's view.
   *  Null (the solution page) shows no tabs. */
  readonly pane = input<PracticeHeaderPane | null>(null);
  readonly paneSelect = output<PracticePaneView>();
}
