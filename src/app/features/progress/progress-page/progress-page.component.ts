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
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { ProgressService } from '../../../core/services/progress.service';
import { Comfort, ProblemProgress } from '../../../core/models/progress.model';
import { vizRouteFor } from '../../../core/data/viz-route';
import { todayLocalISO } from '../../../core/utils/local-date';
import { ProblemTimelineComponent } from '../problem-timeline/problem-timeline.component';
import { BadgeGridComponent } from '../badge-grid/badge-grid.component';
import { TechniqueListComponent } from '../technique-list/technique-list.component';
import { StreakCalendarComponent } from '../streak-calendar/streak-calendar.component';
import { TodayBoardComponent } from '../today-board/today-board.component';
import { RecognitionPanelComponent } from '../recognition-panel/recognition-panel.component';
import { Technique } from '../../../core/models/progress.model';

type ComfortFilter = 'all' | Comfort;
type Difficulty = 'Easy' | 'Medium' | 'Hard';

// Segmented tabs (replaces round-1's single "Full breakdown" toggle — round-2 learner
// feedback: the toggle "doesn't connect the top and bottom"). Overview is the default —
// streak hero + Today's board, the at-a-glance landing. Everything else has a home tab;
// all existing drill behavior keeps working inside them, just re-homed.
export type ProgressTab = 'overview' | 'mastery' | 'techniques' | 'activity' | 'problems' | 'recognition';
const TAB_ORDER: ProgressTab[] = [
  'overview', 'mastery', 'techniques', 'activity', 'problems', 'recognition',
];
const TAB_LABEL: Record<ProgressTab, string> = {
  overview: 'Overview',
  mastery: 'Mastery',
  techniques: 'Techniques',
  activity: 'Activity',
  problems: 'Problems',
  recognition: 'Recognition',
};

// The Explore list's unified filter facet. `null` = show everything. Each drill button on
// the landing (a pipeline tier, an on-schedule count, a difficulty count) sets one of these
// and triggers loadDetails() + switches to the Problems tab — the three heavy drills all
// funnel through this single facet rather than each growing its own ad-hoc filter state.
type ListFacet =
  | { kind: 'comfort'; value: Comfort }
  | { kind: 'difficulty'; value: Difficulty }
  | { kind: 'schedule'; value: 'overdue' | 'due' | 'attention' };

/** lcNumber + title identifies a row uniquely even when a number carries several method
 *  variants (e.g. 21 Recursion vs Iterative) — same key the funnel/timeline `track` uses. */
function rowKey(p: ProblemProgress): string {
  return `${p.lcNumber}-${p.title}`;
}

@Component({
  selector: 'app-progress-page',
  templateUrl: './progress-page.component.html',
  styleUrls: ['./progress-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ProblemTimelineComponent,
    BadgeGridComponent,
    TechniqueListComponent,
    StreakCalendarComponent,
    TodayBoardComponent,
    RecognitionPanelComponent,
  ],
})
export class ProgressPageComponent {
  readonly status = this.progress.status;
  readonly error = this.progress.error;
  readonly data = this.progress.data;
  readonly repoSlug = this.progress.repoSlug;
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
  // (or null for the "All" chip); the three headline drills below set 'difficulty'/'schedule'.
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
    if (f.kind === 'difficulty') return list.filter((p) => p.difficulty === f.value);
    const today = todayLocalISO();
    return list.filter((p) => {
      if (!p.nextReview) return false;
      if (f.value === 'overdue') return p.nextReview < today;
      if (f.value === 'due') return p.nextReview === today;
      return p.nextReview <= today; // 'attention' — overdue OR due today
    });
  });

  // Pipeline as ordered segments for the funnel bar — each is a drill into the Problems tab
  // filtered to that comfort tier. No legend (round-2 item 6 — the glyph segments are
  // self-evident); the funnel bar's own segments are the only click target now.
  readonly pipelineSegments = computed(() => {
    const d = this.data();
    if (!d) return [];
    const p = d.pipeline;
    return (
      [
        { key: 'blank', label: '🔴 Blank', value: p.blank, cls: 'seg-blank', comfort: '🔴' },
        { key: 'shaky', label: '🟡 Shaky', value: p.shaky, cls: 'seg-shaky', comfort: '🟡' },
        { key: 'clean', label: '🟢 Clean', value: p.clean.total, cls: 'seg-clean', comfort: '🟢' },
        { key: 'grad', label: '🎓 Graduated', value: p.graduated, cls: 'seg-grad', comfort: '🎓' },
        { key: 'retired', label: '🏆 Retired', value: p.retired, cls: 'seg-retired', comfort: '🏆' },
      ] satisfies { key: string; label: string; value: number; cls: string; comfort: Comfort }[]
    ).filter((s) => s.value > 0);
  });

  readonly pipelineTotal = computed(() =>
    this.pipelineSegments().reduce((sum, s) => sum + s.value, 0),
  );

  // Difficulty mix — round-2 item 5: folded into the Mastery tab's pipeline card (no longer
  // its own top-level card). Still the third heavy drill (Easy/Medium/Hard -> filtered list).
  readonly difficultySegments = computed(() => {
    const diff = this.data()?.difficulty;
    if (!diff) return [];
    return (
      [
        { key: 'Easy', value: diff.Easy },
        { key: 'Medium', value: diff.Medium },
        { key: 'Hard', value: diff.Hard },
      ] satisfies { key: Difficulty; value: number }[]
    ).filter((s) => s.value > 0);
  });

  readonly difficultyTotal = computed(() =>
    this.difficultySegments().reduce((sum, s) => sum + s.value, 0),
  );

  readonly onSchedulePct = computed(() => {
    const os = this.data()?.onSchedule;
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

  private readonly repoParam;

  constructor(
    private readonly progress: ProgressService,
    route: ActivatedRoute,
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

  pct(value: number): number {
    const total = this.pipelineTotal();
    return total ? (value / total) * 100 : 0;
  }

  difficultyPct(value: number): number {
    const total = this.difficultyTotal();
    return total ? (value / total) * 100 : 0;
  }

  breadthPct(value: number): number {
    const tb = this.techniqueBreadth();
    return tb?.total ? (value / tb.total) * 100 : 0;
  }

  vizRoute(lc: number): string | null {
    return vizRouteFor(lc);
  }

  retry(): void {
    this.progress.loadSummary(this.repoParam());
  }

  refresh(): void {
    this.progress.refresh();
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

  /** A headline-metric drill: a pipeline tier, an on-schedule count, or a difficulty count.
   *  Sets the Explore list's facet, fetches details (once, cached), and switches to the
   *  Problems tab — the three heavy drills all funnel through here. */
  drill(facet: ListFacet): void {
    this.listFilter.set(facet);
    this.progress.loadDetails();
    this.selectTab('problems');
  }

  /** Pipeline segment click: every tier except 🏆 Retired drills into the Problems tab.
   *  Retired rows are never in details().problems[] (retired rows leave the tracker
   *  entirely — see cse-progress's parse_retired()), so that segment just switches to the
   *  Mastery tab instead, where the Trophy Case already lists them — no fetch, no dead-end
   *  facet. */
  pipelineSegmentClick(seg: { key: string; comfort: Comfort }): void {
    if (seg.key === 'retired') {
      this.selectTab('mastery');
      return;
    }
    this.drill({ kind: 'comfort', value: seg.comfort });
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
