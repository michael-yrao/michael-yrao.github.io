import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { ProgressService } from '../../../core/services/progress.service';
import { fileUrl } from '../../../core/services/github-file.service';
import { Comfort, OnSchedule, ProblemProgress, ScheduleItem } from '../../../core/models/progress.model';
import { vizRouteFor } from '../../../core/data/viz-route';
import { daysBetweenISO, todayLocalISO } from '../../../core/utils/local-date';
import { ProblemTimelineComponent } from '../problem-timeline/problem-timeline.component';
import { BadgeGridComponent } from '../badge-grid/badge-grid.component';
import { TechniqueListComponent } from '../technique-list/technique-list.component';
import { StreakCalendarComponent } from '../streak-calendar/streak-calendar.component';
import { TodayBoardComponent } from '../today-board/today-board.component';
import { RecognitionPanelComponent } from '../recognition-panel/recognition-panel.component';
import { SegmentedBarComponent, SegmentedBarSegment } from '../segmented-bar/segmented-bar.component';
import { WorkloadChartComponent } from '../workload-chart/workload-chart.component';
import { Technique } from '../../../core/models/progress.model';

type ComfortFilter = 'all' | Comfort;
type Difficulty = 'Easy' | 'Medium' | 'Hard';

// Segmented tabs (replaces round-1's single "Full breakdown" toggle — round-2 learner
// feedback: the toggle "doesn't connect the top and bottom"). Overview is the default —
// streak hero + Today's board, the at-a-glance landing. Everything else has a home tab;
// all existing drill behavior keeps working inside them, just re-homed. Techniques (round 5)
// folded into Mastery — the honest denominator and the technique list belong next to the
// pipeline they both describe.
export type ProgressTab = 'overview' | 'mastery' | 'recognition' | 'problems' | 'activity';
const TAB_ORDER: ProgressTab[] = ['overview', 'mastery', 'recognition', 'problems', 'activity'];
const TAB_LABEL: Record<ProgressTab, string> = {
  overview: 'Overview',
  mastery: 'Mastery',
  recognition: 'Recognition',
  problems: 'Problems',
  activity: 'Activity',
};

// The Explore list's unified filter facet. `null` = show everything. Each drill button on
// the landing (a pipeline tier, a difficulty count) sets one of these and triggers
// loadDetails() + switches to the Problems tab. The On-schedule gauge's "Needs attention"
// list is no longer one of these drills — it expands inline in the gauge card instead (see
// `attentionOpen`/`attentionProblems` below), so this facet only ever carries comfort or
// difficulty.
type ListFacet = { kind: 'comfort'; value: Comfort } | { kind: 'difficulty'; value: Difficulty };

/** Overdue or due-today as of `today` — the On-schedule gauge's inline "Needs attention"
 *  list. A problem with no `nextReview` yet (never reviewed) is never in this state. */
function isDueOrOverdue(p: ProblemProgress, today: string): boolean {
  return !!p.nextReview && p.nextReview <= today;
}

/** The On-schedule gauge's counts recomputed client-side from the loaded problem rows —
 *  the same arithmetic as cse-progress gamify.py's `on_schedule()`, but against the
 *  viewer's `today` rather than the exporter's session date. */
function countOnSchedule(problems: readonly ProblemProgress[], today: string): OnSchedule {
  const overdue = problems.filter((p) => !!p.nextReview && p.nextReview < today).length;
  const dueToday = problems.filter((p) => p.nextReview === today).length;
  return { totalActive: problems.length, dueToday, overdue };
}

/** lcNumber + title identifies a row uniquely even when a number carries several method
 *  variants (e.g. 21 Recursion vs Iterative) — same key the funnel/timeline `track` uses. */
function rowKey(p: ProblemProgress): string {
  return `${p.lcNumber}-${p.title}`;
}

// The pipeline segment KEY -> comfort glyph it drills into. Kept as a lookup (rather than
// carrying an extra `comfort` field on each SegmentedBarSegment) so pipelineSegments() can
// emit the exact same shape every other bar usage emits — the component itself only ever
// needs to know key/label/value/cls.
const MISSING_GENERATED_AT = '—';

/** Shared tail of the Refresh button's title and aria-label — the freshness line, minus the
 *  leading word each caller supplies ("Data " for the title; "Refresh — data " for the
 *  aria-label, which overrides visible text so it must still say "Refresh"). */
