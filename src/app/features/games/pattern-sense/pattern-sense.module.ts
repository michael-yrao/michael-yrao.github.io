import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { PatternSenseComponent } from './pattern-sense.component';

const routes: Routes = [{ path: '', component: PatternSenseComponent }];

@NgModule({
  declarations: [PatternSenseComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
})
export class PatternSenseModule {}
