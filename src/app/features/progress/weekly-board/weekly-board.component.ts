import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Schedule } from '../../../core/models/progress.model';
import { vizRouteFor } from '../../../core/data/viz-route';
import { leetCodeUrlFor } from '../../../core/data/lc-url';
import { todayLocalISO } from '../../../core/utils/local-date';

/**
 * The Overview tab's second card: the FULL week's board (today-board.component shows only
 * today's slice out of the same `schedule.days`). Same row visual language as
 * app-today-board (done check, comfort glyph, #num, title, difficulty/technique tags,
 * Visualize/LeetCode links) — reused here rather than shared, since today-board's styles are
 * component-scoped and this card also needs the extra day-header row today-board never shows.
 * Entirely derived from the summary's `schedule` (already rides the payload whole); no fetch.
 */
@Component({
  selector: 'app-weekly-board',
  templateUrl: './weekly-board.component.html',
  styleUrls: ['./weekly-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class WeeklyBoardComponent {
  readonly schedule = input<Schedule | null | undefined>();

  readonly todayISO = computed(() => todayLocalISO());

  readonly days = computed(() => this.schedule()?.days ?? []);

  vizRoute(lcNumber: number | null): string | null {
    return vizRouteFor(lcNumber);
  }

  protected readonly leetCodeUrlFor = leetCodeUrlFor;
}
