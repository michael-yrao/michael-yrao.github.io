import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FloodFillComponent } from './flood-fill.component';

const routes: Routes = [{ path: '', component: FloodFillComponent }];

@NgModule({
  declarations: [FloodFillComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class FloodFillModule {}
