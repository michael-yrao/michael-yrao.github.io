import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { MazeComponent } from './maze.component';

const routes: Routes = [{ path: '', component: MazeComponent }];

@NgModule({
  declarations: [MazeComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class MazeModule {}
