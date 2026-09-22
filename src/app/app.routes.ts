import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // Progress is the landing page. Reuse the SAME lazy chunk as the '/progress' route below
    // (both go through PROGRESS_ROUTES) so ProgressPageComponent is bundled once, not twice.
    path: '',
    loadChildren: () =>
      import('./features/progress/progress.routes').then((m) => m.PROGRESS_ROUTES),
  },
  {
    path: 'explore',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/about-page.component').then((m) => m.AboutPageComponent),
  },
  {
    path: 'algorithms',
    loadChildren: () =>
      import('./features/algorithms/algorithms.routes').then((m) => m.ALGORITHMS_ROUTES),
  },
  {
    path: 'games',
    loadChildren: () =>
      import('./features/games/games.routes').then((m) => m.GAMES_ROUTES),
  },
  {
    path: 'learn',
    loadChildren: () =>
      import('./features/learn/learn.routes').then((m) => m.LEARN_ROUTES),
  },
  {
    path: 'progress',
    loadChildren: () =>
      import('./features/progress/progress.routes').then((m) => m.PROGRESS_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
