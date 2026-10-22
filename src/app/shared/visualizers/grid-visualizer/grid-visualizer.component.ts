import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { GridState } from '../../../core/models/algorithm.model';
import { NgClass } from '@angular/common';
import { IconComponent } from '../../components/icon/icon.component';

@Component({
    selector: 'app-grid-visualizer',
    templateUrl: './grid-visualizer.component.html',
    styleUrls: ['./grid-visualizer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, IconComponent]
})
export class GridVisualizerComponent {
  readonly state = input.required<GridState>();

  cellLabel(state: string): string {
    const labels: Record<string, string> = {
      land: '1', water: '0', empty: '0',
      visited: '✓', queued: '?',
      fresh: '◉',
    };
    return labels[state] ?? '';
  }
}
