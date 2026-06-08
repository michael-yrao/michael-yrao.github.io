import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ALGORITHMS_BY_CATEGORY } from '../../core/data/algorithms.data';
import { Category, CATEGORY_LABELS, CATEGORY_ICONS } from '../../core/models/algorithm.model';

interface CategoryCard {
  id: Category;
  label: string;
  icon: string;
  total: number;
  visualized: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly cards: CategoryCard[] = (Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => {
    const problems = ALGORITHMS_BY_CATEGORY[cat] ?? [];
    return {
      id: cat,
      label: CATEGORY_LABELS[cat],
      icon: CATEGORY_ICONS[cat],
      total: problems.length,
      visualized: problems.filter((p) => p.solutions.some((s) => s.generateSteps().length > 0)).length,
    };
  });

  readonly totalSolved = Object.values(ALGORITHMS_BY_CATEGORY).flat().length;
  readonly totalVisualized = Object.values(ALGORITHMS_BY_CATEGORY)
    .flat()
    .filter((p) => p.solutions.some((s) => s.generateSteps().length > 0)).length;
}
