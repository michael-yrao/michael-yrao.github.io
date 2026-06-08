import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ALGORITHMS_BY_CATEGORY, ALL_ALGORITHMS } from '../../../core/data/algorithms.data';
import { AlgorithmMeta, Category, CATEGORY_LABELS, Difficulty } from '../../../core/models/algorithm.model';

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

  allProblems: AlgorithmMeta[] = [];
  readonly difficulties: (Difficulty | 'All')[] = ['All', 'Easy', 'Medium', 'Hard'];
  readonly CATEGORY_LABELS = CATEGORY_LABELS;

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

  constructor(private route: ActivatedRoute, private cdr: ChangeDetectorRef) {}

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

  hasSteps(p: AlgorithmMeta): boolean {
    return p.solutions.some((s) => s.generateSteps().length > 0);
  }
}
