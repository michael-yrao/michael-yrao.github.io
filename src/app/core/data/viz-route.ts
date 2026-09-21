import { ALL_ALGORITHMS } from './algorithms.data';

// lcNumber -> the visualizer route on this site (if one exists). This is the viz-coverage
// join by LeetCode number that unifies the practice log (progress-page, today-board) with
// the visualizer library. Shared so both components look up the same map rather than each
// rebuilding it.
export const VIZ_ROUTE = new Map<number, string>(
  ALL_ALGORITHMS.map((a) => [a.lcNumber, `/algorithms/${a.category}/${a.id}`]),
);

export function vizRouteFor(lcNumber: number | null | undefined): string | null {
  if (lcNumber == null) return null;
  return VIZ_ROUTE.get(lcNumber) ?? null;
}
