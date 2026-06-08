import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { AlgorithmsListComponent } from './algorithms-list/algorithms-list.component';

const routes: Routes = [
  { path: '', component: AlgorithmsListComponent },
  { path: ':category', component: AlgorithmsListComponent },
  {
    path: ':category/:id',
    loadChildren: () =>
      import('../problem/problem.module').then((m) => m.ProblemModule),
  },
];

@NgModule({
  declarations: [AlgorithmsListComponent],
  imports: [CommonModule, RouterModule.forChild(routes), SharedModule],
})
export class AlgorithmsModule {}
