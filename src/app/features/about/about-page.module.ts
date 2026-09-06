import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { AboutPageComponent } from './about-page.component';

const routes: Routes = [{ path: '', component: AboutPageComponent }];

@NgModule({
    imports: [CommonModule, RouterModule.forChild(routes), AboutPageComponent],
})
export class AboutPageModule {}
