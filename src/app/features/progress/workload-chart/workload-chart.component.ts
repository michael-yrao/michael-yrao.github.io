import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { WorkloadDay } from '../../../core/models/progress.model';
import { shortMonthDay, todayLocalISO, weekStartISO } from '../../../core/utils/local-date';
import { WorkloadBand, workloadBand } from '../../../core/utils/workload-band';

type ChartView = 'daily' | 'weekly';

/** One rendered bar-pair (an outline "planned" rect layered under a solid "done" rect) — the
 *  same shape for both the daily and weekly series, so one template renders both. */
interface BarDatum {
  readonly key: string;
  readonly label: string;
  readonly dateLabel: string;
  readonly planned: number | null;
  readonly done: number;
  readonly partial: boolean;
  readonly isFuture: boolean;
  readonly band: WorkloadBand | null;
}

export const DAILY_WINDOW_DAYS = 56;
export const WEEKLY_WINDOW_WEEKS = 12;
const DAYS_PER_WEEK = 7;
const DAILY_LABEL_STRIDE = 7; // every 7th bar labeled in the daily view (weekly labels every bar)

// Per-view bar geometry (viewBox units). The daily view can have up to DAILY_WINDOW_DAYS (56)
// bars in one row — at the weekly view's spacing that would come to 1520 units, far wider than
// the card. A narrower daily slot keeps the full 56-bar row close to the weekly view's own
// width; the SVG renders at its intrinsic size inside an overflow-x scroll wrapper, so labels
// never shrink below their 7px design size.
const DAILY_BAR_WIDTH = 10;
const DAILY_BAR_SPACING = 14;
const WEEKLY_BAR_WIDTH = 16;
const WEEKLY_BAR_SPACING = 26;

const BAND_COLOR: Readonly<Record<WorkloadBand, string>> = {
  Light: 'var(--color-easy)',
  Moderate: 'var(--color-medium)',
  Heavy: 'var(--color-hard)',
};
// A done bar with no known ceiling can't be banded — a neutral fill rather than an
// arbitrary guess at Light/Moderate/Heavy.
const UNBANDED_DONE_COLOR = 'var(--color-accent)';

const ROUND_TO_TENTH = 10;
function roundToTenth(n: number): number {
  return Math.round(n * ROUND_TO_TENTH) / ROUND_TO_TENTH;
}

/** Sums a bar list's planned/done, both rounded to 1dp (the contract's own precision) — the
 *  shared arithmetic behind both the aria-label summary and (indirectly) each weekly bar's
 *  own planned/done totals. */
function sumUnits(bars: readonly BarDatum[], pick: (b: BarDatum) => number): number {
  return roundToTenth(bars.reduce((sum, b) => sum + pick(b), 0));
}

/**
 * The Activity tab's workload chart — planned (schedule header) vs completed (struck rows,
 * re-priced under the CURRENT cse.config.yml) effort units, either per day (last
 * `DAILY_WINDOW_DAYS` days of entries) or per week (last `WEEKLY_WINDOW_WEEKS` ISO weeks,
 * Monday-start). Inline SVG, same bar-in-bar encoding as the Overview schedule card's own
 * workload bar (`workloadBand`): an outline planned bar with a solid done bar layered on top,
 * the done bar's fill naming its band (Light/Moderate/Heavy) exactly like that card's.
 *
 * No charting library — same house style as `problem-timeline.component.ts`.
 */
