import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FloodFillComponent } from './flood-fill.component';

const routes: Routes = [{ path: '', component: FloodFillComponent }];

@NgModule({
    imports: [CommonModule, RouterModule.forChild(routes), FloodFillComponent],
})
export class FloodFillModule {}
