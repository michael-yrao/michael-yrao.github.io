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
    path: 'pattern-sense',
    loadComponent: () =>
      import('./pattern-sense/pattern-sense.component').then((m) => m.PatternSenseComponent),
  },
  {
    path: 'maze',
    loadComponent: () => import('./maze/maze.component').then((m) => m.MazeComponent),
  },
  {
    path: 'big-o',
    loadComponent: () => import('./big-o/big-o.component').then((m) => m.BigOComponent),
  },
];