function asOfLine(generatedAt: string | undefined): string {
  return `as of ${generatedAt ?? MISSING_GENERATED_AT} · pull the latest from GitHub`;
}

const PIPELINE_COMFORT: Record<string, Comfort> = {
  blank: '🔴',
  shaky: '🟡',
  clean: '🟢',
  grad: '🎓',
  retired: '🏆',
};

@Component({
  selector: 'app-progress-page',
  templateUrl: './progress-page.component.html',
  styleUrls: ['./progress-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgTemplateOutlet,
    ProblemTimelineComponent,
    BadgeGridComponent,
    TechniqueListComponent,
    StreakCalendarComponent,
    TodayBoardComponent,
    RecognitionPanelComponent,
    SegmentedBarComponent,
    WorkloadChartComponent,
  ],
})
export class ProgressPageComponent {
  readonly status = this.progress.status;
  readonly error = this.progress.error;
  readonly data = this.progress.data;
  readonly repoSlug = this.progress.repoSlug;
  readonly repoRef = this.progress.repoRef;
  readonly refreshing = this.progress.refreshing;
  readonly refreshError = this.progress.refreshError;

  // Opt-in detail: the full `problems[]` array, fetched only when the Problems tab is
  // entered for the first time (loadDetails() itself no-ops on a redundant call).
  readonly detailsStatus = this.progress.detailsStatus;
  readonly detailsError = this.progress.detailsError;
  readonly detailsRefreshing = this.progress.detailsRefreshing;
  readonly details = this.progress.details;

  readonly tabs = TAB_ORDER;
  readonly tabLabel = TAB_LABEL;
  readonly activeTab = signal<ProgressTab>('overview');
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  // Unified filter facet for the Explore list. The manual comfort chips set `{kind:'comfort'}`
  // (or null for the "All" chip); the pipeline/difficulty headline drills below set the rest.
  readonly listFilter = signal<ListFacet | null>(null);
  readonly comfortFilters: ComfortFilter[] = ['all', '🔴', '🟡', '🟢', '🎓'];

  // Which rows are expanded — only an expanded row mounts <app-problem-timeline>, so at most
  // a handful of per-problem SVGs ever exist at once (the 132-at-once mount can never recur).
  private readonly expandedKeys = signal<ReadonlySet<string>>(new Set());

  readonly visibleProblems = computed<ProblemProgress[]>(() => {
    const list = this.details();
    if (!list) return [];
    const f = this.listFilter();
    if (!f) return list;
    if (f.kind === 'comfort') return list.filter((p) => p.comfort === f.value);
    return list.filter((p) => p.difficulty === f.value);
  });

  // ── On-schedule gauge's inline "Needs attention" list ───────────────────────────────
  // Round 7: the drill used to jump the learner to the Problems tab via the `schedule`
  // facet; the list now expands in place under the gauge instead. `attentionOpen` toggles
  // the disclosure; opening it fires the same idempotent loadDetails() the old drill did.
  readonly attentionOpen = signal(false);

  readonly attentionProblems = computed<ProblemProgress[]>(() => {
    const today = todayLocalISO();
    const due = (this.details() ?? []).filter((p) => isDueOrOverdue(p, today));
    return [...due].sort(
      (a, b) => (a.nextReview ?? '').localeCompare(b.nextReview ?? '') || a.lcNumber - b.lcNumber,
    );
  });

  // Pipeline as ordered segments for the shared segmented bar (round 4 — same component the
  // difficulty mix and technique breadth now render through) — each is a drill into the
  // Problems tab filtered to that comfort tier. No legend (round-2 item 6 — the segments are
  // self-labeling); the bar's own segments are the only click target.
  readonly pipelineSegments = computed<SegmentedBarSegment[]>(() => {
    const d = this.data();
    if (!d) return [];
    const p = d.pipeline;
    return (
      [
        { key: 'blank', label: 'Blank', value: p.blank, cls: 'seg-blank' },
        { key: 'shaky', label: 'Shaky', value: p.shaky, cls: 'seg-shaky' },
        { key: 'clean', label: 'Clean', value: p.clean.total, cls: 'seg-clean' },
        { key: 'grad', label: 'Graduated', value: p.graduated, cls: 'seg-grad' },
        { key: 'retired', label: 'Retired', value: p.retired, cls: 'seg-retired' },
      ] satisfies SegmentedBarSegment[]
    ).filter((s) => s.value > 0);
  });

