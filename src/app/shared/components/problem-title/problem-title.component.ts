import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../icon/icon.component';

const DEFAULT_ARROW_SIZE = 14;

/**
 * A problem's title wherever it shows: the text links to its practice page, and the external
 * page gets its own arrow. `isRunEntry` swaps the link for a button that emits `practice`.
 */
@Component({
  selector: 'app-problem-title',
  templateUrl: './problem-title.component.html',
  styleUrls: ['./problem-title.component.scss'],
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProblemTitleComponent {
  readonly number = input.required<number>();
  readonly title = input.required<string>();
  /** The external page; null shows no arrow. */
  readonly url = input<string | null>(null);
  /** False renders the title as plain text. */
  readonly hasPractice = input(true);
  /** True renders the title as a button that emits `practice` instead of a link. */
  readonly isRunEntry = input(false);
  readonly arrowSize = input(DEFAULT_ARROW_SIZE);
  /** True strikes the title text through (a finished row). */
  readonly isStruck = input(false);

  readonly practice = output<number>();
}
