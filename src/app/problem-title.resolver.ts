import { ResolveFn } from '@angular/router';

import { findByNumber } from './core/data/algorithms.data';

const FALLBACK_TITLE = 'Practice';

function titleOf(number: string | null): string {
  return findByNumber(Number(number))?.title ?? FALLBACK_TITLE;
}

// Reads only the index entry's title: never `.load()`, so no steps chunk is pulled in.
export const problemTitleResolver: ResolveFn<string> = (route) =>
  titleOf(route.paramMap.get('number'));

export const solutionTitleResolver: ResolveFn<string> = (route) => {
  const title = titleOf(route.paramMap.get('number'));
  return title === FALLBACK_TITLE ? title : `${title} · Solution`;
};
