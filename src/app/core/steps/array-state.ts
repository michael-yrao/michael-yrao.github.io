import { ArrayState, CellState, Pointer } from '../models/algorithm.model';
import { definedFields } from './defined-fields';

export type ArrayCellValue = number | string;

export interface ArrayStateOptions {
  /** State of the cell at `index`; every cell is `'default'` when omitted. */
  cellState?: (index: number, value: ArrayCellValue) => CellState;
  pointers?: Pointer[];
  hashmap?: ArrayState['hashmap'];
  hashmapLabel?: string;
  counters?: ArrayState['counters'];
}

const DEFAULT_CELL_STATE: CellState = 'default';

export function arrayState(values: readonly ArrayCellValue[], options: ArrayStateOptions = {}): ArrayState {
  const { cellState = () => DEFAULT_CELL_STATE, pointers = [], hashmap, hashmapLabel, counters } = options;
  return {
    type: 'array',
    cells: values.map((value, index) => ({ value, state: cellState(index, value) })),
    pointers,
    ...definedFields({ hashmap, hashmapLabel, counters }),
  };
}