  // Difficulty mix — round-2 item 5: folded into the Mastery tab's pipeline card (no longer
  // its own top-level card). Round 4: now the same shared segmented bar, still the third
  // heavy drill (Easy/Medium/Hard -> filtered list).
  readonly difficultySegments = computed<SegmentedBarSegment[]>(() => {
    const diff = this.data()?.difficulty;
    if (!diff) return [];
    return (
      [
        { key: 'Easy', label: 'Easy', value: diff.Easy, cls: 'seg-easy' },
        { key: 'Medium', label: 'Medium', value: diff.Medium, cls: 'seg-medium' },
        { key: 'Hard', label: 'Hard', value: diff.Hard, cls: 'seg-hard' },
      ] satisfies SegmentedBarSegment[]
    ).filter((s) => s.value > 0);
  });

  // Refresh button's title/aria-label — hoisted from inline string concatenation (round 6):
  // the OnPush button re-read `data()?.generatedAt` inline on every CD pass; these `computed`s
  // only recompute when `data()` itself changes.
  readonly refreshTitle = computed(() => `Data ${asOfLine(this.data()?.generatedAt)}`);
  readonly refreshAriaLabel = computed(() => `Refresh — data ${asOfLine(this.data()?.generatedAt)}`);

  // The always-visible counterpart to the Refresh button's hover-only freshness line — same
  // MISSING_GENERATED_AT fallback, no "pull the latest…" tail (that belongs to the button).
  readonly generatedAtLabel = computed(() => this.data()?.generatedAt ?? MISSING_GENERATED_AT);

  // The gauge's counts. The exported `onSchedule` is frozen at the exporter's session date
  // (cse-progress keeps a past-midnight session on its START date), so viewed the next
  // morning it can say "0 due today" while the inline attention list — filtered by the
  // browser's own date — shows five. Once details are loaded the gauge recounts from the
  // same rows the list uses, with the same `today`, so the two can never disagree; before
  // that, the exported snapshot stands in.
  readonly onScheduleView = computed<OnSchedule | null>(() => {
    const details = this.details();
    if (!details) return this.data()?.onSchedule ?? null;
    return countOnSchedule(details, todayLocalISO());
  });

  readonly onSchedulePct = computed(() => {
    const os = this.onScheduleView();
    if (!os || !os.totalActive) return 100;
    return Math.round(((os.totalActive - os.overdue) / os.totalActive) * 100);
  });

  // The honest technique denominator (round-2 item 1): breadth tiered by the interview-ROI
  // line rather than one flat fraction. "practiced" = started (any tier — in practice only
  // 'core' is ever started); "upcoming" = not-started but ABOVE the line (dp + tier1);
  // "horizon" = not-started and BELOW the line (tier2 + tier3, competitive-only).
  readonly techniqueBreadth = computed(() => {
    const techs = this.data()?.techniques;
    if (!techs || !techs.length) return null;
    let practiced = 0;
    let upcoming = 0;
    let horizon = 0;
    for (const t of techs) {
      if (t.started) practiced++;
      else if (t.tier === 'dp' || t.tier === 'tier1') upcoming++;
      else horizon++;
    }
    return { practiced, upcoming, horizon, total: techs.length };
  });

  // Round 4: the breadth bar rebuilt onto the shared segmented-bar component — same
  // definitions as techniqueBreadth() above (practiced=started; upcoming/horizon split by
  // the interview-ROI line), just reshaped into self-labeling segments so it reads like the
  // pipeline instead of needing its own vertical "ROI line" marker to be legible.
  // Both stage bars read the same direction — still ahead → earned — so the earned segment
  // sits at the right edge here, same as the pipeline's 🎓/🏆.
  readonly breadthSegments = computed<SegmentedBarSegment[]>(() => {
    const tb = this.techniqueBreadth();
    if (!tb) return [];
    return (
      [
        { key: 'horizon', label: 'Competitive-horizon', value: tb.horizon, cls: 'seg-horizon' },
        { key: 'upcoming', label: 'Interview-upcoming', value: tb.upcoming, cls: 'seg-upcoming' },
        { key: 'practiced', label: 'Practiced (started)', value: tb.practiced, cls: 'seg-practiced' },
      ] satisfies SegmentedBarSegment[]
    ).filter((s) => s.value > 0);
  });

  private readonly repoParam;

