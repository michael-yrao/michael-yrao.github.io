import { parseStoredMode, SolutionLinkMode, walkthroughRouteFor } from './solution-link-mode';
import { vizRouteFor } from '../../core/data/viz-route';

describe('parseStoredMode', () => {
  const cases: [string, string | null, 'site-first' | 'github'][] = [
    ["'github' parses as 'github'", 'github', 'github'],
    ["'site-first' parses as 'site-first'", 'site-first', 'site-first'],
    ['null falls back to site-first', null, 'site-first'],
    ['garbage falls back to site-first', 'not-a-mode', 'site-first'],
  ];

  it.each(cases)('%s', (_label, raw, expected) => {
    expect(parseStoredMode(raw)).toBe(expected);
  });
});

describe('walkthroughRouteFor', () => {
  // lcNumber 100 (Same Tree) has a real registered walkthrough route — same fixture fact
  // today-board.component.spec.ts relies on.
  const registeredRoute = vizRouteFor(100);
  const githubUrl = 'https://github.com/someone/their-log/blob/dev/dsa/leetcode/trees/100_same_tree.py';

  const cases: [string, SolutionLinkMode, number, string | null, string | null][] = [
    ['site-first with a route returns the route', 'site-first', 100, githubUrl, registeredRoute],
    ['github with a GitHub URL returns null', 'github', 100, githubUrl, null],
    ['github with no GitHub URL falls back to the route', 'github', 100, null, registeredRoute],
    ['no route at all (unregistered number, no GitHub URL) returns null', 'github', 9999, null, null],
  ];

  it.each(cases)('%s', (_label, mode, lcNumber, url, expected) => {
    expect(walkthroughRouteFor(mode, lcNumber, url)).toBe(expected);
  });
});
