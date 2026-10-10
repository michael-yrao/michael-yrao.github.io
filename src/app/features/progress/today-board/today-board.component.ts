import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
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
import { externalJudgeUrlFor } from '../../../core/data/lc-url';
import { shortMonthDay } from '../../../core/utils/local-date';
import { ProblemTimelineComponent } from '../problem-timeline/problem-timeline.component';
import { walkthroughRouteFor } from '../solution-link-mode';
import { PRACTICE_GLYPH } from '../practice-link';
import { SolutionLinkModeService } from '../solution-link-mode.service';
import { ProgressViewStateService } from '../progress-view-state.service';
import {
  BoardRow,
  COMPLEXITY_GATE_TITLE,
  RowCounts,
  WALKTHROUGH_GLYPH,
  WorkloadBar,
  buildWorkloadBar,
  countRows,
  dayButtonLabel,
  endNoteMeaning,
  findProblemFor,
  githubAriaLabel,
  groupComplexityItems,
  isGateRow,
  isMovedItem,
  movedAriaLabel,
  outcomeAriaLabel,
  outcomeBubbleId,
  outcomeKey,
  rowKey,
  statusAriaLabel,
  statusGlyph,
  sumRowCounts,
  trendAriaLabel,
  trendPanelId,
} from './board-rows';
import { WeekNavigation } from './week-navigation';

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
 * drill. The one exception is `history`: an opt-in fetch (◀, or `WeekNavigation`'s own effect
 * filling a stale-summary gap on the CURRENT week), never forced by merely rendering a week
 * already on hand. Row/day derivation lives in `board-rows.ts`; week stepping in
 * `week-navigation.ts`.
 *
 * ScheduleItem's `url` (round 5) carries the tracker's canonical LeetCode URL, joined by
 * lcNumber server-side (cse-progress gamify.py's problem_urls()) — the site's own
 * AlgorithmMeta.id is a shortened route slug, not the LC slug, so it can't build this link
 * itself. externalJudgeUrlFor() falls back to the number-based search/redirect URL only for a row
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

  /** LeetCode numbers with a practice contract entry — only these rows get the Run link. */
  readonly practiceNumbers = input<ReadonlySet<number>>(new Set());

  /** The archived weeks (`ProgressService.history`) — `null` until the board has asked for
   *  them (see `prevWeek()`), an array (possibly empty) once that fetch has resolved. */
  readonly history = input<Schedule[] | null>(null);
  /** `ProgressService.historyStatus` — mirrors `detailsStatus`'s role for the trend panel:
   *  `history` alone can't tell a still-loading fetch apart from one that failed, since both
   *  leave it `null`. */
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
  // Which week is on screen — null means "the current week". Written only by WeekNavigation.
  readonly viewWeekOf = this.viewState.scheduleWeekOf;

  // A row's status-badge link source — one shared setting owned by the page header's
  // Settings panel (settings-menu.component.ts), not by this board.
  private readonly linkModeService = inject(SolutionLinkModeService);

  private readonly weekNav = new WeekNavigation({
    schedule: this.schedule,
    history: this.history,
    historyStatus: this.historyStatus,
    viewWeekOf: this.viewWeekOf,
    selectedDate: this.selectedDate,
    requestHistory: () => this.historyRequest.emit(),
    onWeekChange: () => this.collapseAllRows(),
  });

  readonly todayISO = this.weekNav.todayISO;
  readonly displayedWeekOf = this.weekNav.displayedWeekOf;
  readonly isLoadingWeek = this.weekNav.isLoadingWeek;
  readonly isHistoryError = this.weekNav.isHistoryError;
  readonly canGoPrev = this.weekNav.canGoPrev;
  readonly canGoNext = this.weekNav.canGoNext;

  readonly days = computed(() => this.weekNav.displayedSchedule().days);

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
  private readonly boardRowsByDate = computed<ReadonlyMap<string, BoardRow[]>>(
    () => new Map(this.days().map((d) => [d.date, groupComplexityItems(d.items)])),
  );

  private readonly selectedDayRows = computed<BoardRow[]>(() => {
    const day = this.selectedDay();
    if (!day) return [];
    return this.boardRowsByDate().get(day.date) ?? [];
  });

  private readonly selectedDayCounts = computed(() => countRows(this.selectedDayRows()));
  readonly doneCount = computed(() => this.selectedDayCounts().done);
  readonly totalCount = computed(() => this.selectedDayCounts().total);
  readonly movedCount = computed(() => this.selectedDayCounts().moved);

  /** Week done/total/moved = the sum of every day's grouped rows (gate row = 1) — used by the
   *  expanded view's week-total line. */
  readonly weekCounts = computed(() => sumRowCounts(this.boardRowsByDate().values()));

  // null when there's no board/day, or the day carries no units, or ceiling is unknown.
  readonly workloadBar = computed<WorkloadBar | null>(() =>
    buildWorkloadBar(this.selectedDay(), this.effortCeiling(), this.effortFloor(), this.workload()),
  );

  // The units-explainer popover (round 4 item 2 — replaces the native `title` tooltip, which
  // is slow (~1s), invisible on touch, and too wordy). Click/tap TOGGLES it (works on touch,
  // where there's no hover); the template also shows it instantly on `:hover`/`:focus-within`
  // for mouse/keyboard, in pure CSS, no signal involved for that path.
  readonly infoOpen = signal(false);

  toggleInfo(): void {
    this.infoOpen.update((v) => !v);
  }

  // The done-row outcome popover — the note's meaning and the next-review date are hidden
  // until hover/focus/tap on the outcome glyph pair. Keyed by day date + row (see
  // outcomeKey()), not row alone, so at most one row's bubble is open at a time even in the
  // expanded week view, where the same problem can appear done on two different days.
  readonly openOutcomeKey = signal<string | null>(null);

  toggleOutcome(key: string): void {
    this.openOutcomeKey.update((current) => (current === key ? null : key));
  }

  isOutcomeOpen(item: ScheduleItem, date: string): boolean {
    return this.openOutcomeKey() === outcomeKey(item, date);
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
    const key = outcomeKey(item, date);
    const isOpening = this.openTrendKey() !== key;
    this.openTrendKey.update((current) => (current === key ? null : key));
    if (isOpening) this.trend.emit(item);
  }

  isTrendOpen(item: ScheduleItem, date: string): boolean {
    return this.openTrendKey() === outcomeKey(item, date);
  }

  /** The trend panel's error-state Retry button — just re-emits `trend`, same idempotent
   *  loadDetails() the initial open already triggers. */
  retryTrend(item: ScheduleItem): void {
    this.trend.emit(item);
  }

  problemFor(item: ScheduleItem): ProblemProgress | null {
    return findProblemFor(item, this.details());
  }

  selectDay(date: string): void {
    this.selectedDate.set(date);
    this.collapseAllRows();
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
    this.collapseAllRows();
  }

  prevWeek(): void {
    this.weekNav.prevWeek();
  }

  nextWeek(): void {
    this.weekNav.nextWeek();
  }

  retryHistory(): void {
    this.weekNav.retryHistory();
  }

  /** Closes any open outcome/trend/info popover — the outcome and trend keys are keyed by
   *  (day, row), so a stale key from a day or layout that just changed underneath it must
   *  never linger open; the units info bubble carries no such key, but it belongs to the same
   *  "close every popover" moment (selecting a day, a week change, or expanding/collapsing). */
  private collapseAllRows(): void {
    this.openTrendKey.set(null);
    this.openOutcomeKey.set(null);
    this.infoOpen.set(false);
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

  /** Rows for one day, used by both the collapsed (selected-day) and expanded (7-day) views. */
  rowsFor(day: ScheduleDay): BoardRow[] {
    return this.boardRowsByDate().get(day.date) ?? [];
  }

  /** Done/total/moved for one day — used by the expanded view's day headers. */
  dayCounts(day: ScheduleDay): RowCounts {
    return countRows(this.rowsFor(day));
  }

  protected readonly externalJudgeUrlFor = externalJudgeUrlFor;
  protected readonly shortMonthDay = shortMonthDay;
  protected readonly endNoteMeaning = endNoteMeaning;
  protected readonly isGateRow = isGateRow;
  protected readonly isMovedItem = isMovedItem;
  protected readonly rowKey = rowKey;
  protected readonly dayButtonLabel = dayButtonLabel;
  protected readonly outcomeKey = outcomeKey;
  protected readonly outcomeBubbleId = outcomeBubbleId;
  protected readonly outcomeAriaLabel = outcomeAriaLabel;
  protected readonly trendPanelId = trendPanelId;
  protected readonly trendAriaLabel = trendAriaLabel;
  protected readonly statusAriaLabel = statusAriaLabel;
  protected readonly githubAriaLabel = githubAriaLabel;
  protected readonly movedAriaLabel = movedAriaLabel;
  protected readonly statusGlyph = statusGlyph;
  protected readonly walkthroughGlyph = WALKTHROUGH_GLYPH;
  protected readonly practiceGlyph = PRACTICE_GLYPH;
  protected readonly gateTitle = COMPLEXITY_GATE_TITLE;
}
