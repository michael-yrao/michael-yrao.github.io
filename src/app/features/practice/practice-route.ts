import { UrlMatcher, UrlMatchResult, UrlSegment } from '@angular/router';

/** The tabs after `practice/<number>` that need the static algorithm (`meta`). */
export const WALKTHROUGH_TABS = ['visualizer', 'code'] as const;

export type PracticeTab = 'description' | (typeof WALKTHROUGH_TABS)[number];

const PRACTICE_SEGMENT = 'practice';
/** `practice/<number>`. */
const SEGMENTS_WITHOUT_TAB = 2;
/** `practice/<number>/visualizer` or `practice/<number>/code`. */
const SEGMENTS_WITH_TAB = 3;

/**
 * Matches `practice/:number`, `practice/:number/visualizer` and `practice/:number/code` as ONE
 * route, so switching tabs reuses the page component instance. `posParams` carries `number` and,
 * on the visualizer and code tabs, `tab`. Any other shape does not match.
 */
export const practicePageMatcher: UrlMatcher = (segments: UrlSegment[]): UrlMatchResult | null => {
  const isShapeValid =
    segments.length === SEGMENTS_WITHOUT_TAB || segments.length === SEGMENTS_WITH_TAB;
  if (!isShapeValid || segments[0].path !== PRACTICE_SEGMENT) return null;

  const [, number, tab] = segments;
  if (tab === undefined) return { consumed: segments, posParams: { number } };
  if (!WALKTHROUGH_TABS.some((walkthroughTab) => walkthroughTab === tab.path)) return null;
  return { consumed: segments, posParams: { number, tab } };
};
