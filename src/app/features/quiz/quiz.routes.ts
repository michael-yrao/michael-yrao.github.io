import { Routes } from '@angular/router';

import { QuizComponent } from './quiz.component';

export const QUIZ_ROUTES: Routes = [
  { path: '', component: QuizComponent },
  {
    path: 'pattern-sense',
    loadComponent: () =>
      import('./pattern-sense/pattern-sense.component').then((m) => m.PatternSenseComponent),
  },
  {
    path: 'big-o',
    loadComponent: () => import('./big-o/big-o.component').then((m) => m.BigOComponent),
  },
];
