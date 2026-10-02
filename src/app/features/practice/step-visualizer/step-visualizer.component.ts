import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ExplanationCardComponent } from '../../../shared/components/explanation-card/explanation-card.component';
import { StepControlsComponent } from '../../../shared/components/step-controls/step-controls.component';
import { ArrayVisualizerComponent } from '../../../shared/visualizers/array-visualizer/array-visualizer.component';
import { GraphVisualizerComponent } from '../../../shared/visualizers/graph-visualizer/graph-visualizer.component';
import { GridVisualizerComponent } from '../../../shared/visualizers/grid-visualizer/grid-visualizer.component';
import { LinkedListVisualizerComponent } from '../../../shared/visualizers/linked-list-visualizer/linked-list-visualizer.component';
import { TreeVisualizerComponent } from '../../../shared/visualizers/tree-visualizer/tree-visualizer.component';
import { WalkthroughStateService } from '../walkthrough-state.service';

/** The Visualizer tab: the start prompt, then the step-by-step canvas with its explanation,
 *  watched variables and step controls. Its progress lives in the page's walkthrough state. */
@Component({
  selector: 'app-step-visualizer',
  templateUrl: './step-visualizer.component.html',
  styleUrls: ['./step-visualizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ArrayVisualizerComponent,
    GridVisualizerComponent,
    LinkedListVisualizerComponent,
    TreeVisualizerComponent,
    GraphVisualizerComponent,
    ExplanationCardComponent,
    StepControlsComponent,
  ],
})
export class StepVisualizerComponent {
  protected readonly state = inject(WalkthroughStateService);
}
