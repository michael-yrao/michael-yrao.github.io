import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ALL_ALGORITHMS } from '../../../core/data/algorithms.data';
import { CATEGORY_LABELS, Category, Difficulty } from '../../../core/models/algorithm.model';
import { PRACTICE_SECTIONS } from '../../../core/data/practice-sections';
import { PracticeService } from '../../../core/services/practice.service';
import {
  BreadcrumbEntry,
  PageHeaderComponent,
} from '../../../shared/components/page-header/page-header.component';
import { LibrarySubnavComponent } from '../../../shared/components/library-subnav/library-subnav.component';
import { PRACTICE_GLYPH } from '../../progress/practice-link';
import { injectPracticeContract } from '../practice-contract';
import {
  CatalogueEntry,
  CatalogueFilters,
  buildCatalogue,
  filterCatalogue,
} from '../practice-catalogue';

/** Tags shown on a row when the Tags filter is on. */
const TAGS_PER_ROW = 2;

@Component({
  selector: 'app-practice-list',
  templateUrl: './practice-list.component.html',
  styleUrls: ['./practice-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgClass, PageHeaderComponent, LibrarySubnavComponent],
})
export class PracticeListComponent {
  private readonly practice = inject(PracticeService);
  private readonly contract = injectPracticeContract();

  readonly breadcrumb: BreadcrumbEntry[] = [{ label: 'Home', link: '/' }, { label: 'Practice' }];
  readonly sections = PRACTICE_SECTIONS;
  readonly difficulties: readonly (Difficulty | 'All')[] = ['All', 'Easy', 'Medium', 'Hard'];
  readonly categories = Object.keys(CATEGORY_LABELS) as Category[];
  readonly categoryLabels = CATEGORY_LABELS;
  readonly practiceGlyph = PRACTICE_GLYPH;
  readonly tagsPerRow = TAGS_PER_ROW;

  readonly invalidSlug = this.contract.invalidSlug;
  readonly status = this.contract.status;
  readonly error = this.contract.error;

  readonly difficulty = signal<Difficulty | 'All'>('All');
  readonly isRunnableOnly = signal(false);
  readonly isVisualizedOnly = signal(false);
  /** Off on every visit: not persisted. */
  readonly areTagsShown = signal(false);
  readonly category = signal<Category | null>(null);

  /** The static rows draw at once; the runnable marks wait for the contract to be ready. */
  private readonly catalogue = computed<readonly CatalogueEntry[]>(() => {
    const problems = this.status() === 'ready' ? (this.practice.data()?.problems ?? []) : [];
    return buildCatalogue(ALL_ALGORITHMS, problems);
  });

  private readonly filters = computed<CatalogueFilters>(() => ({
    difficulty: this.difficulty(),
    isRunnableOnly: this.isRunnableOnly(),
    isVisualizedOnly: this.isVisualizedOnly(),
    category: this.category(),
  }));

  readonly rows = computed(() => filterCatalogue(this.catalogue(), this.filters()));

  /** The contract's own message (bad slug or failed load), shown above the list. */
  readonly message = computed(() => {
    const invalid = this.invalidSlug();
    if (invalid) return invalid;
    return this.status() === 'error' ? this.error() : null;
  });

  toggleTags(): void {
    const next = !this.areTagsShown();
    this.areTagsShown.set(next);
    // The category chips only exist while tags are shown, so a hidden chip must not keep filtering.
    if (!next) this.category.set(null);
  }

  toggleCategory(category: Category): void {
    this.category.update((current) => (current === category ? null : category));
  }
}