@Component({
  selector: 'app-workload-chart',
  templateUrl: './workload-chart.component.html',
  styleUrls: ['./workload-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkloadChartComponent {
  readonly workload = input.required<WorkloadDay[]>();
  readonly ceiling = input<number | null>(null);
  readonly floor = input<number | null>(null);

  readonly view = signal<ChartView>('daily');

  setView(next: ChartView): void {
    this.view.set(next);
  }

  // ── Layout (viewBox units — fixed proportions like problem-timeline.component.ts) ──────
  readonly padX = 32;
  readonly padTop = 16;
  readonly plotH = 160;
  readonly labelGapY = 10;
  readonly labelRowH = 46;
  readonly H = this.padTop + this.plotH + this.labelRowH;
  private readonly minW = 640;

  // Bar width/spacing follow the CURRENT view (see the per-view constants above) — the
  // template and xFor()/width() all read these, never the per-view constants directly, so
  // there is exactly one place that decides "which view am I in".
  readonly barWidth = computed(() => (this.view() === 'daily' ? DAILY_BAR_WIDTH : WEEKLY_BAR_WIDTH));
  private readonly barSpacing = computed(() =>
    this.view() === 'daily' ? DAILY_BAR_SPACING : WEEKLY_BAR_SPACING,
  );

  private readonly dailyBars = computed<BarDatum[]>(() => {
    const today = todayLocalISO();
    const ceiling = this.ceiling();
    const floor = this.floor();
    return this.workload()
      .slice(-DAILY_WINDOW_DAYS)
      .map((day) => this.toBarDatum(day, shortMonthDay(day.date), day.date > today, ceiling, floor));
  });

  private readonly weeklyBars = computed<BarDatum[]>(() => {
    const ceiling = this.ceiling();
    const weeklyCeiling = ceiling != null ? ceiling * DAYS_PER_WEEK : null;
    const floor = this.floor();
    const weeklyFloor = floor != null ? floor * DAYS_PER_WEEK : null;
    const weeks = groupByWeek(this.workload());
    return weeks
      .slice(-WEEKLY_WINDOW_WEEKS)
      .map((week) => this.toBarDatum(week, shortMonthDay(week.date), false, weeklyCeiling, weeklyFloor));
  });

  readonly bars = computed<BarDatum[]>(() => (this.view() === 'daily' ? this.dailyBars() : this.weeklyBars()));

  private toBarDatum(
    entry: WorkloadDay,
    label: string,
    isFuture: boolean,
    ceiling: number | null,
    floor: number | null,
  ): BarDatum {
    const band = !isFuture && ceiling != null && ceiling > 0 ? workloadBand(entry.done, ceiling, floor) : null;
    return {
      key: entry.date,
      label,
      dateLabel: entry.date,
      planned: entry.planned,
      done: entry.done,
      partial: entry.partial,
      isFuture,
      band,
    };
  }

  readonly width = computed(() =>
    Math.max(this.minW, this.padX * 2 + this.barSpacing() * this.bars().length),
  );

  private readonly ceilingLine = computed<number | null>(() => {
    const c = this.ceiling();
    if (c == null) return null;
    return this.view() === 'daily' ? c : c * DAYS_PER_WEEK;
  });

  private readonly domainMax = computed(() => {
    const bars = this.bars();
    const plannedMax = Math.max(0, ...bars.map((b) => b.planned ?? 0));
    const doneMax = Math.max(0, ...bars.map((b) => b.done));
    return Math.max(this.ceilingLine() ?? 0, plannedMax, doneMax, 1);
  });

  readonly ceilingLineY = computed<number | null>(() => {
    const cl = this.ceilingLine();
    return cl == null ? null : this.yFor(cl);
  });

  // Rounded to 1dp — the weekly line is ceiling * 7, and floating multiplication (e.g. 8.1 *
  // 7) can otherwise print a value like "56.699999999999996".
  readonly ceilingLineLabel = computed(() => {
    const cl = this.ceilingLine();
    return cl == null ? '' : `ceiling ${roundToTenth(cl)}`;
  });

  xFor(index: number): number {
    return this.padX + index * this.barSpacing();
  }

  yFor(value: number): number {
    return this.padTop + this.plotH - (this.plotH * value) / this.domainMax();
  }

  heightFor(value: number): number {
    return (this.plotH * value) / this.domainMax();
  }

  readonly labelY = this.padTop + this.plotH + this.labelGapY;

  showLabel(index: number): boolean {
    return this.view() === 'weekly' || index % DAILY_LABEL_STRIDE === 0;
  }

  colorFor(bar: BarDatum): string {
    return bar.band ? BAND_COLOR[bar.band] : UNBANDED_DONE_COLOR;
  }

  tooltipFor(bar: BarDatum): string {
    const plannedText = bar.planned == null ? 'none' : `${bar.planned}`;
    const doneText = bar.isFuture ? 'not yet due' : `${bar.done}${bar.partial ? ' (≈ partial pricing)' : ''}`;
    const bandText = bar.band ? ` · ${bar.band}` : '';
    return `${bar.dateLabel} · planned ${plannedText} · done ${doneText}${bandText}`;
  }

  readonly summary = computed(() => {
    const bars = this.bars();
    const label = this.view() === 'daily' ? 'Daily' : 'Weekly';
    const unit = this.view() === 'daily' ? 'days' : 'weeks';
    const planned = sumUnits(bars, (b) => b.planned ?? 0);
    const done = sumUnits(bars, (b) => b.done);
    return `${label} workload, last ${bars.length} ${unit}: planned ${planned} units, done ${done}`;
  });
}

/** Groups daily entries into one summed `WorkloadDay` per ISO (Monday-start) week — nulls in
 *  `planned` count as 0 toward the week's sum, per the contract's own rule for a week that
 *  mixes header-less and header-bearing days. `partial` is true if ANY grouped day was. The
 *  synthetic entry's own `date` is the week's Monday (so `shortMonthDay` labels it), and
 *  `built` is carried as the same done+planned-agnostic sum for shape-completeness even
 *  though the chart itself never reads it. Always builds new objects — never mutates the
 *  input days or a prior accumulator. */
function groupByWeek(days: readonly WorkloadDay[]): WorkloadDay[] {
  const byWeek = new Map<string, WorkloadDay>();
  for (const day of days) {
    const weekStart = weekStartISO(day.date);
    const existing = byWeek.get(weekStart);
    const base = existing ?? { date: weekStart, planned: 0, done: 0, built: 0, partial: false };
    byWeek.set(weekStart, {
      date: weekStart,
      planned: roundToTenth((base.planned ?? 0) + (day.planned ?? 0)),
      done: roundToTenth(base.done + day.done),
      built: roundToTenth(base.built + day.built),
      partial: base.partial || day.partial,
    });
  }
  return Array.from(byWeek.values()).sort((a, b) => a.date.localeCompare(b.date));
}
