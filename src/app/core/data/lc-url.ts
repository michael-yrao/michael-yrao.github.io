// Resolves the LeetCode link for a schedule/probe row. The real tracker URL (cse-progress
// gamify.py's problem_urls(), joined by lcNumber into ScheduleItem.url / Probe.url) is always
// preferred — it's the canonical slug straight from the tracker's markdown links. A row with
// no tracker url (the number isn't in dsa_progress.md yet, or has no lcNumber to join on)
// falls back to the number-based search/redirect URL, which needs no slug and always
// resolves to the right problem.
const SITE_HOST = 'progressiveoverflow.com';

function isSiteUrl(url: string): boolean {
  try {
    return new URL(url).host === SITE_HOST;
  } catch {
    return false;
  }
}

/** The link for a row's external ↗ slot: the judge page, or null when the judge is this site itself
 *  (an external-judge problem whose url is its own /practice page, already covered by the run slot). */
export function externalJudgeUrlFor(
  url: string | null | undefined,
  lcNumber: number | null | undefined,
): string | null {
  if (url && isSiteUrl(url)) return null;
  return leetCodeUrlFor(url, lcNumber);
}

export function leetCodeUrlFor(
  url: string | null | undefined,
  lcNumber: number | null | undefined,
): string | null {
  if (url) return url;
  if (lcNumber != null) return `https://leetcode.com/problemset/?search=${lcNumber}`;
  return null;
}
