import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ALL_ALGORITHMS, countVisualized } from '../../core/data/algorithms.data';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly totalSolved = ALL_ALGORITHMS.length;
  readonly totalVisualized = countVisualized(ALL_ALGORITHMS);
}
