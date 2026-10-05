import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { lockedProblem } from './candidate-lock';

/** Keeps a candidate off /practice/:number/solution for the problem their interview was imported from: they
 *  go back to the problem, with the same query params (so epo survives). Only the candidate lock decides, so a
 *  reload without ?join= stays shut. Built from the snapshot, never preserve, which reads the previous URL's
 *  params on a direct navigation. */
export const interviewSolutionGuard: CanActivateFn = (route) => {
  const number = route.paramMap.get('number');
  if (lockedProblem() !== Number(number)) return true;
  return inject(Router).createUrlTree(['/practice', number], {
    queryParams: route.queryParams,
  });
};