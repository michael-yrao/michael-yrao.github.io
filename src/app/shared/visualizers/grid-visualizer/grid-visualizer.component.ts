import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { GridState } from '../../../core/models/algorithm.model';
import { NgClass } from '@angular/common';
import { IconComponent } from '../../components/icon/icon.component';

/** The class that draws a heavier rule after `index` when `index` closes a box but is not the
 *  last of `count`; null otherwise. */
function boxRule(index: number, count: number, boxSize: number | undefined, className: string): string | null {
  if (boxSize === undefined) return null;
  const isBoxEdge = (index + 1) % boxSize === 0 && index + 1 < count;
  return isBoxEdge ? className : null;
}

/** The box-edge classes for the cell at (`row`, `col`) of a `rowCount` x `colCount` grid. */
export function boxEdgeClasses(
  row: number,
  col: number,
  rowCount: number,
  colCount: number,
  boxSize: number | undefined,
): string[] {
  return [
    boxRule(col, colCount, boxSize, 'gv__cell--box-right'),
    boxRule(row, rowCount, boxSize, 'gv__cell--box-bottom'),
  ].filter((name): name is string => name !== null);
}

@Component({
    selector: 'app-grid-visualizer',
    templateUrl: './grid-visualizer.component.html',
    styleUrls: ['./grid-visualizer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, IconComponent]
})
export class GridVisualizerComponent {
  readonly state = input.required<GridState>();

  cellClasses(state: string, row: number, col: number): string[] {
    const { grid, boxSize } = this.state();
    return [`gv__cell--${state}`, ...boxEdgeClasses(row, col, grid.length, grid[row].length, boxSize)];
  }

  cellLabel(state: string): string {
    const labels: Record<string, string> = {
      land: '1', water: '0', empty: '0',
      visited: '✓', queued: '?',
      fresh: '◉',
    };
    return labels[state] ?? '';
  }
}
