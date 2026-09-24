import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';

import { ProblemProgress, Schedule, ScheduleDay, ScheduleItem } from '../../../core/models/progress.model';
import { LoadStatus } from '../../../core/services/progress.service';
import { RepoRef, fileUrl } from '../../../core/services/github-file.service';
import { vizRouteFor } from '../../../core/data/viz-route';
import { leetCodeUrlFor } from '../../../core/data/lc-url';
import { shortMonthDay, todayLocalISO } from '../../../core/utils/local-date';
import { ProblemTimelineComponent } from '../problem-timeline/problem-timeline.component';

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

// Qualitative on purpose: the interval lengths and the graduation threshold are config values
// in the adopter's cse-progress repo (cse.config.yml), and this site renders any cse-coach
// repo — so the wording never states a day count or "one more graduates it". The only
// consumer is this component, so the const stays local rather than living in a shared util.
const PROVISIONAL_CLEAN_MEANING = `provisional clean — first clean straight after a blank; a short lock-down check before it's trusted`;

const END_NOTE_MEANINGS: Readonly<Record<string, string>> = {
  prov: PROVISIONAL_CLEAN_MEANING,
  s0: PROVISIONAL_CLEAN_MEANING,
  s1: `clean streak 1 — one clean in a row; the next review moves further out`,
  s2: `clean streak 2 — two cleans in a row; further out again`,
  dropped: `dropped from the tracker after this rep`,
};

/** The plain-language meaning of an `endNote` code (`s0`, `s1`, `s2`, `prov`, `dropped`, …),
 *  or null when the note isn't one of the known codes — an unknown/future note is then shown
 *  raw, with no explanation. Pure. `endNote` is server-supplied external input ("anything else
 *  the E cell carried"), so this checks the map's OWN keys rather than indexing it directly:
 *  a plain object also answers to inherited property names like `toString` or `constructor`,
 *  which `?? null` would not catch since they aren't nullish. */
export function endNoteMeaning(note: string): string | null {
  return Object.hasOwn(END_NOTE_MEANINGS, note) ? END_NOTE_MEANINGS[note] : null;
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
  imports: [RouterLink, NgTemplateOutlet, ProblemTimelineComponent],
})
export class TodayBoardComponent {
  readonly schedule = input<Schedule | null | undefined>();
  readonly effortCeiling = input<number | undefined>();
  readonly effortFloor = input<number | undefined>();

  /** The full problems[] (from ProgressService.details), for the per-row trend join — same
   *  on-demand shape as TechniqueListComponent's `details` input. `null` until the parent's
   *  Problems tab (or a trend open here) has triggered `loadDetails()`. */
  readonly details = input<ProblemProgress[] | null>(null);
  readonly detailsStatus = input<LoadStatus>('idle');
  readonly detailsError = input<string | null>(null);
  /** Emitted every time a row's trend panel OPENS (never on collapse), and by its Retry
   *  button — the page wires this to `loadDetails()`, same click-triggered opt-in fetch as
   *  TechniqueListComponent's `expand`. The Overview tab stays summary-only until a row is
   *  actually clicked open. */
  readonly trend = output<ScheduleItem>();
  /** The repo/branch the page is rendering (ProgressService.repoRef) — a row's `file` path is
   *  relative to it, so the status badge's GitHub link is built from it, never from the gold
   *  standard. */
  readonly repoRef = input<RepoRef | null>(null);

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

  // The done-row outcome popover — replaces the inline `next <date>` chip and the inline
  // note code: the note's meaning and the next-review date are both hidden until
  // hover/focus/tap on the outcome glyph pair. Keyed by day date + row (see outcomeKey()),
  // not row alone, so at most one row's bubble is open at a time even in the expanded week
  // view, where the same problem can appear done on two different days.
  readonly openOutcomeKey = signal<string | null>(null);

  toggleOutcome(key: string): void {
    this.openOutcomeKey.update((current) => (current === key ? null : key));
  }

  isOutcomeOpen(item: ScheduleItem, date: string): boolean {
    return this.openOutcomeKey() === this.outcomeKey(item, date);
  }

  // The per-row trend panel (<app-problem-timeline>, toggled by the row's history button) —
  // its own signal, same one-open-at-a-time shape as `openOutcomeKey` above and keyed by the
  // SAME outcomeKey() (day + row), so the two popovers never collide and the same problem
  // done on two different days keeps distinct panels.
  readonly openTrendKey = signal<string | null>(null);

  /** Toggles a row's trend panel; emits `trend` only on the OPEN transition (never on
   *  collapse) — the page's loadDetails() is idempotent, but this still avoids firing on
   *  every close. */
  toggleTrend(item: ScheduleItem, date: string): void {
    const key = this.outcomeKey(item, date);
    const isOpening = this.openTrendKey() !== key;
    this.openTrendKey.update((current) => (current === key ? null : key));
    if (isOpening) this.trend.emit(item);
  }

