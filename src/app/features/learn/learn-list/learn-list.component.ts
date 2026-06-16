import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Category, CATEGORY_ICONS, CATEGORY_LABELS } from '../../../core/models/algorithm.model';
import { CHEAT_SHEETS } from '../../../core/data/cheat-sheets.data';
import { ALL_ALGORITHMS } from '../../../core/data/algorithms.data';

interface CategoryCard {
  category: Category;
  icon: string;
  label: string;
  whenToUse: string;
  problemCount: number;
}

@Component({
  selector: 'app-learn-list',
  templateUrl: './learn-list.component.html',
  styleUrls: ['./learn-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnListComponent {
  readonly cards: CategoryCard[] = CHEAT_SHEETS.map((sheet) => ({
    category: sheet.category,
    icon: CATEGORY_ICONS[sheet.category],
    label: CATEGORY_LABELS[sheet.category],
    whenToUse: sheet.whenToUse,
    problemCount: ALL_ALGORITHMS.filter((a) => a.category === sheet.category).length,
  }));
}
