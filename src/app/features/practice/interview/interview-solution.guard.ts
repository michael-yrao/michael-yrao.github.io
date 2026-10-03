import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { isCandidateParams } from './interview-params';

/** Keeps a candidate off `/practice/:number/solution`: they go back to the problem, with the same
 *  query params (so `join` and `repo` survive). Built from the snapshot, never `preserve`, which
 *  reads the previous URL's params on a direct navigation. */
export const interviewSolutionGuard: CanActivateFn = (route) => {
  if (!isCandidateParams(route.queryParamMap)) return true;
  return inject(Router).createUrlTree(['/practice', route.paramMap.get('number')], {
    queryParams: route.queryParams,
  });
};
