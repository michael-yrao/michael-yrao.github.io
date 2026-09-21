import { ChangeDetectionStrategy, Component, computed, effect, signal, untracked } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { ProgressService } from '../../../core/services/progress.service';
import { Comfort, ProblemProgress } from '../../../core/models/progress.model';
import { ALL_ALGORITHMS } from '../../../core/data/algorithms.data';
import { ProblemTimelineComponent } from '../problem-timeline/problem-timeline.component';
import { BadgeGridComponent } from '../badge-grid/badge-grid.component';

type ComfortFilter = 'all' | Comfort;

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

@Component({
  selector: 'app-progress-page',
  templateUrl: './progress-page.component.html',
  styleUrls: ['./progress-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ProblemTimelineComponent, BadgeGridComponent],
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

  readonly filter = signal<ComfortFilter>('all');
  readonly comfortFilters: ComfortFilter[] = ['all', '🔴', '🟡', '🟢', '🎓'];

  // Which rows are expanded — only an expanded row mounts <app-problem-timeline>, so at most
  // a handful of per-problem SVGs ever exist at once (the 132-at-once mount can never recur).
  private readonly expandedKeys = signal<ReadonlySet<string>>(new Set());

  readonly visibleProblems = computed<ProblemProgress[]>(() => {
    const list = this.details();
    if (!list) return [];
    const f = this.filter();
    return f === 'all' ? list : list.filter((p) => p.comfort === f);
  });

  // Pipeline as ordered segments for the funnel bar.
  readonly pipelineSegments = computed(() => {
    const d = this.data();
    if (!d) return [];
    const p = d.pipeline;
    return [
      { key: 'blank', label: '🔴 Blank', value: p.blank, cls: 'seg-blank' },
      { key: 'shaky', label: '🟡 Shaky', value: p.shaky, cls: 'seg-shaky' },
      { key: 'clean', label: '🟢 Clean', value: p.clean.total, cls: 'seg-clean' },
      { key: 'grad', label: '🎓 Graduated', value: p.graduated, cls: 'seg-grad' },
      { key: 'retired', label: '🏆 Retired', value: p.retired, cls: 'seg-retired' },
    ].filter((s) => s.value > 0);
  });

  readonly pipelineTotal = computed(() =>
    this.pipelineSegments().reduce((sum, s) => sum + s.value, 0),
  );

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
