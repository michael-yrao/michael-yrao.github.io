import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ShowcaseService } from '../../../core/services/showcase.service';
import { buildDisplay } from '../../../core/showcase/display';
import { resolveSteps } from '../../../core/showcase/anchor-resolver';
import { groundednessOf } from '../../../core/showcase/groundedness';
import { showcaseKey } from '../../../core/showcase/showcase-key';
import { GroundedCodePanelComponent } from '../../../shared/components/grounded-code-panel/grounded-code-panel.component';
import { WalkthroughStateService } from '../walkthrough-state.service';

/** The Code tab: the variant's grounded solution code, with the visualizer's current step
 *  highlighted once the learner has started stepping. The page loads the showcase. */
@Component({
  selector: 'app-solution-code',
  templateUrl: './solution-code.component.html',
  styleUrls: ['./solution-code.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GroundedCodePanelComponent],
})
export class SolutionCodeComponent {
  protected readonly showcase = inject(ShowcaseService);
  protected readonly state = inject(WalkthroughStateService);

  // Showcase (grounded solution code) view, recomputed whenever the fetched contract, the
  // problem or the variant changes.
  protected readonly entry = computed(() => {
    const meta = this.state.meta();
    const variant = this.state.activeSolution();
    if (!this.showcase.data() || !meta || !variant) return null;
    return this.showcase.entryFor(showcaseKey(meta, variant));
  });
  protected readonly rows = computed(() => {
    const entry = this.entry();
    return entry ? buildDisplay(entry) : [];
  });
  private readonly resolved = computed(() => resolveSteps(this.rows(), this.state.steps()));
  protected readonly activeRange = computed(() =>
    this.state.isStarted() ? this.resolved()[this.state.currentStepIndex()]?.range : undefined,
  );
  protected readonly groundedness = computed(() => {
    const meta = this.state.meta();
    const variant = this.state.activeSolution();
    const data = this.showcase.data();
    return meta && variant && data ? groundednessOf(meta, variant, data) : null;
  });

  retryShowcase(): void {
    this.showcase.reload();
  }
}
