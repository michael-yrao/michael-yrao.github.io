import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  ALGORITHMS_BY_CATEGORY, ALL_ALGORITHMS, hasVisualization, countVisualized,
} from '../../../core/data/algorithms.data';
import { AlgorithmMeta, Category, CATEGORY_LABELS, CATEGORY_ICONS, Difficulty } from '../../../core/models/algorithm.model';

interface CategoryCard {
  id: Category;
  label: string;
  icon: string;
  total: number;
  visualized: number;
}

type ViewMode = 'categories' | 'all';

@Component({
  selector: 'app-algorithms-list',
  templateUrl: './algorithms-list.component.html',
  styleUrls: ['./algorithms-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlgorithmsListComponent implements OnInit, OnDestroy {
  category: Category | null = null;
  filterDifficulty: Difficulty | 'All' = 'All';
  filterVisualized = false;
  viewMode: ViewMode = 'categories';

  allProblems: AlgorithmMeta[] = [];
  readonly difficulties: (Difficulty | 'All')[] = ['All', 'Easy', 'Medium', 'Hard'];
  readonly CATEGORY_LABELS = CATEGORY_LABELS;

  readonly categoryCards: CategoryCard[] = (Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => {
    const problems = ALGORITHMS_BY_CATEGORY[cat] ?? [];
    return {
      id: cat,
      label: CATEGORY_LABELS[cat],
      icon: CATEGORY_ICONS[cat],
      total: problems.length,
      visualized: countVisualized(problems),
    };
  });

  readonly totalProblems = ALL_ALGORITHMS.length;
  readonly totalVisualized = countVisualized(ALL_ALGORITHMS);

  private sub = new Subscription();

  get categoryLabel(): string {
    return this.category ? CATEGORY_LABELS[this.category] : 'All Algorithms';
  }

  get filtered(): AlgorithmMeta[] {
    return this.allProblems.filter((p) => {
      if (this.filterDifficulty !== 'All' && p.difficulty !== this.filterDifficulty) return false;
      if (this.filterVisualized && !this.hasSteps(p)) return false;
      return true;
    });
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  openProblem(p: AlgorithmMeta): void {
    this.router.navigate(['/algorithms', p.category, p.id]);
  }

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((params) => {
      const cat = params.get('category') as Category | null;
      this.category = cat;
      this.allProblems = cat ? (ALGORITHMS_BY_CATEGORY[cat] ?? []) : ALL_ALGORITHMS;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  setDifficulty(d: Difficulty | 'All'): void {
    this.filterDifficulty = d;
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    this.filterDifficulty = 'All';
    this.filterVisualized = false;
  }

  hasSteps(p: AlgorithmMeta): boolean {
    return hasVisualization(p);
  }
}
