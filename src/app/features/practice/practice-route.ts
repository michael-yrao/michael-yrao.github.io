import { UrlMatcher, UrlMatchResult, UrlSegment } from '@angular/router';

export type PracticeTab = 'description' | 'solution';

const PRACTICE_SEGMENT = 'practice';
const SOLUTION_SEGMENT = 'solution';
/** `practice/<number>`. */
const SEGMENTS_WITHOUT_TAB = 2;
/** `practice/<number>/solution`. */
const SEGMENTS_WITH_TAB = 3;

/**
 * Matches `practice/:number` and `practice/:number/solution` as ONE route, so switching tabs
 * reuses the page component instance. `posParams` carries `number` and, on the solution tab,
 * `tab`. Any other shape does not match.
 */
export const practicePageMatcher: UrlMatcher = (segments: UrlSegment[]): UrlMatchResult | null => {
  const isShapeValid =
    segments.length === SEGMENTS_WITHOUT_TAB || segments.length === SEGMENTS_WITH_TAB;
  if (!isShapeValid || segments[0].path !== PRACTICE_SEGMENT) return null;

  const [, number, tab] = segments;
  if (tab === undefined) return { consumed: segments, posParams: { number } };
  if (tab.path !== SOLUTION_SEGMENT) return null;
  return { consumed: segments, posParams: { number, tab } };
};
