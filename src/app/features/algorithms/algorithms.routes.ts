import { inject } from '@angular/core';
import { Params, RedirectFunction, Router, Routes } from '@angular/router';

import { findAlgorithm } from '../../core/data/algorithms.data';
import { vizRouteFor } from '../../core/data/viz-route';
import { CATEGORY_LABELS, Category } from '../../core/models/algorithm.model';

const PRACTICE_PATH = '/practice';

// A URL param is any string, and findAlgorithm indexes by it: only a real category may pass.
function isCategory(value: string): value is Category {
  return Object.hasOwn(CATEGORY_LABELS, value);
}

function solutionPathFor(params: Params): string {
  const { category, id } = params;
  if (!isCategory(category)) return PRACTICE_PATH;
  const algorithm = findAlgorithm(category, id);
  return (algorithm && vizRouteFor(algorithm.lcNumber)) ?? PRACTICE_PATH;
}

// '/algorithms/**' is kept only for old links: the catalogue and the problem page live under
// '/practice'. A redirect to an absolute path drops the query string (a relative one keeps it),
// so each redirect rebuilds the URL tree with the incoming query params -- `?repo=` survives.
function redirectTo(pathFor: (params: Params) => string): RedirectFunction {
  return (route) =>
    inject(Router).createUrlTree([pathFor(route.params)], { queryParams: route.queryParams });
}

export const ALGORITHMS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: redirectTo(() => PRACTICE_PATH) },
  { path: ':category', pathMatch: 'full', redirectTo: redirectTo(() => PRACTICE_PATH) },
  { path: ':category/:id', redirectTo: redirectTo(solutionPathFor) },
];
