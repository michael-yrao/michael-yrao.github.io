import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { lockedProblem } from './candidate-lock';
import { isCandidateParams } from './interview-params';

/** Keeps a candidate off `/practice/:number/solution`: they go back to the problem, with the same
 *  query params (so `join` and `repo` survive). A live candidate lock for this problem counts too,
 *  so a reload without `?join=` stays shut. Built from the snapshot, never `preserve`, which
 *  reads the previous URL's params on a direct navigation. */
export const interviewSolutionGuard: CanActivateFn = (route) => {
  const number = route.paramMap.get('number');
  const isLocked = lockedProblem() === Number(number);
  if (!isCandidateParams(route.queryParamMap) && !isLocked) return true;
  return inject(Router).createUrlTree(['/practice', number], {
    queryParams: route.queryParams,
  });
};
