import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { PracticeDescriptionComponent } from '../../../shared/components/practice-description/practice-description.component';
import { injectPracticeProblem } from '../practice-problem';
import { PracticeHeaderComponent } from '../practice-header/practice-header.component';
import { SolutionCodeComponent } from '../solution-code/solution-code.component';
import { StepVisualizerComponent } from '../step-visualizer/step-visualizer.component';
import { VariantBarComponent } from '../variant-bar/variant-bar.component';
import { WalkthroughStateService } from '../walkthrough-state.service';

/** The problem's description above its walkthrough: variant bar, then the visualizer and the
 *  grounded code as two panels the learner toggles. */
@Component({
  selector: 'app-solution-page',
  templateUrl: './solution-page.component.html',
  styleUrls: ['./solution-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PracticeHeaderComponent,
    PracticeDescriptionComponent,
    VariantBarComponent,
    StepVisualizerComponent,
    SolutionCodeComponent,
  ],
  providers: [WalkthroughStateService],
})
export class SolutionPageComponent {
  protected readonly walkthrough = inject(WalkthroughStateService);

  private readonly view = injectPracticeProblem();
  readonly ref = this.view.ref;
  readonly invalidSlug = this.view.invalidSlug;
  readonly rawNumber = this.view.rawNumber;
  readonly contractStatus = this.view.contractStatus;
  readonly error = this.view.error;
  readonly contractMessage = this.view.contractMessage;
  readonly number = this.view.number;
  readonly problem = this.view.problem;
  readonly entry = this.view.entry;
  readonly meta = this.view.meta;
  readonly hasProblem = this.view.hasProblem;
  readonly title = this.view.title;
  readonly titleUrl = this.view.titleUrl;
  readonly neighbors = this.view.neighbors;

  readonly hasBothPanels = computed(
    () => this.walkthrough.isVizShown() && this.walkthrough.isCodeShown(),
  );

  constructor() {
    this.walkthrough.connect(this.meta);
  }
}
