import { Routes } from '@angular/router';

import { LearnListComponent } from './learn-list/learn-list.component';
import { CheatSheetComponent } from './cheat-sheet/cheat-sheet.component';

export const LEARN_ROUTES: Routes = [
  { path: '', component: LearnListComponent },
  { path: ':category', component: CheatSheetComponent },
];