  // ── Inline repo picker ──────────────────────────────────────────────────────────────
  readonly repoInputValue = signal('');
  readonly repoInputInvalid = signal(false);
  // Toggled by the header slug link's "change" control; the error state's own picker
  // outlet is unconditional and doesn't read this signal at all.
  readonly isRepoPickerOpen = signal(false);

  constructor(
    private readonly progress: ProgressService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    // React to ?repo=owner/name (the service supplies the default when it is null). Seed the
    // initial value from the route SNAPSHOT so the first effect run already has the real param
    // — otherwise it would fire once with null (loading the default) and again with the param,
    // a double fetch whose responses can race.
    this.repoParam = toSignal(route.queryParamMap.pipe(map((p) => p.get('repo'))), {
      initialValue: route.snapshot.queryParamMap.get('repo'),
    });
    // (Re)load the lightweight summary whenever the repo param changes. The landing never
    // fetches the full problems[] file on its own — that is the Problems-tab opt-in.
    //
    // ⚠️ loadSummary() reads/writes `source`/`status` signals internally. If those reads
    // happened INSIDE this effect's reactive tracking, the effect would depend on them too —
    // and since loadSummary writes a brand-new `source` object on every call, that write
    // would always look like a change, re-triggering the effect in an infinite loop (and
    // spamming HTTP). `untracked` confines this effect's dependency to `repoParam()` alone;
    // everything loadSummary reads/writes is invisible to it.
    effect(() => {
      const repo = this.repoParam();
      untracked(() => this.progress.loadSummary(repo));
    });
  }

  vizRoute(lc: number): string | null {
    return vizRouteFor(lc);
  }

  /** The status badge's GitHub fallback link: the learner's own solution file (progress.json's
   *  `file`) on GitHub, in the repo/branch this page is rendering — never the gold standard,
   *  since a `?repo=` viewer's paths belong to THEIR checkout. Null until the repo ref is known. */
  solutionUrl(file: string | null | undefined): string | null {
    const ref = this.repoRef();
    return file && ref ? fileUrl(ref, file) : null;
  }

  /** The status badge's aria-label when it's the GitHub solution-file link (no walkthrough
   *  route, but the row carries a `file` and the repo ref is known). Round 7: the glyph no
   *  longer encodes comfort (always ○ — see the template), so neither does the label. */
  githubAriaLabel(p: ProblemProgress): string {
    return `Solution source for #${p.lcNumber} on GitHub`;
  }

  retry(): void {
    this.progress.loadSummary(this.repoParam());
  }

  refresh(): void {
    this.progress.refresh();
  }

  onRepoInputChange(value: string): void {
    this.repoInputValue.set(value);
    if (this.repoInputInvalid()) this.repoInputInvalid.set(false);
  }

  /** The header slug link's "change" control — reveals/hides the inline `?repo=` picker. */
  toggleRepoPicker(): void {
    this.isRepoPickerOpen.set(!this.isRepoPickerOpen());
  }

  /** Delegates the shape check to ProgressService.parseRepo itself — no separate regex to
   *  drift out of sync. `parseRepo('')` resolves to the default repo rather than `null` (so
   *  an EMPTY ?repo= still means "use the default"), but a blank picker submission must
   *  still be rejected here, so blank is handled explicitly before asking parseRepo. */
  private isValidRepoInput(raw: string): boolean {
    if (!raw) return false;
    return this.progress.parseRepo(raw) !== null;
  }

