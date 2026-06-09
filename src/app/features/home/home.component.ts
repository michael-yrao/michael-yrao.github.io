import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ALGORITHMS_BY_CATEGORY } from '../../core/data/algorithms.data';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly totalSolved = Object.values(ALGORITHMS_BY_CATEGORY).flat().length;
  readonly totalVisualized = Object.values(ALGORITHMS_BY_CATEGORY)
    .flat()
    .filter((p) => p.solutions.some((s) => s.generateSteps().length > 0)).length;
}
