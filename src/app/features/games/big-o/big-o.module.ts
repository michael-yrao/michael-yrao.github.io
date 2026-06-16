import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { SharedModule } from '../../../shared/shared.module';
import { BigOComponent } from './big-o.component';

const routes: Routes = [{ path: '', component: BigOComponent }];

@NgModule({
  declarations: [BigOComponent],
  imports: [CommonModule, RouterModule.forChild(routes), SharedModule],
})
export class BigOModule {}
