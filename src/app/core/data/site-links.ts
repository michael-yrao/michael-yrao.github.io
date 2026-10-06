import { isDevMode } from '@angular/core';

// Every external URL the site links to lives here, so flipping cse-coach public is a
// one-line change (COACH_REPO_IS_PUBLIC) rather than a hunt through templates.
export const SITE_LINKS = {
  coach: '/coach',
  coachRepo: 'https://github.com/michael-yrao/cse-coach',
  coachAccess: 'https://github.com/michael-yrao',
  siteRepo: 'https://github.com/michael-yrao/michael-yrao.github.io',
  venmo: 'https://venmo.com/code?user_id=2215602794004480866&created=1790224797',
} as const;

/** cse-coach is invite-only while it settles; flip to true when the repo goes public. */
export const COACH_REPO_IS_PUBLIC = false;

/** The Cloudflare Worker in `worker/`: the Tech Events feed at its root and the interview directory under
 *  `interviews/`. A dev build talks to a local `wrangler dev`. Production keeps a placeholder subdomain until the
 *  worker's first deploy — nothing falls back to anything else, so it must be updated to the real `*.workers.dev`
 *  URL (or a custom route) once deployed. */
export const WORKER_API_URL = isDevMode() ? 'http://localhost:8787/' : 'https://po-api.<subdomain>.workers.dev/';

/** The Tech Events feed, served by the Worker at `WORKER_API_URL`. */
export const EVENTS_API_URL = WORKER_API_URL;

/** Interview codes resolve through the Worker's directory. On in a dev build; off in production until the worker is
 *  deployed and `WORKER_API_URL` names it, in the same edit that turns this on. While off, a code works only in the
 *  browser that created it. */
export const INTERVIEW_CODES_ENABLED = isDevMode();

/** The Events page shows a "coming soon" card while this is false, and never calls
 *  `EVENTS_API_URL`. Flip to `true` in the SAME edit that replaces the placeholder URL above,
 *  once the worker's first deploy is live. */
export const EVENTS_FEED_ENABLED = false;
