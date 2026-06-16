import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Category, CATEGORY_ICONS, CATEGORY_LABELS } from '../../../core/models/algorithm.model';
import { CHEAT_SHEETS, CheatSheet, CATEGORY_ORDER } from '../../../core/data/cheat-sheets.data';

@Component({
  selector: 'app-cheat-sheet',
  templateUrl: './cheat-sheet.component.html',
  styleUrls: ['./cheat-sheet.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheatSheetComponent implements OnInit {
  sheet: CheatSheet | null = null;
  icon = '';
  label = '';
  prevCategory: Category | null = null;
  nextCategory: Category | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const category = params.get('category') as Category;
      this.load(category);
      this.cdr.markForCheck();
    });
  }

  labelFor(cat: Category): string {
    return CATEGORY_LABELS[cat];
  }

  private load(category: Category): void {
    this.sheet = CHEAT_SHEETS.find((s) => s.category === category) ?? null;
    if (!this.sheet) {
      this.router.navigate(['/learn']);
      return;
    }
    this.icon = CATEGORY_ICONS[category];
    this.label = CATEGORY_LABELS[category];

    const idx = CATEGORY_ORDER.indexOf(category);
    this.prevCategory = idx > 0 ? CATEGORY_ORDER[idx - 1] : null;
    this.nextCategory = idx < CATEGORY_ORDER.length - 1 ? CATEGORY_ORDER[idx + 1] : null;
  }
}
