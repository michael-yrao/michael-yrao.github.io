import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { RoadmapLevelRow } from './roadmap-levels';

const PERCENT_SCALE = 100;

/** The Mastery tab's roadmap card: one row per level, track width = the level's share of the
 *  largest level, fill = how much of that level is started. */
@Component({
  selector: 'app-roadmap-coverage',
  templateUrl: './roadmap-coverage.component.html',
  styleUrls: ['./roadmap-coverage.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapCoverageComponent {
  readonly rows = input.required<RoadmapLevelRow[]>();

  readonly bars = computed(() => {
    const rows = this.rows();
    const largest = Math.max(...rows.map((r) => r.total), 0);
    return rows.map((r) => ({
      ...r,
      trackPct: largest ? (r.total / largest) * PERCENT_SCALE : 0,
      fillPct: r.total ? (r.started / r.total) * PERCENT_SCALE : 0,
    }));
  });
}
