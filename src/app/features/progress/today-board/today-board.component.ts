import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Schedule, ScheduleDay } from '../../../core/models/progress.model';
import { vizRouteFor } from '../../../core/data/viz-route';
import { todayLocalISO } from '../../../core/utils/local-date';

type WorkloadBand = 'Light' | 'Moderate' | 'Heavy';

interface Workload {
  units: number;
  ceiling: number;
  pct: number;
  band: WorkloadBand;
}

// Heavy at 90% of ceiling — matches the language the schedule's own build notes already use
// ("Mon priced 8.8 over ceiling") — a day this close to the cap reads as heavy even before
// it's technically over. Below this and above the floor is the (unremarkable) Moderate band.
const HEAVY_THRESHOLD = 0.9;

/**
 * The landing's lead tile: "what do I do today?" Picks the one day out of the week's
 * `schedule.days` whose `date` matches the VIEWER's own local date (never a server-baked
 * "today" — the summary can be viewed days after it was generated) and renders it as a
 * compact checklist, plus (round 2) a workload bar against the effort-budget ceiling/floor.
 * Entirely derived from the summary (`schedule`/`effortCeiling`/`effortFloor` all ride it
 * whole); no fetch, ever — this is the instant overview, not a drill.
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
  readonly effortCeiling = input<number | undefined>();
  readonly effortFloor = input<number | undefined>();

  readonly today = computed<ScheduleDay | null>(() => {
    const sched = this.schedule();
    if (!sched) return null;
    const todayISO = todayLocalISO();
    return sched.days.find((d) => d.date === todayISO) ?? null;
  });

  readonly doneCount = computed(() => this.today()?.items.filter((i) => i.done).length ?? 0);
  readonly totalCount = computed(() => this.today()?.items.length ?? 0);

  // null when there's no board/day, or the day carries no units, or ceiling is unknown —
  // "empty/no-board day -> no bar" (round 2 item 3).
  readonly workload = computed<Workload | null>(() => {
    const day = this.today();
    const ceiling = this.effortCeiling();
    if (!day || day.units == null || ceiling == null || ceiling <= 0) return null;
    const units = day.units;
    const floor = this.effortFloor();
    const pct = Math.min(100, (units / ceiling) * 100);
    let band: WorkloadBand;
    if (units >= HEAVY_THRESHOLD * ceiling) band = 'Heavy';
    else if (floor != null && units <= floor) band = 'Light';
    else band = 'Moderate';
    return { units, ceiling, pct, band };
  });

  vizRoute(lcNumber: number | null): string | null {
    return vizRouteFor(lcNumber);
  }

  leetCodeUrl(lcNumber: number): string {
    return `https://leetcode.com/problemset/?search=${lcNumber}`;
  }
}
