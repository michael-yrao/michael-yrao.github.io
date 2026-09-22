// Every coach-related URL the site links to lives here, so flipping cse-coach public is a
// one-line change (COACH_REPO_IS_PUBLIC) rather than a hunt through templates.
export const SITE_LINKS = {
  coach: '/coach',
  coachRepo: 'https://github.com/michael-yrao/cse-coach',
  coachAccess: 'https://github.com/michael-yrao',
  siteRepo: 'https://github.com/michael-yrao/michael-yrao.github.io',
} as const;

/** cse-coach is invite-only while it settles; flip to true when the repo goes public. */
export const COACH_REPO_IS_PUBLIC = false;
