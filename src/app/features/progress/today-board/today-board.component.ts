import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';

import {
  ProblemProgress,
  Schedule,
  ScheduleDay,
  ScheduleItem,
  WorkloadDay,
} from '../../../core/models/progress.model';
import { LoadStatus } from '../../../core/services/progress.service';
import { RepoRef, fileUrl } from '../../../core/services/github-file.service';
import { leetCodeUrlFor } from '../../../core/data/lc-url';
import {
  addDaysISO,
  currentWeekStart,
  shortMonthDay,
  todayLocalISO,
  weekdayShort,
} from '../../../core/utils/local-date';
import { WorkloadBand, workloadBand } from '../../../core/utils/workload-band';
import { ProblemTimelineComponent } from '../problem-timeline/problem-timeline.component';
import { walkthroughRouteFor } from '../solution-link-mode';
import { SolutionLinkModeService } from '../solution-link-mode.service';
import { ProgressViewStateService } from '../progress-view-state.service';

interface Workload {
  units: number;
  ceiling: number;
  pct: number;
  band: WorkloadBand;
  /** The day's DONE units (from the `workload` input's matching `WorkloadDay`) — null when
   *  there's no entry for the day, or its `done` is 0: both render as "no done fill" (round 7,
   *  §Text f/g). */
  done: number | null;
  /** `done / ceiling` as a percent, clamped like `pct` — the solid fill drawn inside the
   *  planned fill. null exactly when `done` is null. */
  donePct: number | null;
}

const COMPLEXITY_GATE_TITLE = 'Complexity gate';
const MOVED_GLYPH = '↷';
// A literal `</>` can't be written inline in the template's interpolation (`{{ '</>' }}`) — the
// `</` reads to the HTML parser as a closing tag before Angular's interpolation is tokenized —
// so the walkthrough badge's own glyph lives here instead and the template references it.
const WALKTHROUGH_GLYPH = '</>';
const RE_ASK_SUFFIX = 're-asks';
const DAYS_PER_WEEK = 7;
// Monday-first, matching gamify.py's `day_date.strftime('%A')` — used only to label a
// synthetic empty week's 7 days (see `emptyWeek` below), so no `Date` construction (and no
// timezone risk) is needed to name them.
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

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

/** A row is "moved" when it wasn't done on its planned day and carries a `deferredTo` date —
 *  the row that stays on its own day, unstruck, when the actual rep landed elsewhere (see
 *  schedule-item-deferred-to-sep29). The `moved` TAG alone never triggers this: only the
 *  `deferredTo` field does (a gate row's own `ScheduleItem`s could still carry a `moved` tag
 *  from an unrelated round with no marker of its own). */
function isMovedItem(item: ScheduleItem): boolean {
  return !item.done && !!item.deferredTo;
}

/** `isMovedItem` lifted to a `BoardRow` — a gate row is never moved (`deferredTo` only ever
 *  lives on a plain `ScheduleItem`), so this is what the per-day/week moved counts below use. */
