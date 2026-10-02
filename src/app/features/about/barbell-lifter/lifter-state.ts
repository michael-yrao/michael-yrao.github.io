export const MAX_PLATES_PER_SIDE = 4;

export interface LifterState {
  readonly plateCount: number;
  readonly isSpilling: boolean;
}

export const INITIAL_LIFTER_STATE: LifterState = { plateCount: 0, isSpilling: false };

/** One more plate per side; one click past the max spills them all and resets the bar. */
export function addPlate(state: LifterState): LifterState {
  if (state.plateCount < MAX_PLATES_PER_SIDE) {
    return { plateCount: state.plateCount + 1, isSpilling: false };
  }
  return { plateCount: 0, isSpilling: true };
}
