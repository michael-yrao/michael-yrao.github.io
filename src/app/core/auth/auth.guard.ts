import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const SIGNED_OUT_LANDING = '/practice';

/** The Progress page needs a signed-in viewer; with the GitHub App off the site behaves as it did before sign-in. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (!auth.isEnabled || auth.isSignedIn()) return true;
  return inject(Router).parseUrl(SIGNED_OUT_LANDING);
};
