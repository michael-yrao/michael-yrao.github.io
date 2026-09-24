import { Routes } from '@angular/router';

import { GamesComponent } from './games.component';

export const GAMES_ROUTES: Routes = [
  { path: '', component: GamesComponent },
  {
    path: 'flood-fill',
    loadComponent: () =>
      import('./flood-fill/flood-fill.component').then((m) => m.FloodFillComponent),
  },
  {
    path: 'maze',
    loadComponent: () => import('./maze/maze.component').then((m) => m.MazeComponent),
  },
  {
    // Pattern Sense and Big-O moved to the /quiz feature; keep the old URLs alive.
    path: 'pattern-sense',
    pathMatch: 'full',
    redirectTo: '/quiz/pattern-sense',
  },
  {
    path: 'big-o',
    pathMatch: 'full',
    redirectTo: '/quiz/big-o',
  },
  {
    path: 'bisect-it',
    loadComponent: () => import('./bisect-it/bisect-it.component').then((m) => m.BisectItComponent),
  },
  {
    path: 'connect-cities',
    loadComponent: () =>
      import('./connect-cities/connect-cities.component').then((m) => m.ConnectCitiesComponent),
  },
  {
    path: 'one-stroke',
    loadComponent: () => import('./one-stroke/one-stroke.component').then((m) => m.OneStrokeComponent),
  },
];
