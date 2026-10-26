import { isDevMode } from '@angular/core';

// Every external URL the site links to lives here, so flipping cse-coach public is a
// one-line change (COACH_REPO_IS_PUBLIC) rather than a hunt through templates.
export const SITE_LINKS = {
  coach: '/coach',
  coachRepo: 'https://github.com/michael-yrao/cse-coach',
  coachAccess: 'https://github.com/michael-yrao',
  venmo: 'https://venmo.com/code?user_id=2215602794004480866&created=1790224797',
} as const;

/** The one GitHub login the site coach serves; the Worker's `OWNER_LOGIN` is the same value. */
export const COACH_OWNER_LOGIN = 'michael-yrao';

/** The public content repo (`owner/name`): a mirror of the solution files and the content JSON (practice, showcase,
 *  big-o, cheat sheets, pattern-sense deck). */
export const CONTENT_REPO_SLUG = 'michael-yrao/progressive-overflow-content';

/** The public demo repo (`owner/name`): the synthetic board (progress summary, progress, schedule history). */
export const DEMO_REPO_SLUG = 'michael-yrao/progressive-overflow-demo';

/** GitHub logins are case-insensitive, and so is the Worker's owner check. */
export function isCoachOwner(login: string | null | undefined): boolean {
  if (!login) return false;
  return login.toLowerCase() === COACH_OWNER_LOGIN.toLowerCase();
}

/** cse-coach is invite-only while it settles; flip to true when the repo goes public. `/start` onboarding (the
 *  Worker's `/onboard/dsa`) also depends on the template's visibility: while it is private, only collaborators can
 *  create a repo from it. */
export const COACH_REPO_IS_PUBLIC = false;

/** The Cloudflare Worker in `worker/`: the Tech Events feed at its root and the interview directory under
 *  `interviews/`. A dev build talks to a local `wrangler dev`; production talks to the deployed worker (first
 *  deployed 2026-10-06). Nothing falls back to anything else, so a redeploy under a new subdomain or a custom route
 *  must update this URL. */
export const WORKER_API_URL = isDevMode() ? 'http://localhost:8787/' : 'https://po-api.po-api.workers.dev/';

/** The Progressive Overflow GitHub App; its sign-in routes are served by the Worker at `WORKER_API_URL` (see
 *  worker/README.md). Sign-in and "Save to GitHub" stay off while any value starts with `REPLACE_WITH_`. */
export const GITHUB_APP = {
  clientId: 'Iv23liBo5xiEhlT4mPOg',
  appSlug: 'progressive-overflow',
};

/** The Tech Events feed, served by the Worker at `WORKER_API_URL`. */
export const EVENTS_API_URL = WORKER_API_URL;

/** Interview codes resolve through the Worker's directory at `WORKER_API_URL`. Turned on 2026-10-06 with the worker's
 *  first deploy; while off, a code works only in the browser that created it. */
export const INTERVIEW_CODES_ENABLED = true;

/** The Events page shows a "coming soon" card while this is false, and never calls
 *  `EVENTS_API_URL`. Turned on 2026-10-06 with the worker's first deploy. */
export const EVENTS_FEED_ENABLED = true;
