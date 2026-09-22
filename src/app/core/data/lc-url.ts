// Resolves the LeetCode link for a schedule/probe row. The real tracker URL (cse-progress
// gamify.py's problem_urls(), joined by lcNumber into ScheduleItem.url / Probe.url) is always
// preferred — it's the canonical slug straight from the tracker's markdown links. A row with
// no tracker url (the number isn't in dsa_progress.md yet, or has no lcNumber to join on)
// falls back to the number-based search/redirect URL, which needs no slug and always
// resolves to the right problem.
export function leetCodeUrlFor(
  url: string | null | undefined,
  lcNumber: number | null | undefined,
): string | null {
  if (url) return url;
  if (lcNumber != null) return `https://leetcode.com/problemset/?search=${lcNumber}`;
  return null;
}
