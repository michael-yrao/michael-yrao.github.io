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

/** The Tech Events feed, served by the Cloudflare Worker in `worker/`. Placeholder subdomain
 *  until the worker's first deploy — `EventsService` doesn't fall back to anything else, so
 *  this must be updated to the real `*.workers.dev` URL (or a custom route) once deployed. */
export const EVENTS_API_URL = 'https://po-events.<subdomain>.workers.dev/';

/** The Events page shows a "coming soon" card while this is false, and never calls
 *  `EVENTS_API_URL`. Flip to `true` in the SAME edit that replaces the placeholder URL above,
 *  once the worker's first deploy is live. */
export const EVENTS_FEED_ENABLED = false;