  /** Submits the inline repo-picker form: navigates to `?repo=` on a valid `owner/name[@branch]`,
   *  otherwise leaves the URL alone and shows the same error hint the load-error state uses. */
  submitRepoPicker(): void {
    const raw = this.repoInputValue().trim();
    if (!raw || !this.isValidRepoInput(raw)) {
      this.repoInputInvalid.set(true);
      return;
    }
    this.repoInputInvalid.set(false);
    this.isRepoPickerOpen.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { repo: raw },
      queryParamsHandling: 'merge',
    });
  }

  /** Selects a tab; entering Problems for the first time fires loadDetails() (idempotent —
   *  it no-ops if details are already loaded, per ProgressService). */
  selectTab(tab: ProgressTab): void {
    this.activeTab.set(tab);
    if (tab === 'problems') this.progress.loadDetails();
  }

  isTabActive(tab: ProgressTab): boolean {
    return this.activeTab() === tab;
  }

  /** Roving tabindex keyboard nav for the tablist (ArrowLeft/Right wrap, Home/End jump). */
  onTabKeydown(event: KeyboardEvent, index: number): void {
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (index + 1) % TAB_ORDER.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TAB_ORDER.length) % TAB_ORDER.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TAB_ORDER.length - 1;
    if (next === null) return;
    event.preventDefault();
    this.selectTab(TAB_ORDER[next]);
    this.tabButtons()[next]?.nativeElement.focus();
  }

  exploreProblems(): void {
    this.progress.loadDetails();
  }

  /** A technique row expanded to its problems (Techniques tab, round 3) — same on-demand,
   *  idempotent loadDetails() as the Problems tab; TechniqueListComponent only emits this
   *  for a STARTED technique (a not-started one has nothing to join). */
  onTechniqueExpand(_t: Technique): void {
    this.progress.loadDetails();
  }

  /** A today-board row's trend panel opened (Overview tab) — same on-demand, idempotent
   *  loadDetails() as onTechniqueExpand/the Problems tab; the Overview stays summary-only
   *  until a row's title is actually clicked open. */
  onTrendExpand(_item: ScheduleItem): void {
    this.progress.loadDetails();
  }

  /** The manual comfort chips ("All" / 🔴 / 🟡 / 🟢 / 🎓) above the Explore list — these do
   *  NOT fetch (details are already loaded once this row of chips is visible). */
  setComfortFilter(f: ComfortFilter): void {
    this.listFilter.set(f === 'all' ? null : { kind: 'comfort', value: f });
  }

  isComfortFilterActive(f: ComfortFilter): boolean {
    const cur = this.listFilter();
    if (f === 'all') return cur === null;
    return cur?.kind === 'comfort' && cur.value === f;
  }

  /** A headline-metric drill: a pipeline tier or a difficulty count. Sets the Explore list's
   *  facet, fetches details (once, cached), and switches to the Problems tab. */
  drill(facet: ListFacet): void {
    this.listFilter.set(facet);
    this.progress.loadDetails();
    this.selectTab('problems');
  }

  /** The On-schedule gauge's "Needs attention" toggle — expands/collapses the inline list
   *  in place (round 7: no longer a drill into the Problems tab). Opening it fires the same
   *  idempotent loadDetails() the old drill fired; collapsing needs no fetch. */
  toggleAttention(): void {
    const next = !this.attentionOpen();
    this.attentionOpen.set(next);
    if (next) this.progress.loadDetails();
  }

  /** The inline attention list's Retry button (details load failed). */
  retryAttention(): void {
    this.progress.loadDetails();
  }

  /** Whether a problem's next review is today — the accent modifier on its due label. */
  isDueToday(p: ProblemProgress): boolean {
    return p.nextReview === todayLocalISO();
  }

  /** The attention row's due label: "due today", or "Nd overdue" for a past nextReview. */
  dueLabel(p: ProblemProgress): string {
    const today = todayLocalISO();
    const nextReview = p.nextReview ?? today;
    if (nextReview === today) return 'due today';
    return `${daysBetweenISO(nextReview, today)}d overdue`;
  }

  /** Pipeline segment click: every tier except 🏆 Retired drills into the Problems tab.
   *  Retired rows are never in details().problems[] (retired rows leave the tracker
   *  entirely — see cse-progress's parse_retired()), so that segment just switches to the
   *  Activity tab instead, where the Trophy Case now lives — no fetch, no dead-end facet. */
  pipelineSegmentClick(seg: SegmentedBarSegment): void {
    if (seg.key === 'retired') {
      this.selectTab('activity');
      return;
    }
    const comfort = PIPELINE_COMFORT[seg.key];
    if (!comfort) return; // defensive — every real pipeline segment key has a mapping
    this.drill({ kind: 'comfort', value: comfort });
  }

  /** Difficulty segment click — same drill the old chip row fired, now via the shared bar. */
  difficultySegmentClick(seg: SegmentedBarSegment): void {
    this.drill({ kind: 'difficulty', value: seg.key as Difficulty });
  }

  toggle(p: ProblemProgress): void {
    const key = rowKey(p);
    const next = new Set(this.expandedKeys());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.expandedKeys.set(next);
  }

  isExpanded(p: ProblemProgress): boolean {
    return this.expandedKeys().has(rowKey(p));
  }
}
