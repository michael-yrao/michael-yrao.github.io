import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { ProgressService } from '../../../core/services/progress.service';
import { Comfort, ProblemProgress } from '../../../core/models/progress.model';
import { ALL_ALGORITHMS } from '../../../core/data/algorithms.data';
import { ProblemTimelineComponent } from '../problem-timeline/problem-timeline.component';
import { BadgeGridComponent } from '../badge-grid/badge-grid.component';
import { TechniqueListComponent } from '../technique-list/technique-list.component';
import { StreakCalendarComponent } from '../streak-calendar/streak-calendar.component';

type ComfortFilter = 'all' | Comfort;
type Difficulty = 'Easy' | 'Medium' | 'Hard';

// The Explore list's unified filter facet. `null` = show everything. Each drill button on
// the landing (a pipeline tier, an on-schedule count, a difficulty count) sets one of these
// and triggers loadDetails() + a scroll to the list — the three heavy drills all funnel
// through this single facet rather than each growing its own ad-hoc filter state.
type ListFacet =
  | { kind: 'comfort'; value: Comfort }
  | { kind: 'difficulty'; value: Difficulty }
  | { kind: 'schedule'; value: 'overdue' | 'due' | 'attention' };

// lcNumber -> the visualizer route on this site (if one exists). This is the viz-coverage
// join by LeetCode number that unifies the practice log with the visualizer library.
const VIZ_ROUTE = new Map<number, string>(
  ALL_ALGORITHMS.map((a) => [a.lcNumber, `/algorithms/${a.category}/${a.id}`]),
);

/** lcNumber + title identifies a row uniquely even when a number carries several method
 *  variants (e.g. 21 Recursion vs Iterative) — same key the funnel/timeline `track` uses. */
function rowKey(p: ProblemProgress): string {
  return `${p.lcNumber}-${p.title}`;
}

function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  ],
})
export class ProgressPageComponent {
  readonly status = this.progress.status;
  readonly error = this.progress.error;
  readonly data = this.progress.data;
  readonly repoSlug = this.progress.repoSlug;
  readonly refreshing = this.progress.refreshing;
  readonly refreshError = this.progress.refreshError;

  // Opt-in detail: the full `problems[]` array, fetched only via "Explore problems".
  readonly detailsStatus = this.progress.detailsStatus;
  readonly detailsError = this.progress.detailsError;
  readonly detailsRefreshing = this.progress.detailsRefreshing;
  readonly details = this.progress.details;

  // Unified filter facet for the Explore list. The manual comfort chips set `{kind:'comfort'}`
  // (or null for the "All" chip); the three headline drills below set 'difficulty'/'schedule'.
  readonly listFilter = signal<ListFacet | null>(null);
  readonly comfortFilters: ComfortFilter[] = ['all', '🔴', '🟡', '🟢', '🎓'];

  // Which rows are expanded — only an expanded row mounts <app-problem-timeline>, so at most
  // a handful of per-problem SVGs ever exist at once (the 132-at-once mount can never recur).
  private readonly expandedKeys = signal<ReadonlySet<string>>(new Set());

  // Instant drills (summary data only, no fetch): toggled panels under their own card.
  readonly techPanelOpen = signal(false);
  readonly streakPanelOpen = signal(false);

  private readonly exploreSectionRef = viewChild<ElementRef<HTMLElement>>('exploreSection');
  // 🏆 Retired never appears in details().problems[] (retired rows leave the tracker
  // entirely — see cse-progress's parse_retired()), so that segment can't drill into the
  // Explore list without landing on a permanently empty result. It scrolls to the Trophy
  // Case card instead, where retired items are already listed.
  private readonly trophyCaseRef = viewChild<ElementRef<HTMLElement>>('trophyCase');

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

  // Pipeline as ordered segments for the funnel bar — each is a drill into the Explore list
  // filtered to that comfort tier.
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

  // Difficulty mix — the third heavy drill (Easy/Medium/Hard counts -> filtered list).
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

  readonly onSchedulePct = computed(() => {
    const os = this.data()?.onSchedule;
    if (!os || !os.totalActive) return 100;
    return Math.round(((os.totalActive - os.overdue) / os.totalActive) * 100);
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
    // fetches the full problems[] file on its own — that is the "Explore problems" opt-in.
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

  vizRoute(lc: number): string | null {
    return VIZ_ROUTE.get(lc) ?? null;
  }

  retry(): void {
    this.progress.loadSummary(this.repoParam());
  }

  refresh(): void {
    this.progress.refresh();
  }

  exploreProblems(): void {
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
   *  Sets the Explore list's facet, fetches details (once, cached), and scrolls to the list —
   *  the three heavy drills all funnel through here. */
  drill(facet: ListFacet): void {
    this.listFilter.set(facet);
    this.progress.loadDetails();
    this.scrollToExplore();
  }

  /** Pipeline segment click: every tier except 🏆 Retired drills into the Explore list.
   *  Retired rows are never in details().problems[] (see the trophyCaseRef comment above),
   *  so that segment scrolls to the Trophy Case instead — no fetch, no dead-end facet. */
  pipelineSegmentClick(seg: { key: string; comfort: Comfort }): void {
    if (seg.key === 'retired') {
      this.scrollToTrophyCase();
      return;
    }
    this.drill({ kind: 'comfort', value: seg.comfort });
  }

  toggleTechPanel(): void {
    this.techPanelOpen.update((v) => !v);
  }

  toggleStreakPanel(): void {
    this.streakPanelOpen.update((v) => !v);
  }

  private scrollToExplore(): void {
    // Guarded: jsdom (unit tests) doesn't implement scrollIntoView, and the ref is undefined
    // until the template has rendered once.
    this.exploreSectionRef()?.nativeElement.scrollIntoView?.({ behavior: 'smooth' });
  }

  private scrollToTrophyCase(): void {
    this.trophyCaseRef()?.nativeElement.scrollIntoView?.({ behavior: 'smooth' });
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
