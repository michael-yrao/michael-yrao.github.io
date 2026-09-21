import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Schedule, ScheduleDay } from '../../../core/models/progress.model';
import { vizRouteFor } from '../../../core/data/viz-route';
import { todayLocalISO } from '../../../core/utils/local-date';

/**
 * The landing's lead tile: "what do I do today?" Picks the one day out of the week's
 * `schedule.days` whose `date` matches the VIEWER's own local date (never a server-baked
 * "today" — the summary can be viewed days after it was generated) and renders it as a
 * compact checklist. Entirely derived from the summary (`schedule` rides it whole); no
 * fetch, ever — this is the instant overview, not a drill.
 *
 * ScheduleItem carries no canonical LeetCode URL (unlike ProblemProgress, whose url comes
 * from the tracker's markdown links) — a schedule row is just {lcNumber, title, ...}, no
 * slug. The LeetCode link falls back to the number-based search/redirect URL, which needs
 * no slug and always resolves to the right problem.
 */
@Component({
  selector: 'app-today-board',
  templateUrl: './today-board.component.html',
  styleUrls: ['./today-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class TodayBoardComponent {
  readonly schedule = input<Schedule | null | undefined>();

  readonly today = computed<ScheduleDay | null>(() => {
    const sched = this.schedule();
    if (!sched) return null;
    const todayISO = todayLocalISO();
    return sched.days.find((d) => d.date === todayISO) ?? null;
  });

  readonly doneCount = computed(() => this.today()?.items.filter((i) => i.done).length ?? 0);
  readonly totalCount = computed(() => this.today()?.items.length ?? 0);

  vizRoute(lcNumber: number | null): string | null {
    return vizRouteFor(lcNumber);
  }

  leetCodeUrl(lcNumber: number): string {
    return `https://leetcode.com/problemset/?search=${lcNumber}`;
  }
}
