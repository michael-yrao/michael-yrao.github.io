import { ArrayState, CellState, Pointer } from '../models/algorithm.model';
import { definedFields } from './defined-fields';

export type ArrayCellValue = number | string;

export interface ArrayStateOptions<V extends ArrayCellValue = ArrayCellValue> {
  /** State of the cell at `index`; every cell is `'default'` when omitted. */
  cellState?: (index: number, value: V) => CellState;
  pointers?: Pointer[];
  arrayLabel?: string;
  hashmap?: ArrayState['hashmap'];
  hashmapLabel?: string;
  counters?: ArrayState['counters'];
  stackItems?: ArrayState['stackItems'];
}

const DEFAULT_CELL_STATE: CellState = 'default';

export function arrayState<V extends ArrayCellValue>(values: readonly V[], options: ArrayStateOptions<V> = {}): ArrayState {
  const { cellState = () => DEFAULT_CELL_STATE, pointers = [], arrayLabel, hashmap, hashmapLabel, counters, stackItems } = options;
  return {
    type: 'array',
    cells: values.map((value, index) => ({ value, state: cellState(index, value) })),
    pointers,
    ...definedFields({ arrayLabel, hashmap, hashmapLabel, counters, stackItems }),
  };
}
