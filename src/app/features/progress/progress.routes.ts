import { Routes } from '@angular/router';

export const PROGRESS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./progress-page/progress-page.component').then((m) => m.ProgressPageComponent),
  },
];
