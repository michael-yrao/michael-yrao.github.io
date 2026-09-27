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
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  PlannedProblem,
  ProblemProgress,
  Technique,
  TechniqueTier,
} from '../../../core/models/progress.model';
import { fileUrl, RepoRef } from '../../../core/services/github-file.service';
import { shortMonthDay as shortMonthDayFor } from '../../../core/utils/local-date';
import { walkthroughRouteFor } from '../solution-link-mode';
import { SolutionLinkModeService } from '../solution-link-mode.service';
import {
  barFillPercent,
  columnFor,
  compareTechniques,
  coverageState,
  coverageTitle,
  deriveTechniqueStats,
  doneOf,
  plannedTotalOf,
  ratioDenominatorOf,
  readStoredView,
  shortName as shortNameFor,
  TechniqueColumn,
  TechniqueSortKey,
  TechniqueStats,
  TechniqueView,
  thresholdPercent,
  writeStoredView,
} from './technique-view';

interface FamilyGroup {
  family: string;
  items: Technique[];
}

interface TierGroup {
  tier: TechniqueTier;
  label: string;
  families: FamilyGroup[];
}

// Fixed order (not alphabetical — alphabetical would put 'core' after 'dp'), matching the
// interview-ROI line: core (started) is always first; dp/tier1 are above the line; tier2/
// tier3 are below it.
const TIER_ORDER: TechniqueTier[] = ['core', 'dp', 'tier1', 'tier2', 'tier3'];
const TIER_LABEL: Record<TechniqueTier, string> = {
  core: 'Core',
  dp: 'DP framework — not started',
  tier1: 'Tier 1 · above the interview-ROI line — not started',
  tier2: 'Tier 2 · below the ROI line (competitive) — not started',
  tier3: 'Tier 3 · below the ROI line (competitive) — not started',
};

// A competitive-horizon technique (tier2/tier3) is hidden from the board by default — same
// interview-ROI line TIER_LABEL already names — until the learner opts in via the toggle.
const HORIZON_TIERS: ReadonlySet<TechniqueTier> = new Set(['tier2', 'tier3']);

interface BoardColumn {
  readonly key: TechniqueColumn;
  readonly label: string;
  readonly items: Technique[];
}

// Least- to most-advanced, matching how a technique actually progresses.
const BOARD_COLUMN_ORDER: TechniqueColumn[] = ['notStarted', 'inProgress', 'covered', 'mastered'];
const BOARD_COLUMN_LABEL: Record<TechniqueColumn, string> = {
  notStarted: 'Not started',
  inProgress: 'In progress',
  covered: 'Covered',
  mastered: 'Mastered',
};

const BOARD_SORT_KEYS: readonly TechniqueSortKey[] = ['name', 'coverage', 'lastPracticed'];

// judgeLabel()'s host → short label map. Keyed by the bare hostname (no leading `www.` —
// judgeLabel strips that before lookup). A host with no entry here falls back to itself.
const JUDGE_HOST_LABELS: Readonly<Record<string, string>> = {
  'leetcode.com': 'LC',
  'neetcode.io': 'NC',
  'open.kattis.com': 'Kattis',
  'cses.fi': 'CSES',
  'hellointerview.com': 'HelloInterview',
};

/**
 * The technique-breadth drill: "which 94, and how am I doing on each?" Grouped by TIER
 * first (round 2 — the honest denominator's detail view), family within each tier. The list
 * itself is entirely derived from the summary's `techniques[]` (a few KB, already on the
 * page) — grouping and the count/target ratio never fetch anything.
 *
 * Round 3: clicking a row expands it to its problems (`technique.problems`, a list of LC
 * numbers) — joined against `details` (the full `problems[]`, passed in by the parent) for
 * title/comfort/difficulty/url. `details` is null until the parent's Problems tab (or this
 * expand) has triggered `loadDetails()`; expanding a technique for the first time emits
 * `expand`, which the parent wires to `loadDetails()` — same on-demand, cached pattern as
 * the Problems tab. A not-started technique (empty `problems`) never emits `expand`; it just
 * shows "not started yet."
 *
 * Round 7: an alternate Board view (`view() === 'board'`) regroups the same techniques into
 * four coverage columns instead of tier/family, with its own sort/family-filter/horizon
 * controls and single-card selection — see `boardColumns`/`selectInBoard`. Replaces the
 * retired technique map (`technique-map/`, left in place but no longer wired in here).
 */
