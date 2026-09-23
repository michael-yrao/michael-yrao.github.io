import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ALL_ALGORITHMS } from '../../../core/data/algorithms.data';
import { computeGroundedness } from '../../../core/showcase/groundedness';
import { GOLD_STANDARD_SLUG } from '../../../core/services/github-file.service';
import { ShowcaseService } from '../../../core/services/showcase.service';

const RATIO_TO_PERCENT = 100;

/**
 * The "N of M solutions grounded" meter (a solution is any showcased variant, with or without a
 * walkthrough) — identical on the Library hub and the Algorithms
 * list (plan B7), factored out once rather than duplicated (DRY). Self-contained: injects
 * `ShowcaseService` itself, triggers `load()`, and computes the sitewide report — a caller
 * just places `<app-groundedness-meter>` with no inputs (the report is always "all of
 * ALL_ALGORITHMS against the gold-standard contract", identical everywhere it's shown).
 */
@Component({
  selector: 'app-groundedness-meter',
  templateUrl: './groundedness-meter.component.html',
  styleUrls: ['./groundedness-meter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroundednessMeterComponent {
  private readonly showcase = inject(ShowcaseService);

  readonly status = this.showcase.status;
  readonly report = computed(() => {
    const data = this.showcase.data();
    return data ? computeGroundedness(ALL_ALGORITHMS, data) : null;
  });

  readonly repoSlug = GOLD_STANDARD_SLUG;

  readonly percent = computed(() => {
    const report = this.report();
    return report ? Math.round(report.ratio * RATIO_TO_PERCENT) : 0;
  });

  constructor() {
    this.showcase.load();
  }
}
