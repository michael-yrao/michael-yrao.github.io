import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { StepControlsComponent } from './components/step-controls/step-controls.component';
import { ExplanationCardComponent } from './components/explanation-card/explanation-card.component';
import { HintCardComponent } from './components/hint-card/hint-card.component';
import { CodeViewerComponent } from './components/code-viewer/code-viewer.component';
import { ArrayVisualizerComponent } from './visualizers/array-visualizer/array-visualizer.component';
import { GridVisualizerComponent } from './visualizers/grid-visualizer/grid-visualizer.component';
import { LinkedListVisualizerComponent } from './visualizers/linked-list-visualizer/linked-list-visualizer.component';
import { TreeVisualizerComponent } from './visualizers/tree-visualizer/tree-visualizer.component';
import { GraphVisualizerComponent } from './visualizers/graph-visualizer/graph-visualizer.component';

const COMPONENTS = [
  StepControlsComponent,
  ExplanationCardComponent,
  HintCardComponent,
  CodeViewerComponent,
  ArrayVisualizerComponent,
  GridVisualizerComponent,
  LinkedListVisualizerComponent,
  TreeVisualizerComponent,
  GraphVisualizerComponent,
];

@NgModule({
  declarations: COMPONENTS,
  imports: [CommonModule, RouterModule],
  exports: COMPONENTS,
})
export class SharedModule {}
