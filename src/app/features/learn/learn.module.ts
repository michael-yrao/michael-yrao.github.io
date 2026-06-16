import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { LearnListComponent } from './learn-list/learn-list.component';
import { CheatSheetComponent } from './cheat-sheet/cheat-sheet.component';

const routes: Routes = [
  { path: '', component: LearnListComponent },
  { path: ':category', component: CheatSheetComponent },
];

@NgModule({
  declarations: [LearnListComponent, CheatSheetComponent],
  imports: [CommonModule, RouterModule.forChild(routes), SharedModule],
})
export class LearnModule {}