function isMovedRow(row: BoardRow): boolean {
  return !isGateRow(row) && isMovedItem(row);
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

/** A synthetic empty week — 7 real dates and weekday names in the same shape gamify.py emits,
 *  `items: []`, `units: null` throughout. Used whenever the displayed week (current, or a
 *  history gap once history has finished loading) has no real entry, so the strip and the
 *  existing "Nothing scheduled." rendering need no special-casing for it. Pure. */
function emptyWeek(weekOf: string): Schedule {
  const days: ScheduleDay[] = WEEKDAY_NAMES.map((weekday, i) => ({
    date: addDaysISO(weekOf, i),
    weekday,
    label: null,
    units: null,
    items: [],
  }));
  return { weekOf, days };
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
 * whole) whenever the displayed week is already on hand — no fetch, instant overview, not a
 * drill. The one exception is `history`: an opt-in fetch (◀, or the constructor's own effect
 * filling a stale-summary gap on the CURRENT week — see `needsHistoryFor`), never forced by
 * merely rendering a week already on hand.
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
  /** The summary's full per-day effort-unit history (`ProgressSummary.workload`) — looked up
   *  by the selected day's own date so the workload bar can draw a done fill inside the
   *  planned one (round 7, §Text f/g). Optional/additive: absent renders the bar exactly as
   *  before (planned fill only, unchanged label). */
  readonly workload = input<WorkloadDay[] | undefined>();

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

  /** The archived weeks (`ProgressService.history`) — `null` until the board has asked for
   *  them (see `prevWeek()`), an array (possibly empty) once that fetch has resolved. */
  readonly history = input<Schedule[] | null>(null);
  /** `ProgressService.historyStatus` — mirrors `detailsStatus`'s role for the trend panel:
   *  `history` alone can't tell a still-loading fetch apart from one that failed, since both
   *  leave it `null`. Used only by `isHistoryError` below. */
  readonly historyStatus = input<LoadStatus>('idle');
  /** Emitted when ◀ needs a week it doesn't have yet — the page wires this to
   *  `ProgressService.loadHistory()`, the same click-triggered opt-in fetch as `trend`. */
  readonly historyRequest = output<void>();

  // Week/day/expanded pick — held on ProgressViewStateService (not a signal of this
  // component's own) so the state survives the Overview tab's `@if`-gated destroy/recreate on
  // a tab switch. Property names stay the same as when these were local signals, so the
  // template and existing specs keep working unchanged.
  private readonly viewState = inject(ProgressViewStateService);
  // Which day the strip has explicitly selected (null = no explicit pick yet — fall back to
  // today, or the first day of the week if today isn't in it).
  readonly selectedDate = this.viewState.scheduleSelectedDate;
  // Collapsed (default) = just the selected day; expanded = the whole week stacked.
  readonly expanded = this.viewState.scheduleExpanded;
  // Which week is on screen — null means "the current week" (today's own Monday, recomputed
  // live off the viewer's clock). Set only by prevWeek()/nextWeek().
  readonly viewWeekOf = this.viewState.scheduleWeekOf;

  // A row's status-badge link source — one shared setting owned by the page header's
  // Settings panel (settings-menu.component.ts), not by this board.
  private readonly linkModeService = inject(SolutionLinkModeService);

  constructor() {
    // The summary only regenerates on commit, so a viewer opening the board on a day with no
    // fresh commit yet has a CURRENT week that's simply missing from `weeksByStart` — the same
    // gap `prevWeek()` already asks `history()` to fill, just one the viewer never has to press
    // ◀ to hit. Fires once per gap: `historyStatus` moves off 'idle' (to 'loading') as soon as
    // the page's loadHistory() answers this, and every later run of this effect then returns
    // before the emit.
    effect(() => {
      const currentWeekOf = this.currentWeekOf();
      if (this.displayedWeekOf() !== currentWeekOf) return;
      if (this.weeksByStart().has(currentWeekOf)) return;
      if (this.history() !== null) return;
      if (this.historyStatus() !== 'idle') return;
      untracked(() => this.historyRequest.emit());
    });
  }

  readonly todayISO = computed(() => todayLocalISO());
  readonly currentWeekOf = computed(() => currentWeekStart(this.todayISO()));

  /** Every week the board currently has data for, keyed by its own `weekOf` — the live
   *  summary plus whatever archived weeks history has delivered. The summary wins on a
   *  matching `weekOf` (it's the freshest export); history only fills in weeks the summary
   *  doesn't carry. */
  readonly weeksByStart = computed<ReadonlyMap<string, Schedule>>(() => {
    const map = new Map<string, Schedule>();
    for (const week of this.history() ?? []) map.set(week.weekOf, week);
    const summary = this.schedule();
    if (summary) map.set(summary.weekOf, summary);
    return map;
  });

  readonly sortedWeekStarts = computed(() => [...this.weeksByStart().keys()].sort());

  /** Whether the archived-weeks fetch has resolved at least once — `history` stays `null`
   *  until then (loading or never requested), and is always an array (possibly empty)
   *  afterward, per `ProgressService.loadHistory()`'s 404-is-success handling. */
  readonly historyLoaded = computed(() => this.history() !== null);

  readonly displayedWeekOf = computed(() => this.viewWeekOf() ?? this.currentWeekOf());

  /** The week actually on screen: a real entry from `weeksByStart` when one exists, else a
   *  synthetic empty week — covering both the current week (no schedule generated yet) and a
   *  past week history has finished loading but genuinely has no entry for (a gap: gamify.py
   *  skips a week whose Daily Schedule table parses empty). Never used while that specific
   *  week's history fetch is still in flight — see `isLoadingWeek()`. */
  readonly displayedSchedule = computed<Schedule>(() => {
    const weekOf = this.displayedWeekOf();
    return this.weeksByStart().get(weekOf) ?? emptyWeek(weekOf);
  });

  /** True only while waiting on the history fetch FOR the displayed week specifically — a week
   *  already found in `weeksByStart` never needs it (that covers the usual current-week case,
   *  the summary is fresh), and a failed fetch is `isHistoryError`'s state to report, not this
   *  one's. */
  readonly isLoadingWeek = computed(() => {
    if (this.historyStatus() === 'error') return false;
    return this.needsHistoryFor(this.displayedWeekOf());
  });

  /** True when the displayed week would otherwise be stuck on `isLoadingWeek` AND the
   *  history fetch it's waiting on has actually failed — `history` alone stays `null` in
   *  both the still-loading and the failed case, so `historyStatus` is what tells them apart. */
  readonly isHistoryError = computed(
    () => this.historyStatus() === 'error' && this.needsHistoryFor(this.displayedWeekOf()),
  );

  /** Shared by `isLoadingWeek`/`isHistoryError`: whether the given week needs the archived
   *  history fetch to resolve before it can be shown at all (it's not already on hand, in the
   *  live summary or in history) — the CURRENT week is not exempt: the summary only regenerates
   *  on commit, so it can just as easily be the one missing (see the constructor's effect,
   *  which requests history for exactly that gap). */
  private needsHistoryFor(weekOf: string): boolean {
    if (this.weeksByStart().has(weekOf)) return false;
    return !this.historyLoaded();
  }

  /** ◀ is enabled until history has loaded and confirmed there's nothing earlier than the
   *  displayed week — before that we don't yet know the boundary, so a click can still fetch. */
  readonly canGoPrev = computed(() => {
    if (!this.historyLoaded()) return true;
    const weeks = this.sortedWeekStarts();
    return weeks.length > 0 && weeks[0] < this.displayedWeekOf();
  });

  /** ▶ is enabled either toward a later week already on hand, or simply toward "now" whenever
   *  the displayed week is in the past — the latter needs no history fetch, since every week
   *  up to and including the current one is always resolvable (real or synthetic). */
  readonly canGoNext = computed(() => {
    const displayed = this.displayedWeekOf();
    if (displayed < this.currentWeekOf()) return true;
    return this.sortedWeekStarts().some((w) => w > displayed);
  });

  readonly days = computed(() => this.displayedSchedule().days);

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
  // A gate row is never moved (isMovedRow), so this stays a straight count with no type guard.
  readonly movedCount = computed(() => this.selectedDayRows().filter((r) => isMovedRow(r)).length);

  /** Week done/total/moved = the sum of every day's grouped rows (gate row = 1). Same counting
   *  rule as `doneCount`/`totalCount`/`movedCount` above, summed across `boardRowsByDate()`
   *  instead of just the selected day — used by the expanded view's week-total line. */
  readonly weekCounts = computed(() => {
    let done = 0;
    let total = 0;
    let moved = 0;
    for (const rows of this.boardRowsByDate().values()) {
      total += rows.length;
      done += rows.filter((r) => r.done).length;
      moved += rows.filter((r) => isMovedRow(r)).length;
    }
    return { done, total, moved };
  });

  /** The `workload` input's entry for the selected day, by date — null when the input is
   *  absent or carries no matching entry (an older contract, or a day outside its window). */
  readonly selectedDayWorkload = computed<WorkloadDay | null>(() => {
    const day = this.selectedDay();
    if (!day) return null;
    return this.workload()?.find((w) => w.date === day.date) ?? null;
  });

  // null when there's no board/day, or the day carries no units, or ceiling is unknown —
  // "empty/no-board day -> no bar" (round 2 item 3).
  readonly workloadBar = computed<Workload | null>(() => {
    const day = this.selectedDay();
    const ceiling = this.effortCeiling();
    if (!day || day.units == null || ceiling == null || ceiling <= 0) return null;
    const units = day.units;
    const floor = this.effortFloor();
    const pct = Math.min(100, (units / ceiling) * 100);
    const band = workloadBand(units, ceiling, floor);
    // A done fill only draws when the day actually has done units (round 7, §Text f/g) — no
    // matching workload entry, or one with `done === 0`, renders exactly like before.
    const doneUnits = this.selectedDayWorkload()?.done ?? 0;
    const done = doneUnits > 0 ? doneUnits : null;
    const donePct = done != null ? Math.min(100, (done / ceiling) * 100) : null;
    return { units, ceiling, pct, band, done, donePct };
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
    this.collapseAllRows();
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
    this.collapseAllRows();
  }

  /** Steps the board back one calendar week. Always moves (even into a week not yet on hand —
   *  see `displayedSchedule()`'s gap/loading handling); when the target isn't in
   *  `weeksByStart` and history hasn't loaded yet, also asks the page to fetch it. A week
   *  that's still a gap once history HAS loaded is simply shown empty, never re-requested. */
  prevWeek(): void {
    const target = addDaysISO(this.displayedWeekOf(), -DAYS_PER_WEEK);
    const alreadyKnown = this.weeksByStart().has(target);
    this.setViewWeek(target);
    if (!alreadyKnown && !this.historyLoaded()) this.historyRequest.emit();
  }

  /** Steps the board forward one calendar week — never past the current week (`canGoNext()`
   *  guards that at the template). */
  nextWeek(): void {
    if (!this.canGoNext()) return;
    this.setViewWeek(addDaysISO(this.displayedWeekOf(), DAYS_PER_WEEK));
  }

  /** The "Couldn't load past weeks." hint's Retry button — just re-emits `historyRequest`,
   *  same idempotent `loadHistory()` `prevWeek()` already triggers. */
  retryHistory(): void {
    this.historyRequest.emit();
  }

  /** Shared by prevWeek()/nextWeek(): moving to a different week always drops the explicit
   *  day pick (a day selected in the old week may not exist, or mean the same thing, in the
   *  new one) and closes any open popover, same as selecting a day or toggling expand. */
  private setViewWeek(weekOf: string): void {
    this.viewWeekOf.set(weekOf);
    this.selectedDate.set(null);
    this.collapseAllRows();
  }

  /** Closes any open outcome/trend/info popover — the outcome and trend keys are keyed by
   *  (day, row), so a stale key from a day or layout that just changed underneath it must
   *  never linger open; the units info bubble carries no such key, but it belongs to the same
   *  "close every popover" moment (selecting a day, or expanding/collapsing the week). */
  private collapseAllRows(): void {
    this.openTrendKey.set(null);
    this.openOutcomeKey.set(null);
    this.infoOpen.set(false);
  }

  // Selector-strip button label — weekday abbreviation + day-of-month pulled straight out of
  // the ISO date (no date-parsing library needed for a fixed YYYY-MM-DD shape).
  dayButtonLabel(day: ScheduleDay): string {
    const dayOfMonth = day.date.slice(8, 10);
    const weekdayAbbrev = day.weekday.slice(0, 3);
    return `${weekdayAbbrev} ${dayOfMonth}`;
  }

  /** The status badge's walkthrough-route candidate — delegates to the shared
   *  walkthroughRouteFor() rule (solution-link-mode.ts) using the page-header setting's
   *  current mode. */
  walkthroughRoute(item: ScheduleItem): string | null {
    return walkthroughRouteFor(this.linkModeService.mode(), item.lcNumber, this.solutionUrl(item.file));
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
   *  the separate leading check. A moved row's badge carries no walkthrough/done meaning any
   *  more, so `movedAriaLabel` takes over instead. */
  statusAriaLabel(item: ScheduleItem): string {
    if (isMovedItem(item)) return this.movedAriaLabel(item);
    return `Solution walkthrough for #${item.lcNumber}, ${item.done ? 'done' : 'not done'}`;
  }

  /** The status badge's aria-label when it's the GitHub solution-file link (no walkthrough
   *  route, but the row carries a `file` and the repo ref is known) — mirrors
   *  `statusAriaLabel` above, done-ness (or moved-ness) in place of the walkthrough's. */
  githubAriaLabel(item: ScheduleItem): string {
    if (isMovedItem(item)) return this.movedAriaLabel(item);
    return `Solution source for #${item.lcNumber} on GitHub, ${item.done ? 'done' : 'not done'}`;
  }

  /** The status badge's glyph — `↷` for a moved row (in place of whatever `fallback` this
   *  badge form would otherwise show: `</>`, `✓`/`○`), unchanged otherwise. Shared by all
   *  three badge forms (walkthrough link, GitHub link, plain span) in the template. */
  statusGlyph(item: ScheduleItem, fallback: string): string {
    return isMovedItem(item) ? MOVED_GLYPH : fallback;
  }

  /** The status badge's aria-label for a moved row, and the plain (non-link) badge's
   *  aria-label once moved — "Moved to Thu Oct 1" (weekday, month, day of `deferredTo`). Only
   *  ever called once `isMovedItem(item)` is already known true, so `deferredTo` is non-null;
   *  the `''` fallback is defensive, never expected to render. */
  movedAriaLabel(item: ScheduleItem): string {
    if (!item.deferredTo) return '';
    return `Moved to ${weekdayShort(item.deferredTo)} ${shortMonthDay(item.deferredTo)}`;
  }

  /** The chip after a moved row's title — the new day's short weekday (e.g. `Thu`). Same
   *  non-null caveat as `movedAriaLabel` above. */
  movedChip(item: ScheduleItem): string {
    return item.deferredTo ? weekdayShort(item.deferredTo) : '';
  }

  /** Rows for one day, used by both the collapsed (selected-day) and expanded (7-day) views. */
  rowsFor(day: ScheduleDay): BoardRow[] {
    return this.boardRowsByDate().get(day.date) ?? [];
  }

  /** Done/total/moved for one day, counting a gate row as ONE item (never moved) — same rule
   *  as the collapsed view's doneCount/totalCount/movedCount. Used by the expanded view's day
   *  headers. */
  dayCounts(day: ScheduleDay): { done: number; total: number; moved: number } {
    const rows = this.rowsFor(day);
    return {
      done: rows.filter((r) => r.done).length,
      total: rows.length,
      moved: rows.filter((r) => isMovedRow(r)).length,
    };
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
  protected readonly isMovedItem = isMovedItem;
  protected readonly walkthroughGlyph = WALKTHROUGH_GLYPH;
  protected readonly gateTitle = COMPLEXITY_GATE_TITLE;
}
