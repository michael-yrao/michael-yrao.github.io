import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { GamesComponent } from './games.component';

const routes: Routes = [
  { path: '', component: GamesComponent },
  {
    path: 'flood-fill',
    loadChildren: () =>
      import('./flood-fill/flood-fill.module').then((m) => m.FloodFillModule),
  },
  {
    path: 'pattern-sense',
    loadChildren: () =>
      import('./pattern-sense/pattern-sense.module').then((m) => m.PatternSenseModule),
  },
];

@NgModule({
  declarations: [GamesComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class GamesModule {}
