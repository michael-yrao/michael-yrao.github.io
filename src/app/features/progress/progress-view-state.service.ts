import { Injectable, signal } from '@angular/core';

/** Progress page per-widget view state (Schedule board's week/day/expanded pick, on the
 *  Overview tab; Workload chart's daily/weekly toggle, on the Activity tab). A tab switch still
 *  destroys and recreates each `@if`-gated widget — this service just holds the state OUTSIDE
 *  the widget, so it survives that destroy/recreate instead of resetting on every switch.
 *  NO storage: this lives only for the page's own lifetime (a fresh instance, and so fresh
 *  defaults, on every reload) — same shape as SolutionLinkModeService, minus persistence. */
@Injectable({ providedIn: 'root' })
export class ProgressViewStateService {
  /** Which week the Schedule board has on screen — null means "the current week" (see
   *  TodayBoardComponent's `displayedWeekOf`). Set only by prevWeek()/nextWeek(). */
  readonly scheduleWeekOf = signal<string | null>(null);
  /** Which day the Schedule board's selector strip has explicitly picked — null means no
   *  explicit pick yet (falls back to today, or the week's first day). */
  readonly scheduleSelectedDate = signal<string | null>(null);
  /** Collapsed (false, default) = just the selected day; expanded (true) = the whole week
   *  stacked. */
  readonly scheduleExpanded = signal(false);
  /** The Workload chart's daily/weekly toggle. */
  readonly workloadView = signal<ChartView>('daily');
}

/** The Workload chart's two series granularities. */
export type ChartView = 'daily' | 'weekly';
