import { ChangeDetectionStrategy, Component, computed, effect, signal } from '@angular/core';
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

  readonly filter = signal<ComfortFilter>('all');
  readonly comfortFilters: ComfortFilter[] = ['all', '🔴', '🟡', '🟢', '🎓'];

  readonly visibleProblems = computed<ProblemProgress[]>(() => {
    const d = this.data();
    if (!d) return [];
    const f = this.filter();
    const list = f === 'all' ? d.problems : d.problems.filter((p) => p.comfort === f);
    return list;
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
    // (Re)load whenever the repo param changes.
    effect(() => this.progress.load(this.repoParam()));
  }

  pct(value: number): number {
    const total = this.pipelineTotal();
    return total ? (value / total) * 100 : 0;
  }

  vizRoute(lc: number): string | null {
    return VIZ_ROUTE.get(lc) ?? null;
  }

  retry(): void {
    this.progress.load(this.repoParam());
  }
}
