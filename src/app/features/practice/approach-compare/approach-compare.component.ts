import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ShowcaseService } from '../../../core/services/showcase.service';
import { AlgorithmMeta } from '../../../core/models/algorithm.model';
import { showcaseKey } from '../../../core/showcase/showcase-key';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { WalkthroughStateService } from '../walkthrough-state.service';

interface ApproachRow {
  readonly label: string;
  readonly timeComplexity: string;
  readonly spaceComplexity: string;
  readonly stepCount: number;
  readonly isGrounded: boolean;
}

/** One row per solution variant: its bounds, its step count and whether a showcase entry backs
 *  it. Renders only when the problem has more than one approach. */
@Component({
  selector: 'app-approach-compare',
  templateUrl: './approach-compare.component.html',
  styleUrls: ['./approach-compare.component.scss'],
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApproachCompareComponent {
  readonly meta = input.required<AlgorithmMeta>();

  protected readonly state = inject(WalkthroughStateService);
  private readonly showcase = inject(ShowcaseService);

  /** Step counts depend on `meta` alone, so they are generated once per meta reference. */
  private readonly stepCounts = computed(() =>
    this.meta().solutions.map((solution) => solution.generateSteps().length),
  );

  protected readonly rows = computed<ApproachRow[]>(() => {
    const meta = this.meta();
    const counts = this.stepCounts();
    return meta.solutions.map((solution, i) => ({
      label: solution.label,
      timeComplexity: solution.timeComplexity,
      spaceComplexity: solution.spaceComplexity,
      stepCount: counts[i],
      isGrounded: this.showcase.entryFor(showcaseKey(meta, solution)) !== null,
    }));
  });

  protected readonly isShown = computed(() => this.meta().solutions.length > 1);
}
