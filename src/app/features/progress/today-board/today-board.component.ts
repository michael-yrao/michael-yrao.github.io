import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';

import { Schedule, ScheduleDay, ScheduleItem } from '../../../core/models/progress.model';
import { vizRouteFor } from '../../../core/data/viz-route';
import { leetCodeUrlFor } from '../../../core/data/lc-url';
import { shortMonthDay, todayLocalISO } from '../../../core/utils/local-date';

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

const COMPLEXITY_GATE_TITLE = 'Complexity gate';
const RE_ASK_SUFFIX = 're-asks';

/** A run of consecutive `kind === 'complexity'` items collapsed into one board row (the
 *  Sunday complexity re-ask block) — a purely local, derived shape, never part of the
 *  `ScheduleItem`/`Schedule` contract itself. `done` is true only once every member item is
 *  done; `subtitle` is numbers-only ("3 re-asks · 226 · 211 · 778") — the re-ask answers
 *  live off the board by design, so the gate row carries no links. */
export interface ComplexityGateRow {
  readonly isGate: true;
  readonly items: readonly ScheduleItem[];
  readonly done: boolean;
  readonly subtitle: string;
  readonly doneCount: number;
  readonly totalCount: number;
}

/** One rendered board row: either a plain schedule item, or a collapsed complexity gate. */
export type BoardRow = ScheduleItem | ComplexityGateRow;

function isGateRow(row: BoardRow): row is ComplexityGateRow {
  return (row as ComplexityGateRow).isGate === true;
}

function toGateRow(items: readonly ScheduleItem[]): ComplexityGateRow {
  const numbers = items
    .map((i) => i.lcNumber)
    .filter((n): n is number => n != null)
    .join(' · ');
  const doneCount = items.filter((i) => i.done).length;
  return {
    isGate: true,
    items,
    done: doneCount === items.length,
    subtitle: `${items.length} ${RE_ASK_SUFFIX} · ${numbers}`,
    doneCount,
    totalCount: items.length,
  };
}

interface GroupAcc {
  readonly rows: readonly BoardRow[];
  readonly pending: readonly ScheduleItem[];
}

const EMPTY_GROUP_ACC: GroupAcc = { rows: [], pending: [] };

/** Flushes any pending run of complexity items into the accumulated rows: a lone pending
 *  item stays a plain row (only a run of 2+ collapses into a gate). Always returns a NEW
 *  accumulator — never mutates the one it was given. */
function flushPending(acc: GroupAcc): GroupAcc {
  if (acc.pending.length === 0) return acc;
  const row: BoardRow = acc.pending.length === 1 ? acc.pending[0] : toGateRow(acc.pending);
  return { rows: [...acc.rows, row], pending: [] };
}

/** Groups a day's items into board rows, collapsing consecutive `kind === 'complexity'`
 *  items into one gate row. Pure — every step returns a new accumulator, never mutates
 *  `items` or a prior accumulator. */
function groupComplexityItems(items: readonly ScheduleItem[]): BoardRow[] {
  const grouped = items.reduce<GroupAcc>((acc, item) => {
    if (item.kind === 'complexity') {
      return { rows: acc.rows, pending: [...acc.pending, item] };
    }
    const flushed = flushPending(acc);
    return { rows: [...flushed.rows, item], pending: [] };
  }, EMPTY_GROUP_ACC);
  return [...flushPending(grouped).rows];
}

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

  // Per-day board rows — a run of consecutive `kind === 'complexity'` items collapses into
  // one gate row (see groupComplexityItems()). Keyed by date so both the collapsed
  // (single-day) and expanded (7-day) views share the same derived rows.
  readonly boardRowsByDate = computed<ReadonlyMap<string, BoardRow[]>>(
    () => new Map(this.days().map((d) => [d.date, groupComplexityItems(d.items)])),
  );

  readonly selectedDayRows = computed<BoardRow[]>(() => {
    const day = this.selectedDay();
    if (!day) return [];
    return this.boardRowsByDate().get(day.date) ?? [];
  });

  // A gate row counts as ONE item toward both the numerator and denominator — `done` is
  // defined identically on ScheduleItem and ComplexityGateRow, so no type guard is needed here.
  readonly doneCount = computed(() => this.selectedDayRows().filter((r) => r.done).length);
  readonly totalCount = computed(() => this.selectedDayRows().length);

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

  // The done-row outcome popover — replaces the inline `next <date>` chip: the next-review
  // date is hidden until hover/focus/tap on the outcome glyph pair. Keyed by day date + row
  // (see outcomeKey()), not row alone, so at most one row's bubble is open at a time even in
  // the expanded week view, where the same problem can appear done on two different days.
  readonly openOutcomeKey = signal<string | null>(null);

  toggleOutcome(key: string): void {
    this.openOutcomeKey.update((current) => (current === key ? null : key));
  }

  isOutcomeOpen(item: ScheduleItem, date: string): boolean {
    return this.openOutcomeKey() === this.outcomeKey(item, date);
  }

  /** A per-(day, row) key for the outcome popover's open state and bubble id: `rowKey()`
   *  alone collides when the same problem is done on two different days (expanded week
   *  view), so the day's own date is folded in too. Whitespace (`rowKey()` embeds the item's
   *  title) is collapsed to a hyphen — required for a valid element id, and so
   *  `aria-describedby`'s id list doesn't split on it. */
  outcomeKey(item: ScheduleItem, date: string): string {
    return `${date}-${this.rowKey(item)}`.replace(/\s+/g, '-');
  }

  outcomeBubbleId(item: ScheduleItem, date: string): string {
    return `outcome-${this.outcomeKey(item, date)}`;
  }

  /** The outcome button's aria-label — "earned 🟢 s2" plus ", next review Oct 21" once a
   *  `nextReview` is present. Only ever called once `item.endComfort` is already known truthy
   *  (the template's own `@if`). */
  outcomeAriaLabel(item: ScheduleItem): string {
    const note = item.endNote ? ` ${item.endNote}` : '';
    const base = `earned ${item.endComfort}${note}`;
    return item.nextReview ? `${base}, next review ${shortMonthDay(item.nextReview)}` : base;
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

  /** Rows for one day, used by both the collapsed (selected-day) and expanded (7-day) views. */
  rowsFor(day: ScheduleDay): BoardRow[] {
    return this.boardRowsByDate().get(day.date) ?? [];
  }

  hasMovedTag(item: ScheduleItem): boolean {
    return item.tags?.includes('moved') ?? false;
  }

  /** trackBy for board rows: a gate row has no lcNumber of its own, so it tracks by its
   *  first member's number instead. */
  rowKey(row: BoardRow): string {
    return isGateRow(row) ? `gate-${row.items[0]?.lcNumber ?? 'x'}` : `${row.lcNumber}-${row.title}`;
  }

  protected readonly leetCodeUrlFor = leetCodeUrlFor;
  protected readonly shortMonthDay = shortMonthDay;
  protected readonly isGateRow = isGateRow;
  protected readonly gateTitle = COMPLEXITY_GATE_TITLE;
}
