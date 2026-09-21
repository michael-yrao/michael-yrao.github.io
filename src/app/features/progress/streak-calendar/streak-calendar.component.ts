import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface DayCell {
  date: string;
  studied: boolean;
}

// A rolling window, not calendar-aligned weeks — simplest thing that reads as a heatmap
// (GitHub's contribution graph is the reference point) without needing ISO-week arithmetic.
const WINDOW_WEEKS = 20;
const CELL_COUNT = WINDOW_WEEKS * 7;

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * The streak drill: "when did I practice? longest run?" A compact contribution-style
 * heatmap of the last ~20 weeks, built entirely from `studyDays[]` (already on the summary)
 * — no fetch. Filled cell = a study day; the grid fills column-major (oldest week left,
 * today's week right) via CSS `grid-auto-flow: column`.
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

  readonly today = todayLocalISO();
}
