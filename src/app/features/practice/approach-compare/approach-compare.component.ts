import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ShowcaseService } from '../../../core/services/showcase.service';
import { AlgorithmMeta } from '../../../core/models/algorithm.model';
import { complexityLabel } from '../../../core/showcase/complexity-label';
import { showcaseKey } from '../../../core/showcase/showcase-key';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { WalkthroughStateService } from '../walkthrough-state.service';

interface ApproachRow {
  readonly label: string;
  readonly timeComplexity: string | null;
  readonly spaceComplexity: string | null;
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
    const entries = meta.solutions.map((solution) =>
      this.showcase.entryFor(showcaseKey(meta, solution)),
    );
    return meta.solutions.map((solution, i) => ({
      label: solution.label,
      timeComplexity: complexityLabel(entries[i]?.time, entries[i]?.timeQualifier),
      spaceComplexity: complexityLabel(entries[i]?.space, entries[i]?.spaceQualifier),
      stepCount: counts[i],
      isGrounded: entries[i] !== null,
    }));
  });

  protected readonly isShown = computed(() => this.meta().solutions.length > 1);
}
