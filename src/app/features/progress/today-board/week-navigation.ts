// Owns which week the today board shows: the weeks on hand, ◀/▶ stepping, and the lazy archived-history request.
import { Signal, WritableSignal, computed, effect, untracked } from '@angular/core';

import { Schedule } from '../../../core/models/progress.model';
import { LoadStatus } from '../../../core/services/progress.service';
import { addDaysISO, currentWeekStart, todayLocalISO } from '../../../core/utils/local-date';
import { emptyWeek } from './board-rows';

const DAYS_PER_WEEK = 7;

export interface WeekNavigationDeps {
  readonly schedule: Signal<Schedule | null | undefined>;
  readonly history: Signal<Schedule[] | null>;
  readonly historyStatus: Signal<LoadStatus>;
  /** Which week is on screen — null means "the current week". Owned by the view-state service
   *  so it survives the Overview tab's destroy/recreate; this class only writes it. */
  readonly viewWeekOf: WritableSignal<string | null>;
  /** The explicit day pick — dropped whenever the week changes. */
  readonly selectedDate: WritableSignal<string | null>;
  /** Asks the page to fetch the archived weeks (the `historyRequest` output). */
  readonly requestHistory: () => void;
  /** Called after every week change so the caller can close its open popovers. */
  readonly onWeekChange: () => void;
}

/** Must be constructed in an injection context (it registers the stale-summary gap effect). */
export class WeekNavigation {
  readonly todayISO = computed(() => todayLocalISO());
  readonly currentWeekOf = computed(() => currentWeekStart(this.todayISO()));

  /** Every week the board currently has data for, keyed by its own `weekOf` — the live
   *  summary plus whatever archived weeks history has delivered. The summary wins on a
   *  matching `weekOf` (it's the freshest export); history only fills in weeks the summary
   *  doesn't carry. */
  readonly weeksByStart = computed<ReadonlyMap<string, Schedule>>(() => {
    const map = new Map<string, Schedule>();
    for (const week of this.deps.history() ?? []) map.set(week.weekOf, week);
    const summary = this.deps.schedule();
    if (summary) map.set(summary.weekOf, summary);
    return map;
  });

  readonly sortedWeekStarts = computed(() => [...this.weeksByStart().keys()].sort());

  /** Whether the archived-weeks fetch has resolved at least once — `history` stays `null`
   *  until then (loading or never requested), and is always an array (possibly empty)
   *  afterward, per `ProgressService.loadHistory()`'s 404-is-success handling. */
  readonly historyLoaded = computed(() => this.deps.history() !== null);

  readonly displayedWeekOf = computed(() => this.deps.viewWeekOf() ?? this.currentWeekOf());

  /** The week actually on screen: a real entry from `weeksByStart` when one exists, else a
   *  synthetic empty week — covering both the current week (no schedule generated yet) and a
   *  past week history has finished loading but genuinely has no entry for (a gap: gamify.py
   *  skips a week whose Daily Schedule table parses empty). Never used while that specific
   *  week's history fetch is still in flight — see `isLoadingWeek`. */
  readonly displayedSchedule = computed<Schedule>(() => {
    const weekOf = this.displayedWeekOf();
    return this.weeksByStart().get(weekOf) ?? emptyWeek(weekOf);
  });

  /** True only while waiting on the history fetch FOR the displayed week specifically — a week
   *  already found in `weeksByStart` never needs it, and a failed fetch is `isHistoryError`'s
   *  state to report, not this one's. */
  readonly isLoadingWeek = computed(() => {
    if (this.deps.historyStatus() === 'error') return false;
    return this.needsHistoryFor(this.displayedWeekOf());
  });

  /** True when the displayed week would otherwise be stuck on `isLoadingWeek` AND the history
   *  fetch it's waiting on has actually failed — `history` alone stays `null` in both the
   *  still-loading and the failed case, so `historyStatus` is what tells them apart. */
  readonly isHistoryError = computed(
    () => this.deps.historyStatus() === 'error' && this.needsHistoryFor(this.displayedWeekOf()),
  );

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

  constructor(private readonly deps: WeekNavigationDeps) {
    // The summary only regenerates on commit, so a viewer opening the board on a day with no
    // fresh commit yet has a CURRENT week that's simply missing from `weeksByStart` — the same
    // gap `prevWeek()` already asks history to fill, just one the viewer never has to press
    // ◀ to hit. Fires once per gap: `historyStatus` moves off 'idle' (to 'loading') as soon as
    // the page's loadHistory() answers this, and every later run then returns before the request.
    effect(() => {
      const currentWeekOf = this.currentWeekOf();
      if (this.displayedWeekOf() !== currentWeekOf) return;
      if (this.weeksByStart().has(currentWeekOf)) return;
      if (this.deps.history() !== null) return;
      if (this.deps.historyStatus() !== 'idle') return;
      untracked(() => this.deps.requestHistory());
    });
  }

  /** Steps the board back one calendar week. Always moves (even into a week not yet on hand —
   *  see `displayedSchedule`'s gap/loading handling); when the target isn't in `weeksByStart`
   *  and history hasn't loaded yet, also asks the page to fetch it. A week that's still a gap
   *  once history HAS loaded is simply shown empty, never re-requested. */
  prevWeek(): void {
    const target = addDaysISO(this.displayedWeekOf(), -DAYS_PER_WEEK);
    const alreadyKnown = this.weeksByStart().has(target);
    this.setViewWeek(target);
    if (!alreadyKnown && !this.historyLoaded()) this.deps.requestHistory();
  }

  /** Steps the board forward one calendar week — never past the current week (`canGoNext`
   *  guards that at the template). */
  nextWeek(): void {
    if (!this.canGoNext()) return;
    this.setViewWeek(addDaysISO(this.displayedWeekOf(), DAYS_PER_WEEK));
  }

  /** The "Couldn't load past weeks." hint's Retry button — just re-requests history, same
   *  idempotent `loadHistory()` `prevWeek()` already triggers. */
  retryHistory(): void {
    this.deps.requestHistory();
  }

  /** Whether the given week needs the archived history fetch to resolve before it can be shown
   *  at all (it's not already on hand, in the live summary or in history) — the CURRENT week is
   *  not exempt: the summary only regenerates on commit, so it can just as easily be the one
   *  missing (see the constructor's effect). */
  private needsHistoryFor(weekOf: string): boolean {
    if (this.weeksByStart().has(weekOf)) return false;
    return !this.historyLoaded();
  }

  /** Moving to a different week always drops the explicit day pick (a day selected in the old
   *  week may not exist, or mean the same thing, in the new one) and lets the caller close any
   *  open popover, same as selecting a day or toggling expand. */
  private setViewWeek(weekOf: string): void {
    this.deps.viewWeekOf.set(weekOf);
    this.deps.selectedDate.set(null);
    this.deps.onWeekChange();
  }
}