  isTrendOpen(item: ScheduleItem, date: string): boolean {
    return this.openTrendKey() === this.outcomeKey(item, date);
  }

  trendPanelId(item: ScheduleItem, date: string): string {
    return `trend-${this.outcomeKey(item, date)}`;
  }

  /** The history button's aria-label — the `title` attribute is the visible tooltip, this
   *  carries the row's number for screen readers, same split as `statusAriaLabel`. */
  trendAriaLabel(item: ScheduleItem): string {
    return `Comfort history for #${item.lcNumber}`;
  }

  /** The trend panel's error-state Retry button — just re-emits `trend`, same idempotent
   *  loadDetails() the initial open already triggers. */
  retryTrend(item: ScheduleItem): void {
    this.trend.emit(item);
  }

  /** Pure lookup in `details()` by lcNumber for the trend panel: null when details aren't
   *  loaded yet OR nothing matched — the template tells those apart via `detailsStatus()`.
   *  A number can carry several method variants (round 3's `technique.problems` join has the
   *  same issue), so among matches the one whose title equals the row's own wins; otherwise
   *  the first. */
  problemFor(item: ScheduleItem): ProblemProgress | null {
    const list = this.details();
    if (!list || item.lcNumber == null) return null;
    const matches = list.filter((p) => p.lcNumber === item.lcNumber);
    if (!matches.length) return null;
    return matches.find((p) => p.title === item.title) ?? matches[0];
  }

  /** A per-(day, row) key — shared by the outcome popover's open state AND the trend panel's
   *  open state above (each keeps its own signal, so opening one never closes the other) —
   *  and by the outcome bubble's id. `rowKey()` alone collides when the same problem is done
   *  on two different days (expanded week view), so the day's own date is folded in too.
   *  Whitespace (`rowKey()` embeds the item's title) is collapsed to a hyphen — required for
   *  a valid element id, and so `aria-describedby`'s id list doesn't split on it. */
  outcomeKey(item: ScheduleItem, date: string): string {
    return `${date}-${this.rowKey(item)}`.replace(/\s+/g, '-');
  }

  outcomeBubbleId(item: ScheduleItem, date: string): string {
    return `outcome-${this.outcomeKey(item, date)}`;
  }

  /** The outcome button's aria-label — "earned 🟢" plus the raw note code when present (e.g.
   *  "earned 🟢 s2"). Deliberately short: the bubble this button describes (wired via
   *  `aria-describedby`) already carries the note's meaning and the next-review date, so a
   *  screen reader announces the label, then the description, each exactly once — not the
   *  explanation read out twice over. Only ever called once `item.endComfort` is already
   *  known truthy (the template's own `@if`). */
  outcomeAriaLabel(item: ScheduleItem): string {
    const noteText = item.endNote ? ` ${item.endNote}` : '';
    return `earned ${item.endComfort}${noteText}`;
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

  /** The status badge's GitHub fallback link — the learner's own solution file on GitHub (see
   *  ProgressPageComponent's `solutionUrl`), used when the row has no walkthrough route; null
   *  without a file or before the repo ref is known. */
  solutionUrl(file: string | null | undefined): string | null {
    const ref = this.repoRef();
    return file && ref ? fileUrl(ref, file) : null;
  }

  /** The status badge's aria-label when it's the walkthrough link: "Solution walkthrough for
   *  #N, done|not done" — the badge now carries the row's done-ness too, since it replaces
   *  the separate leading check. */
  statusAriaLabel(item: ScheduleItem): string {
    return `Solution walkthrough for #${item.lcNumber}, ${item.done ? 'done' : 'not done'}`;
  }

  /** The status badge's aria-label when it's the GitHub solution-file link (no walkthrough
   *  route, but the row carries a `file` and the repo ref is known) — mirrors
   *  `statusAriaLabel` above, done-ness in place of the walkthrough's. */
  githubAriaLabel(item: ScheduleItem): string {
    return `Solution source for #${item.lcNumber} on GitHub, ${item.done ? 'done' : 'not done'}`;
  }

  /** Rows for one day, used by both the collapsed (selected-day) and expanded (7-day) views. */
  rowsFor(day: ScheduleDay): BoardRow[] {
    return this.boardRowsByDate().get(day.date) ?? [];
  }

  /** trackBy for board rows: a gate row has no lcNumber of its own, so it tracks by its
   *  first member's number instead. */
  rowKey(row: BoardRow): string {
    return isGateRow(row) ? `gate-${row.items[0]?.lcNumber ?? 'x'}` : `${row.lcNumber}-${row.title}`;
  }

  protected readonly leetCodeUrlFor = leetCodeUrlFor;
  protected readonly shortMonthDay = shortMonthDay;
  protected readonly endNoteMeaning = endNoteMeaning;
  protected readonly isGateRow = isGateRow;
  protected readonly gateTitle = COMPLEXITY_GATE_TITLE;
}
