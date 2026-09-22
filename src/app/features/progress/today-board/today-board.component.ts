import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';

import { Schedule, ScheduleDay } from '../../../core/models/progress.model';
import { vizRouteFor } from '../../../core/data/viz-route';
import { leetCodeUrlFor } from '../../../core/data/lc-url';
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
 * The Overview tab's one schedule card: a 7-day selector strip over the week's
 * `schedule.days`, defaulting to the VIEWER's own local date (never a server-baked "today" —
 * the summary can be viewed days after it was generated). Collapsed (default) shows just the
 * selected day's workload bar + done-count + item list; "Expand week" instead stacks all 7
 * days at once — the same view weekly-board used to own on its own, now folded in here so
 * the Overview tab carries a single schedule card instead of two.
 *
 * Entirely derived from the summary (`schedule`/`effortCeiling`/`effortFloor` all ride it
 * whole); no fetch, ever — this is the instant overview, not a drill.
 *
 * ScheduleItem's `url` (round 5) carries the tracker's canonical LeetCode URL, joined by
 * lcNumber server-side (cse-progress gamify.py's problem_urls()) — the site's own
 * AlgorithmMeta.id is a shortened route slug, not the LC slug, so it can't build this link
 * itself. leetCodeUrlFor() falls back to the number-based search/redirect URL only for a row
 * with no tracker url (e.g. a number not yet in dsa_progress.md).
 */
@Component({
  selector: 'app-today-board',
  templateUrl: './today-board.component.html',
  styleUrls: ['./today-board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet],
})
export class TodayBoardComponent {
  readonly schedule = input<Schedule | null | undefined>();
  readonly effortCeiling = input<number | undefined>();
  readonly effortFloor = input<number | undefined>();

  // Which day the strip has explicitly selected (null = no explicit pick yet — fall back to
  // today, or the first day of the week if today isn't in it).
  readonly selectedDate = signal<string | null>(null);
  // Collapsed (default) = just the selected day; expanded = the whole week stacked.
  readonly expanded = signal(false);

  readonly days = computed(() => this.schedule()?.days ?? []);
  readonly todayISO = computed(() => todayLocalISO());

  readonly effectiveDate = computed<string | null>(() => {
    const list = this.days();
    if (!list.length) return null;
    const selected = this.selectedDate();
    if (selected && list.some((d) => d.date === selected)) return selected;
    const todayISO = this.todayISO();
    if (list.some((d) => d.date === todayISO)) return todayISO;
    return list[0].date;
  });

  readonly selectedDay = computed<ScheduleDay | null>(
    () => this.days().find((d) => d.date === this.effectiveDate()) ?? null,
  );

  readonly doneCount = computed(() => this.selectedDay()?.items.filter((i) => i.done).length ?? 0);
  readonly totalCount = computed(() => this.selectedDay()?.items.length ?? 0);

  // null when there's no board/day, or the day carries no units, or ceiling is unknown —
  // "empty/no-board day -> no bar" (round 2 item 3).
  readonly workload = computed<Workload | null>(() => {
    const day = this.selectedDay();
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

  // The units-explainer popover (round 4 item 2 — replaces the native `title` tooltip, which
  // is slow (~1s), invisible on touch, and too wordy). Click/tap TOGGLES it (works on touch,
  // where there's no hover); the template also shows it instantly on `:hover`/`:focus-within`
  // for mouse/keyboard, in pure CSS, no signal involved for that path.
  readonly infoOpen = signal(false);

  toggleInfo(): void {
    this.infoOpen.update((v) => !v);
  }

  selectDay(date: string): void {
    this.selectedDate.set(date);
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  // Selector-strip button label — weekday abbreviation + day-of-month pulled straight out of
  // the ISO date (no date-parsing library needed for a fixed YYYY-MM-DD shape).
  dayButtonLabel(day: ScheduleDay): string {
    const dayOfMonth = day.date.slice(8, 10);
    const weekdayAbbrev = day.weekday.slice(0, 3);
    return `${weekdayAbbrev} ${dayOfMonth}`;
  }

  vizRoute(lcNumber: number | null): string | null {
    return vizRouteFor(lcNumber);
  }

  protected readonly leetCodeUrlFor = leetCodeUrlFor;
}
