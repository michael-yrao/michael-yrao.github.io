import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ALGORITHM_INDEX } from '../../../core/data/algorithms.data';
import { externalJudgeUrlFor } from '../../../core/data/lc-url';
import { CATEGORY_LABELS, Category, Difficulty } from '../../../core/models/algorithm.model';
import { comfortName } from '../../../core/models/comfort';
import { ProblemProgress } from '../../../core/models/progress.model';
import { PRACTICE_SECTIONS } from '../../../core/data/practice-sections';
import { PracticeService } from '../../../core/services/practice.service';
import { ProgressService } from '../../../core/services/progress.service';
import { todayLocalISO } from '../../../core/utils/local-date';
import {
  BreadcrumbEntry,
  PageHeaderComponent,
} from '../../../shared/components/page-header/page-header.component';
import { LibrarySubnavComponent } from '../../../shared/components/library-subnav/library-subnav.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import { PRACTICE_ICON } from '../../progress/practice-link';
import { COMFORT_FILTERS, ComfortFilter, dueLabel, hasComfort, isDueOrOverdue, retiredAsProgress } from '../../progress/problem-progress';
import { ProblemTimelineComponent } from '../../progress/problem-timeline/problem-timeline.component';
import { ComfortMarkComponent } from '../../../shared/components/comfort-mark/comfort-mark.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { injectPracticeContract } from '../../../shared/utils/practice-contract';
import {
  CatalogueEntry,
  CatalogueFilters,
  buildCatalogue,
  filterCatalogue,
  searchCatalogue,
} from '../practice-catalogue';
import { rowByNumber } from '../problem-list/problem-list';

/** Tags shown on a row when the Tags filter is on. */
const TAGS_PER_ROW = 2;
const DIFFICULTY_PARAM = 'difficulty';
const COMFORT_PARAM = 'comfort';
const MINE_PARAM = 'mine';
const MINE_ON = '1';
const REPO_PARAM = 'repo';
const BRANCH_SEPARATOR = '@';
const VALID_DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard'];

/** The `difficulty` query param as a chip value; anything but Easy, Medium or Hard is `All`. */
function difficultyFromParam(raw: string | null): Difficulty | 'All' {
  return VALID_DIFFICULTIES.find((d) => d === raw) ?? 'All';
}

/** The `comfort` query param (a comfort key) as a chip value; anything but a chip's key is `all`. */
function comfortFromParam(raw: string | null): ComfortFilter {
  return COMFORT_FILTERS.find((f) => f !== 'all' && comfortName(f) === raw) ?? 'all';
}

/** `owner/repo` of a `owner/repo[@branch]` slug, lower-cased for comparison. */
function repoName(slug: string): string {
  return slug.split(BRANCH_SEPARATOR)[0].toLowerCase();
}

