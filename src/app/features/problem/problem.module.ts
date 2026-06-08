import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../shared/shared.module';
import { ProblemPageComponent } from './problem-page/problem-page.component';

const routes: Routes = [{ path: '', component: ProblemPageComponent }];

@NgModule({
  declarations: [ProblemPageComponent],
  imports: [CommonModule, RouterModule.forChild(routes), SharedModule],
})
export class ProblemModule {}
