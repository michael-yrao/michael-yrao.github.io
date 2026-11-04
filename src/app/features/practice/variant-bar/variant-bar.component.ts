import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ShowcaseService } from '../../../core/services/showcase.service';
import { complexityLabel } from '../../../core/showcase/complexity-label';
import { showcaseKey } from '../../../core/showcase/showcase-key';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { WalkthroughStateService } from '../walkthrough-state.service';

/** The variant chips with the selected variant's own time and space bound beside them. Sits at
 *  the top of the Visualizer and Code tabs; a lone variant shows only its bound. */
@Component({
  selector: 'app-variant-bar',
  templateUrl: './variant-bar.component.html',
  styleUrls: ['./variant-bar.component.scss'],
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VariantBarComponent {
  protected readonly state = inject(WalkthroughStateService);
  private readonly showcase = inject(ShowcaseService);

  /** The active variant's graded bounds; a null label renders no span. */
  protected readonly bounds = computed(() => {
    const meta = this.state.meta();
    const variant = this.state.activeSolution();
    if (!meta || !variant) return null;
    const entry = this.showcase.entryFor(showcaseKey(meta, variant));
    return {
      time: complexityLabel(entry?.time, entry?.timeQualifier),
      space: complexityLabel(entry?.space, entry?.spaceQualifier),
    };
  });
}