@Component({
  selector: 'app-practice-list',
  templateUrl: './practice-list.component.html',
  styleUrls: ['./practice-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    NgClass,
    PageHeaderComponent,
    LibrarySubnavComponent,
    SearchBoxComponent,
    IconComponent,
    ComfortMarkComponent,
    ProblemTimelineComponent,
  ],
})
export class PracticeListComponent {
  private readonly practice = inject(PracticeService);
  private readonly contract = injectPracticeContract();
  private readonly progress = inject(ProgressService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly breadcrumb: BreadcrumbEntry[] = [{ label: 'Home', link: '/' }, { label: 'Practice' }];
  readonly sections = PRACTICE_SECTIONS;
  readonly difficulties: readonly (Difficulty | 'All')[] = ['All', 'Easy', 'Medium', 'Hard'];
  readonly categories = Object.keys(CATEGORY_LABELS) as Category[];
  readonly categoryLabels = CATEGORY_LABELS;
  readonly practiceIcon = PRACTICE_ICON;
  readonly tagsPerRow = TAGS_PER_ROW;
  readonly externalJudgeUrlFor = externalJudgeUrlFor;

  readonly isAuthorFallback = this.practice.isAuthorFallback;
  readonly invalidSlug = this.contract.invalidSlug;
  readonly status = this.contract.status;
  readonly error = this.contract.error;

  readonly comfortFilters = COMFORT_FILTERS;
  readonly comfortName = comfortName;

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** `?repo=` when given, else the signed-in viewer's own repo; null means no progress to show. */
  private readonly repoSlug = computed(() => this.auth.resolveRepo(this.queryParams().get(REPO_PARAM)));

  /** The viewer's progress was asked for and has arrived, for this repo and no other. */
  protected readonly hasProgress = computed(() => {
    const slug = this.repoSlug();
    const source = this.progress.detailsSource();
    return (
      slug !== null &&
      this.progress.detailsStatus() === 'ready' &&
      source !== null &&
      `${source.owner}/${source.repo}`.toLowerCase() === repoName(slug)
    );
  });

  /** The viewer's problems by LeetCode number, plus their retired ones (🏆, from the summary's
   *  trophy case — retired rows leave the tracker); empty until their repo's details are in. */
  protected readonly progressByNumber = computed<ReadonlyMap<number, ProblemProgress>>(() => {
    const details = this.progress.details();
    if (!this.hasProgress() || details === null) return new Map();
    const retired = (this.progress.data()?.trophyCase?.retired ?? []).map(retiredAsProgress);
    return new Map([...rowByNumber(details), ...retired.map((p): [number, ProblemProgress] => [p.lcNumber, p])]);
  });

  readonly difficulty = signal<Difficulty | 'All'>(
    difficultyFromParam(this.route.snapshot.queryParamMap.get(DIFFICULTY_PARAM)),
  );
  readonly comfortFilter = signal<ComfortFilter>(
    comfortFromParam(this.route.snapshot.queryParamMap.get(COMFORT_PARAM)),
  );
  /** Numbers of the rows whose timeline is open; replaced (never mutated) on each toggle. */
  readonly expanded = signal<ReadonlySet<number>>(new Set());
  private readonly isMineOnly = computed(() => this.queryParams().get(MINE_PARAM) === MINE_ON);
  private readonly today = todayLocalISO();
  readonly isRunnableOnly = signal(false);
  readonly isVisualizedOnly = signal(false);
  /** Off on every visit: not persisted. */
  readonly areTagsShown = signal(false);
  readonly category = signal<Category | null>(null);

  /** The static rows draw at once; the runnable marks wait for the contract to be ready. */
  private readonly catalogue = computed<readonly CatalogueEntry[]>(() => {
    const problems = this.status() === 'ready' ? (this.practice.data()?.problems ?? []) : [];
    return buildCatalogue(ALGORITHM_INDEX, problems);
  });

  private readonly filters = computed<CatalogueFilters>(() => ({
    difficulty: this.difficulty(),
    isRunnableOnly: this.isRunnableOnly(),
    isVisualizedOnly: this.isVisualizedOnly(),
    category: this.category(),
  }));

  protected readonly query = signal('');

  /** Chips narrow first, then the search ranks what is left, so an exact number match stays first;
   *  the progress filters (`mine`, a comfort chip) apply on top once progress has arrived. */
  readonly rows = computed(() => {
    const searched = searchCatalogue(filterCatalogue(this.catalogue(), this.filters()), this.query());
    const comfort = this.comfortFilter();
    if (!this.hasProgress() || (comfort === 'all' && !this.isMineOnly())) return searched;
    const byNumber = this.progressByNumber();
    return searched.filter((row) => {
      const p = byNumber.get(row.number);
      return p !== undefined && hasComfort(p, comfort);
    });
  });

  /** The contract's own message (bad slug or failed load), shown above the list. */
  readonly message = computed(() => {
    const invalid = this.invalidSlug();
    if (invalid) return invalid;
    return this.status() === 'error' ? this.error() : null;
  });

  constructor() {
    // Load the viewer's progress once per repo. `untracked` keeps the service's own signal
    // reads and writes out of this effect's dependencies, so it reruns only when the repo changes.
    effect(() => {
      const slug = this.repoSlug();
      if (slug === null) return;
      untracked(() => {
        this.progress.loadSummary(slug);
        this.progress.loadDetails();
      });
    });
  }

  /** The due label for a row that is due or overdue; null for one with a review still ahead. */
  dueText(p: ProblemProgress): string | null {
    return isDueOrOverdue(p, this.today) ? dueLabel(p, this.today) : null;
  }

  isExpanded(number: number): boolean {
    return this.expanded().has(number);
  }

  toggleExpanded(number: number): void {
    const current = this.expanded();
    this.expanded.set(
      current.has(number) ? new Set([...current].filter((n) => n !== number)) : new Set([...current, number]),
    );
  }

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
