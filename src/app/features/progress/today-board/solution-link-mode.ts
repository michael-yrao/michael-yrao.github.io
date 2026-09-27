/** The Overview schedule's link-source toggle: 'site-first' prefers this site's own
 *  walkthrough (falling back to GitHub when a row has none); 'github' always sends the
 *  learner to their own solution file. Persisted per viewer, mirroring technique-view.ts's
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
