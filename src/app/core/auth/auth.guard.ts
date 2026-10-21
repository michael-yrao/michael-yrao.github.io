import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const SIGNED_OUT_LANDING = '/signin';
const HOME_PATH = '/';

/** The Progress page needs a signed-in viewer; with the GitHub App off the site behaves as it did before sign-in. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isEnabled || auth.isSignedIn()) return true;
  return inject(Router).parseUrl(SIGNED_OUT_LANDING);
};

/** The sign-in page is only for a signed-out viewer of a site with the GitHub App on. */
export const signedOutGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.isEnabled && !auth.isSignedIn()) return true;
  return inject(Router).parseUrl(HOME_PATH);
};
