import { Routes } from '@angular/router';

import { LearnListComponent } from './learn-list/learn-list.component';
import { CheatSheetComponent } from './cheat-sheet/cheat-sheet.component';

// /learn used to be keyed by data-structure category (10 slugs); it is now keyed by
// technique (18 slugs). This maps every old category slug to the technique that now covers
// it, so links out in the wild (and this site's own algorithm-category links) still land
// somewhere useful instead of 404ing. An empty-string target means "no single technique
// covers this category" — it redirects to the /learn landing page instead.
export const LEARN_SLUG_REDIRECTS: Record<string, string> = {
  'arrays-hash': '', // no dedicated hash-map technique page — send old links to /learn
  'two-pointers': 'two-pointer',
  'sliding-window': 'sliding-window',
  'binary-search': 'binary-search',
  'linked-list': 'in-place-reversal',
  'trees': 'tree-dfs',
  'graphs': 'topological-sort',
  'stack': 'monotonic-stack',
  'greedy': 'intervals',
  'dynamic-programming': 'memoization',
};

// Only slugs that actually changed become a redirect Route — 'sliding-window' and
// 'binary-search' map to themselves, and a self-redirect would loop forever.
const redirectRoutes: Routes = Object.entries(LEARN_SLUG_REDIRECTS)
  .filter(([oldSlug, newSlug]) => oldSlug !== newSlug)
  .map(([oldSlug, newSlug]) => ({
    path: oldSlug,
    pathMatch: 'full' as const,
    redirectTo: newSlug ? `/learn/${newSlug}` : '/learn',
  }));

export const LEARN_ROUTES: Routes = [
  { path: '', component: LearnListComponent },
  ...redirectRoutes,
  { path: ':technique', component: CheatSheetComponent },
];
