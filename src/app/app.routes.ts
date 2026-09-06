import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
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
    path: '**',
    redirectTo: '',
  },
];
