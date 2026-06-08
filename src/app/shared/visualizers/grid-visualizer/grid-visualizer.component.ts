import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { GridState } from '../../../core/models/algorithm.model';

@Component({
  selector: 'app-grid-visualizer',
  templateUrl: './grid-visualizer.component.html',
  styleUrls: ['./grid-visualizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GridVisualizerComponent {
  @Input() state!: GridState;

  cellLabel(state: string): string {
    const labels: Record<string, string> = {
      land: '1', water: '0', empty: '0',
      visited: '✓', queued: '?',
      rotten: '☠', fresh: '◉',
    };
    return labels[state] ?? '';
  }
}
