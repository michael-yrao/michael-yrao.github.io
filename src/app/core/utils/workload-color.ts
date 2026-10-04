import { HEAVY_THRESHOLD } from './workload-band';

/** Ratio of units to ceiling at (and beyond) which the colour stops changing — the deepest
 *  "over" shade. */
export const DEEP_OVER_RATIO = 1.5;

const OVER_RATIO = 1;
const PERCENT = 100;

interface ColorStop {
  readonly ratio: number;
  readonly token: string;
}

function colorStops(ceiling: number, floor: number | null | undefined): readonly ColorStop[] {
  const floorRatio = floor != null ? floor / ceiling : 0;
  return [
    { ratio: floorRatio, token: 'var(--color-easy)' },
    { ratio: (floorRatio + HEAVY_THRESHOLD) / 2, token: 'var(--color-medium)' },
    { ratio: HEAVY_THRESHOLD, token: 'var(--color-hard)' },
    { ratio: OVER_RATIO, token: 'var(--color-over)' },
    { ratio: DEEP_OVER_RATIO, token: 'var(--color-over-deep)' },
  ];
}

function mixBetween(ratio: number, lower: ColorStop, upper: ColorStop): string {
  const progress = (ratio - lower.ratio) / (upper.ratio - lower.ratio);
  const lowerShare = Math.round((1 - progress) * PERCENT);
  return `color-mix(in oklch, ${lower.token} ${lowerShare}%, ${upper.token})`;
}

/** Colour for `units` against `ceiling`/`floor`: a continuous gradient over units / ceiling —
 *  easy at/below the floor, medium midway to `HEAVY_THRESHOLD`, hard at it, over at the
 *  ceiling, deep-over from `DEEP_OVER_RATIO` on. Exactly at (or beyond) a stop it is that
 *  stop's token; between two stops it is a `color-mix` weighted toward the nearer one.
 *  Precondition: `ceiling > 0` — callers keep their own null/zero-ceiling guards. */
export function workloadColor(units: number, ceiling: number, floor: number | null | undefined): string {
  const ratio = units / ceiling;
  const stops = colorStops(ceiling, floor);
  const upperIndex = stops.findIndex((stop) => stop.ratio >= ratio);
  if (upperIndex === -1) return stops[stops.length - 1].token;
  const upper = stops[upperIndex];
  if (upperIndex === 0 || upper.ratio === ratio) return upper.token;
  return mixBetween(ratio, stops[upperIndex - 1], upper);
}
