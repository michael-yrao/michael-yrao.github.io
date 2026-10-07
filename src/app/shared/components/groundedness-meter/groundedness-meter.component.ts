import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { loadAllAlgorithms } from '../../../core/data/algorithms.data';
import { AlgorithmMeta } from '../../../core/models/algorithm.model';
import { computeGroundedness } from '../../../core/showcase/groundedness';
import { GOLD_STANDARD_SLUG } from '../../../core/services/github-file.service';
import { ShowcaseService } from '../../../core/services/showcase.service';

const RATIO_TO_PERCENT = 100;

const GROUNDED_EXPLANATION =
  'A solution variant is one approach to a problem; a problem can have several, so this counts ' +
  'more than the problem total. "Grounded" means the code shown is fetched live from the repo ' +
  'and every walkthrough step is anchored to a real line of it.';

/**
 * The "N of M solution variants grounded" meter (a solution is any showcased variant, with or without a
 * walkthrough) — identical on the Library hub and the Algorithms
 * list (plan B7), factored out once rather than duplicated (DRY). Self-contained: injects
 * `ShowcaseService` itself, triggers `load()`, and computes the sitewide report — a caller
 * just places `<app-groundedness-meter>` with no inputs (the report is always "every
 * algorithm in the index against the gold-standard contract", identical everywhere it's shown).
 * The full algorithms load after the first render, so the host page paints first.
 */
@Component({
  selector: 'app-groundedness-meter',
  templateUrl: './groundedness-meter.component.html',
  styleUrls: ['./groundedness-meter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroundednessMeterComponent {
  private readonly showcase = inject(ShowcaseService);

  private readonly algorithms = signal<readonly AlgorithmMeta[] | null>(null);

  readonly status = this.showcase.status;
  /** Null until both the contract data and the full algorithms are present. */
  readonly report = computed(() => {
    const data = this.showcase.data();
    const algorithms = this.algorithms();
    return data && algorithms ? computeGroundedness(algorithms, data) : null;
  });

  readonly repoSlug = GOLD_STANDARD_SLUG;

  readonly explanation = GROUNDED_EXPLANATION;

  readonly percent = computed(() => {
    const report = this.report();
    return report ? Math.round(report.ratio * RATIO_TO_PERCENT) : 0;
  });

  constructor() {
    this.showcase.load();
    afterNextRender(() => {
      loadAllAlgorithms().then(
        (loaded) => this.algorithms.set(loaded),
        (err: unknown) => console.error('Groundedness meter: loading the algorithms failed', err),
      );
    });
  }
}
