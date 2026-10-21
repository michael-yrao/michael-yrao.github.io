import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const SIGNED_OUT_LANDING = '/';
const REPO_PARAM = 'repo';

function hasRepoParam(router: Router): boolean {
  const queryParams = router.getCurrentNavigation()?.extractedUrl.queryParams;
  return Boolean(queryParams?.[REPO_PARAM]);
}

/**
 * The Progress board matches `/` for a signed-in viewer, with the GitHub App off, or for a
 * `?repo=` link (anyone can view a shared board); otherwise `/` falls through to the landing page.
 */
export const progressMatch: CanMatchFn = () => {
  const auth = inject(AuthService);
  if (!auth.isEnabled || auth.isSignedIn()) return true;
  return hasRepoParam(inject(Router));
};
