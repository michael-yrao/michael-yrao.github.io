import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { todayLocalISO } from '../../../core/utils/local-date';

interface DayCell {
  date: string;
  studied: boolean;
}

interface MonthColumn {
  label: string | null;
}

// A rolling window, not calendar-aligned weeks — simplest thing that reads as a heatmap
// (GitHub's contribution graph is the reference point) without needing ISO-week arithmetic.
const WINDOW_WEEKS = 20;
const CELL_COUNT = WINDOW_WEEKS * 7;
const MONTH_ABBREV = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * The streak drill: "when did I practice? longest run?" A compact contribution-style
 * heatmap of the last ~20 weeks, built entirely from `studyDays[]` (already on the summary)
 * — no fetch. Filled cell = a study day; the grid fills column-major (oldest week left,
 * today's week right) via CSS `grid-auto-flow: column`. Round 2: a month label above each
 * month-boundary column, plus a "last N weeks · since {date}" caption, so a column's
 * position in time is legible instead of just a blob of cells.
 */
@Component({
  selector: 'app-streak-calendar',
  templateUrl: './streak-calendar.component.html',
  styleUrls: ['./streak-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StreakCalendarComponent {
  readonly studyDays = input.required<string[]>();
  readonly current = input(0);
  readonly longest = input(0);

  readonly windowWeeks = WINDOW_WEEKS;

  readonly cells = computed<DayCell[]>(() => {
    const studied = new Set(this.studyDays());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: DayCell[] = [];
    for (let i = CELL_COUNT - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      out.push({ date: iso, studied: studied.has(iso) });
    }
    return out;
  });

  // One label per COLUMN (a column = 7 consecutive cells, oldest-to-newest, matching the
  // grid's column-major fill) — shown only at a month boundary, so the row stays sparse.
  readonly monthColumns = computed<MonthColumn[]>(() => {
    const cells = this.cells();
    const cols: MonthColumn[] = [];
    let lastMonth = -1;
    for (let col = 0; col < WINDOW_WEEKS; col++) {
      const first = cells[col * 7];
      if (!first) {
        cols.push({ label: null });
        continue;
      }
      const month = Number(first.date.slice(5, 7)) - 1;
      cols.push({ label: month !== lastMonth ? MONTH_ABBREV[month] : null });
      lastMonth = month;
    }
    return cols;
  });

  readonly since = computed(() => this.cells()[0]?.date ?? '');

  readonly today = todayLocalISO();
}
