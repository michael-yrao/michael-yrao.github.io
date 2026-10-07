import { GridCellState, GridState } from '../models/algorithm.model';
import { definedFields } from './defined-fields';

export interface GridStateOptions<T = unknown> {
  /** Text drawn inside each cell; cells carry no label when omitted. */
  cellLabel?: (cell: T, row: number, col: number) => string;
  counters?: GridState['counters'];
  legend?: GridState['legend'];
}

/** One grid cell per `source` cell; `cellState` decides each cell's state from the
 *  source cell and its row and column. */
export function gridState<T>(
  source: readonly (readonly T[])[],
  cellState: (cell: T, row: number, col: number) => GridCellState,
  options: GridStateOptions<T> = {},
): GridState {
  const { cellLabel, counters, legend } = options;
  return {
    type: 'grid',
    grid: source.map((cells, row) =>
      cells.map((cell, col) => ({
        state: cellState(cell, row, col),
        ...(cellLabel ? { label: cellLabel(cell, row, col) } : {}),
      })),
    ),
    ...definedFields({ counters, legend }),
  };
}