@Component({
  selector: 'app-technique-list',
  templateUrl: './technique-list.component.html',
  styleUrls: ['./technique-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgTemplateOutlet],
})
export class TechniqueListComponent {
  readonly techniques = input.required<Technique[]>();
  /** The full problems[] (from ProgressService.details), for the expand-to-problems join.
   *  null until loadDetails() has resolved at least once. */
  readonly details = input<ProblemProgress[] | null>(null);
  /** The repo/branch the page is rendering (ProgressService.repoRef) — a row's `file` path is
   *  relative to it, so the GitHub fallback link is built from it, never from the gold
   *  standard. Same shape as TodayBoardComponent's own `repoRef` input. */
  readonly repoRef = input<RepoRef | null>(null);
  readonly expand = output<Technique>();

  // The shared, page-header-level Solution Links setting (settings-menu.component.ts's ⚙
  // Settings panel) — read here for the detail template's problem-row link chain.
  private readonly linkModeService = inject(SolutionLinkModeService);

  // Pure done/planned bar helpers (technique-view.ts) — bound directly as instance
  // properties so the template can call them per row without a wrapper method each.
  readonly doneOf = doneOf;
  readonly plannedTotalOf = plannedTotalOf;
  readonly ratioDenominatorOf = ratioDenominatorOf;
  readonly barFillPercent = barFillPercent;
  readonly thresholdPercent = thresholdPercent;
  readonly coverageTitle = coverageTitle;

  private readonly expandedNames = signal<ReadonlySet<string>>(new Set());

  /** List vs. Board (technique board) — persisted per viewer, default List. */
  readonly view = signal<TechniqueView>(readStoredView());
  private primed = false;

  constructor() {
    // One-shot priming: the Board's Mastered column (`isMastered`'s `stats.graduatedCount`
    // fallback for an older contract with no `Technique.graduatedCount`) and its
    // Last-practiced sort (`stats.lastTouched`) both need `details`, which the parent only
    // fetches on-demand — same lazy pattern as a list row's own expand. Landing on Board with
    // no details yet kicks that fetch off exactly once, via the first started technique; the
    // (default) List view never triggers this.
    effect(() => {
      if (this.view() !== 'board' || this.details() !== null || this.primed) return;
      const first = this.techniques().find((t) => t.started);
      if (!first) return;
      this.primed = true;
      untracked(() => this.expand.emit(first));
    });
  }

  readonly groups = computed<TierGroup[]>(() => {
    const byTier = new Map<TechniqueTier, Technique[]>();
    for (const t of this.techniques()) {
      const bucket = byTier.get(t.tier);
      if (bucket) {
        bucket.push(t);
      } else {
        byTier.set(t.tier, [t]);
      }
    }
    return TIER_ORDER.filter((tier) => byTier.has(tier)).map((tier) => {
      const items = byTier.get(tier)!;
      const byFamily = new Map<string, Technique[]>();
      for (const t of items) {
        const bucket = byFamily.get(t.family);
        if (bucket) {
          bucket.push(t);
        } else {
          byFamily.set(t.family, [t]);
        }
      }
      const families: FamilyGroup[] = [...byFamily.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([family, familyItems]) => ({
          family,
          items: [...familyItems].sort((a, b) => a.name.localeCompare(b.name)),
        }));
      return { tier, label: TIER_LABEL[tier], families };
    });
  });

  /** All fetched problem details, keyed by LC number — the one join both problemsFor() and
   *  statsFor() read, so it's built once per details() change rather than once per call. */
  readonly detailsByNumber = computed<ReadonlyMap<number, ProblemProgress> | null>(() => {
    const list = this.details();
    return list ? new Map(list.map((p) => [p.lcNumber, p])) : null;
  });

  private readonly stats = computed<ReadonlyMap<string, TechniqueStats>>(() => {
    const byNumber = this.detailsByNumber() ?? new Map<number, ProblemProgress>();
    return new Map(this.techniques().map((t) => [t.name, deriveTechniqueStats(t, byNumber)]));
  });

  /** stats() always covers every technique currently in techniques() — built by mapping over
   *  that same signal above — so a lookup miss here would mean t isn't one of them. */
  statsFor(t: Technique): TechniqueStats {
    return this.stats().get(t.name)!;
  }

  private readonly techniquesByName = computed<ReadonlyMap<string, Technique>>(() =>
    new Map(this.techniques().map((t) => [t.name, t])),
  );

  /** The board's own single-selection state — deliberately separate from the List view's
   *  `expandedNames` (which supports several simultaneously-open rows). A Set-based "most
   *  recently toggled" reused from `expandedNames` was tried and rejected: clicking the
   *  already-selected card would toggle it OUT of the set but leave an earlier List-view
   *  selection as the new "most recent", so the panel would jump to stale content instead of
   *  closing; and selecting an older List-view entry would delete it from the shared set while
   *  the panel kept showing whatever was still "most recent" in it. */
  readonly boardSelectedName = signal<string | null>(null);

  /** The selected technique itself, re-resolved against the current `techniques()` on every
   *  read — not just captured once at selection time. `techniques()` can change out from
   *  under an open selection (e.g. a `?repo=` switch to a log that never had this technique),
   *  so this falls back to null rather than a stale/undefined object the template would throw
   *  on (`t.bestComfort`) via a non-null assertion. */
  readonly boardSelected = computed<Technique | null>(() => {
    const name = this.boardSelectedName();
    return name ? this.techniquesByName().get(name) ?? null : null;
  });

  isBoardSelected(t: Technique): boolean {
    return this.boardSelectedName() === t.name;
  }

  /** A board card click: selects it (same first-expand `expand` emission rule as `toggle()`),
   *  or deselects when it's already the selection — a card always has exactly zero or one
   *  selection, never the List view's multi-row toggle. */
  selectInBoard(t: Technique): void {
    const isReselect = this.boardSelectedName() === t.name;
    this.boardSelectedName.set(isReselect ? null : t.name);
    if (!isReselect && t.started) this.expand.emit(t);
  }

  /** Board organizing controls — signals rather than derived state, since none of the three
   *  are derivable from `techniques()`/`details()` alone; persisting them isn't required. */
  readonly boardSort = signal<TechniqueSortKey>('name');
  readonly boardFamily = signal<string | null>(null);
  readonly showHorizon = signal(false);

  setBoardSort(value: string): void {
    const key = value as TechniqueSortKey;
    this.boardSort.set(BOARD_SORT_KEYS.includes(key) ? key : 'name');
  }

  setBoardFamily(value: string): void {
    this.boardFamily.set(value === '' ? null : value);
    this.boardSelectedName.set(null);
  }

  toggleHorizon(): void {
    this.showHorizon.update((v) => !v);
    this.boardSelectedName.set(null);
    // The horizon toggle can drop the currently-picked family out of scope (a family that
    // only exists among the tier2/tier3 techniques it just hid) — fall back to All rather
    // than leaving the board filtered to an option that no longer appears anywhere.
    const family = this.boardFamily();
    if (family !== null && !this.boardFamilies().includes(family)) {
      this.boardFamily.set(null);
    }
  }

  /** The techniques the horizon toggle lets through — the pool both the family filter's
   *  option list and the board itself draw from, so the filter never offers a family whose
   *  every technique is hidden. */
  private readonly boardInScope = computed<Technique[]>(() => {
    const showHorizon = this.showHorizon();
    return this.techniques().filter((t) => showHorizon || !HORIZON_TIERS.has(t.tier));
  });

  readonly boardFamilies = computed<string[]>(() =>
    [...new Set(this.boardInScope().map((t) => t.family))].sort((a, b) => a.localeCompare(b)),
  );

  private readonly boardFiltered = computed<Technique[]>(() => {
    const family = this.boardFamily();
    return this.boardInScope().filter((t) => family === null || t.family === family);
  });

  private readonly boardSorted = computed<Technique[]>(() => {
    const key = this.boardSort();
    const stats = this.stats();
    return [...this.boardFiltered()].sort((a, b) => compareTechniques(a, b, key, stats));
  });

  /** The board's four columns, in `BOARD_COLUMN_ORDER`, each carrying its own count — a plain
   *  `filter` per column over the already-sorted/filtered list, so each column's items stay in
   *  sort order with no mutation. The technique list is small enough that filtering it once per
   *  column costs nothing worth optimizing for. */
  readonly boardColumns = computed<BoardColumn[]>(() => {
    const stats = this.stats();
    const sorted = this.boardSorted();
    return BOARD_COLUMN_ORDER.map((key) => ({
      key,
      label: BOARD_COLUMN_LABEL[key],
      items: sorted.filter((t) => columnFor(t, stats.get(t.name)) === key),
    }));
  });

  setView(next: TechniqueView): void {
    this.view.set(next);
    writeStoredView(next);
    this.boardSelectedName.set(null);
    this.expandedNames.set(new Set());
  }

  toggle(t: Technique): void {
    const key = t.name;
    const next = new Set(this.expandedNames());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      if (t.started) this.expand.emit(t);
    }
    this.expandedNames.set(next);
  }

  isExpanded(t: Technique): boolean {
    return this.expandedNames().has(t.name);
  }

  /** null = details not loaded yet (show a loading hint); [] = loaded but nothing matched. */
  problemsFor(t: Technique): ProblemProgress[] | null {
    const byNumber = this.detailsByNumber();
    if (!byNumber) return null;
    return t.problems.map((n) => byNumber.get(n)).filter((p): p is ProblemProgress => !!p);
  }

  /** Empty array when the technique carries no `planned` key at all (an older contract) —
   *  never absent, so callers never need their own `?? []`. */
  plannedFor(t: Technique): PlannedProblem[] {
    return t.planned ?? [];
  }

  plannedCount(t: Technique): number {
    return this.plannedFor(t).length;
  }

  /** The done/planned bar's ⓘ popover open state — same touch-friendly toggle pattern as
   *  TodayBoardComponent's own `infoOpen`/`toggleInfo` (today-board.component.ts): click/tap
   *  toggles it (for touch, where there's no hover), and the template also reveals it on
   *  `:hover`/`:focus-within` in pure CSS for mouse/keyboard. */
  readonly infoOpen = signal(false);

  toggleInfo(): void {
    this.infoOpen.update((v) => !v);
  }

  /** The done/planned bar's fill colour class (Change 2), derived from `coverageState`.
   *  '' for `notBegun` — the bar is 0% wide then (`barFillPercent`), so no fill colour would
   *  be visible anyway. */
  barFillClass(t: Technique): string {
    switch (coverageState(t)) {
      case 'covered':
        return 'tech-row__bar-fill--covered';
      case 'inProgress':
        return 'tech-row__bar-fill--in-progress';
      default:
        return '';
    }
  }

  /** Names of declared variations never exercised and not queued — empty when the contract
   *  carries no `untriedVariations`, even if `hasVariantGap` is true (see
   *  `variationChipLabel` for that fallback). Never absent, so callers never need `?? []`. */
  untriedVariationsFor(t: Technique): string[] {
    return t.untriedVariations ?? [];
  }

  /** The variation chip's text, or null to hide the chip entirely. Named variations win when
   *  present; an older contract with `hasVariantGap: true` but no names falls back to the
   *  generic singular phrasing (feedback_site_plain_language.md's fallback rule) with no
   *  count and no names listed. */
  variationChipLabel(t: Technique): string | null {
    const names = this.untriedVariationsFor(t);
    if (names.length === 1) return '1 variation not tried';
    if (names.length > 1) return `${names.length} variations not tried`;
    return t.hasVariantGap ? 'a variation not tried' : null;
  }

  /** The judge a planned problem's `url` points at, for the detail row's number/label slot
   *  (`Kattis` instead of `#9001`). Bare hostname with `www.` stripped when the host isn't in
   *  `JUDGE_HOST_LABELS`; '' for a null or unparsable url — never throws. */
  judgeLabel(url: string | null): string {
    if (!url) return '';
    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return '';
    }
    const bareHost = hostname.replace(/^www\./, '');
    return JUDGE_HOST_LABELS[bareHost] ?? bareHost;
  }

  /** A problem row's GitHub fallback link: the learner's own solution file (progress.json's
   *  `file`) on GitHub, in the repo/branch this page is rendering — never the gold standard,
   *  since a `?repo=` viewer's paths belong to THEIR checkout. Null until the repo ref is
   *  known. Mirrors progress-page.component.ts's own `solutionUrl`. */
  solutionUrl(file: string | null | undefined): string | null {
    const ref = this.repoRef();
    return file && ref ? fileUrl(ref, file) : null;
  }

  /** A problem row's walkthrough-route candidate — delegates to the shared
   *  walkthroughRouteFor() rule (solution-link-mode.ts) using the page-header setting's
   *  current mode. */
  walkthroughRoute(p: ProblemProgress): string | null {
    return walkthroughRouteFor(this.linkModeService.mode(), p.lcNumber, this.solutionUrl(p.file));
  }

  /** The GitHub fallback link's aria-label (no walkthrough route, but the row carries a
   *  `file` and the repo ref is known). Mirrors progress-page.component.ts's own
   *  `githubAriaLabel` — same wording; a technique row carries no `done` state to append. */
  githubAriaLabel(p: ProblemProgress): string {
    return `Solution source for #${p.lcNumber} on GitHub`;
  }

  shortName(name: string): string {
    return shortNameFor(name);
  }

  shortMonthDay(iso: string): string {
    return shortMonthDayFor(iso);
  }
}
