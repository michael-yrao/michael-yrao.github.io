import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // Progress is the landing page, and the only route that loads PROGRESS_ROUTES —
    // '/progress' below redirects here instead of loading the same chunk a second time.
    path: '',
    loadChildren: () =>
      import('./features/progress/progress.routes').then((m) => m.PROGRESS_ROUTES),
  },
  {
    path: 'library',
    loadComponent: () =>
      import('./features/library/library-hub.component').then((m) => m.LibraryHubComponent),
  },
  {
    path: 'explore',
    redirectTo: 'library',
  },
  {
    path: 'coach',
    loadComponent: () =>
      import('./features/coach/coach-page.component').then((m) => m.CoachPageComponent),
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
    path: 'quiz',
    loadChildren: () =>
      import('./features/quiz/quiz.routes').then((m) => m.QUIZ_ROUTES),
  },
  {
    path: 'learn',
    loadChildren: () =>
      import('./features/learn/learn.routes').then((m) => m.LEARN_ROUTES),
  },
  {
    path: 'events',
    loadChildren: () =>
      import('./features/events/events.routes').then((m) => m.EVENTS_ROUTES),
  },
  {
    // '/progress' is the same page as '/', kept only for old links: redirect
    // rather than loading PROGRESS_ROUTES a second time. A string redirectTo
    // keeps query params (?repo=); see app.routes.spec.ts.
    path: 'progress',
    pathMatch: 'full',
    redirectTo: '',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
