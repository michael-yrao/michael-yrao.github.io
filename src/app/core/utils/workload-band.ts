/** Extracted from `today-board.component.ts` (round 6) so the Activity tab's workload chart
 *  can band a day/week's DONE units by the same rule as the Overview schedule card's
 *  workload bar, instead of re-deriving it. */
export type WorkloadBand = 'Light' | 'Moderate' | 'Heavy';

// Heavy at 90% of ceiling — matches the language the schedule's own build notes already use
// ("Mon priced 8.8 over ceiling") — a day this close to the cap reads as heavy even before
// it's technically over. Below this and above the floor is the (unremarkable) Moderate band.
export const HEAVY_THRESHOLD = 0.9;

/** Bands `units` against `ceiling`/`floor` — Heavy at/above `HEAVY_THRESHOLD * ceiling`,
 *  Light at/below `floor` (when a floor is known), Moderate otherwise. `floor` is optional
 *  because not every caller has one on hand (e.g. an older contract predating it). */
export function workloadBand(units: number, ceiling: number, floor: number | null | undefined): WorkloadBand {
  if (units >= HEAVY_THRESHOLD * ceiling) return 'Heavy';
  if (floor != null && units <= floor) return 'Light';
  return 'Moderate';
}
