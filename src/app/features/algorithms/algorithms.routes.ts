import { Routes } from '@angular/router';

import { AlgorithmsListComponent } from './algorithms-list/algorithms-list.component';

export const ALGORITHMS_ROUTES: Routes = [
  { path: '', component: AlgorithmsListComponent },
  { path: ':category', component: AlgorithmsListComponent },
  {
    path: ':category/:id',
    loadComponent: () =>
      import('../problem/problem-page/problem-page.component').then(
        (m) => m.ProblemPageComponent,
      ),
  },
];
