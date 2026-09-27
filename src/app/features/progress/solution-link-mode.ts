import { vizRouteFor } from '../../core/data/viz-route';

/** The ONE Solution-links setting, shared by every problem list on the page (Overview
 *  schedule, Mastery's technique list, and the Problems tab): 'site-first' prefers this
 *  site's own walkthrough (falling back to GitHub when a row has none); 'github' always sends
 *  the learner to their own solution file. Persisted per viewer, mirroring technique-view.ts's
 *  own TechniqueView storage pattern. */
export type SolutionLinkMode = 'site-first' | 'github';

export const SOLUTION_LINK_MODE_STORAGE_KEY = 'po.progress.solutionLinkMode';

/** 'github' is the only value that means GitHub-first — a missing, corrupted, or old-shape
 *  stored value all fall back to 'site-first'. A stored value must never crash the board. */
export function parseStoredMode(raw: string | null): SolutionLinkMode {
  return raw === 'github' ? 'github' : 'site-first';
}

/** Reads the persisted mode — try/catch as in technique-view.ts's readStoredView, since
 *  localStorage can throw (private mode, blocked) or simply be absent. */
export function readStoredMode(): SolutionLinkMode {
  try {
    return parseStoredMode(localStorage.getItem(SOLUTION_LINK_MODE_STORAGE_KEY));
  } catch {
    return 'site-first';
  }
}

export function writeStoredMode(mode: SolutionLinkMode): void {
  try {
    localStorage.setItem(SOLUTION_LINK_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable (private mode, blocked) — mode stays in-memory only.
  }
}

/** A row's walkthrough-route candidate, given the shared mode. In 'site-first' mode this is
 *  always just `vizRouteFor(lcNumber)`. In 'github' mode it defers to GitHub ONLY when the
 *  row actually has a GitHub URL to defer to (`githubUrl` is non-null) — otherwise a row with
 *  a walkthrough but no GitHub URL yet (no `file`, or no repo ref known yet) would show no
 *  link at all instead of falling back to the walkthrough. Every caller (today-board,
 *  technique-list, progress-page) uses this SAME rule, rather than each reimplementing it. */
export function walkthroughRouteFor(
  mode: SolutionLinkMode,
  lcNumber: number | null,
  githubUrl: string | null,
): string | null {
  const hasGithubFallback = mode === 'github' && githubUrl != null;
  return hasGithubFallback ? null : vizRouteFor(lcNumber);
}
