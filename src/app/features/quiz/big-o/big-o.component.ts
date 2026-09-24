import { Component, ChangeDetectionStrategy, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BigOEntry } from '../../../core/models/big-o.model';
import { BigOService } from '../../../core/services/big-o.service';
import { buildDisplay } from '../../../core/showcase/display';
import { vizRouteFor } from '../../../core/data/viz-route';
import { leetCodeUrlFor } from '../../../core/data/lc-url';
import { GOLD_STANDARD_REPO, blobUrl } from '../../../core/services/github-file.service';
import { CodeViewerComponent } from '../../../shared/components/code-viewer/code-viewer.component';
import { PageHeaderComponent, BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';
import {
  DEFAULT_FILTER,
  DeckFilter,
  DIFFICULTY_FILTERS,
  DifficultyFilter,
  RUN_CAP,
  dealDeck,
  filterDeck,
  readStoredFilter,
  writeStoredFilter,
} from './big-o-deck';

type Mode = 'quiz' | 'revealed' | 'finished';

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Quiz', link: '/quiz' },
  { label: 'Big-O Trainer' },
];

@Component({
  selector: 'app-big-o',
  templateUrl: './big-o.component.html',
  styleUrls: ['./big-o.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CodeViewerComponent, PageHeaderComponent],
})
export class BigOComponent {
  private readonly bigO = inject(BigOService);

  readonly breadcrumb = BREADCRUMB;
  readonly difficultyFilters = DIFFICULTY_FILTERS;

  readonly status = this.bigO.status;
  readonly error = this.bigO.error;

  readonly filter = signal<DeckFilter>(readStoredFilter());
  readonly pool = computed<readonly BigOEntry[]>(() =>
    filterDeck(this.bigO.data()?.entries ?? [], this.filter()),
  );
  readonly dealCount = computed(() => Math.min(this.pool().length, RUN_CAP));

  readonly deck = signal<readonly BigOEntry[]>([]);
  readonly questionIndex = signal(0);
  readonly current = computed<BigOEntry | null>(() => this.deck()[this.questionIndex()] ?? null);
  readonly rows = computed(() => {
    const entry = this.current();
    return entry ? buildDisplay(entry) : [];
  });

  readonly selectedTime = signal<string | null>(null);
  readonly selectedSpace = signal<string | null>(null);
  readonly mode = signal<Mode>('quiz');
  readonly timeScore = signal(0);
  readonly spaceScore = signal(0);

  readonly canCheck = computed(() => this.selectedTime() !== null && this.selectedSpace() !== null);
  readonly timeCorrect = computed(
    () => this.mode() === 'revealed' && this.selectedTime() === this.current()?.time,
  );
  readonly spaceCorrect = computed(
    () => this.mode() === 'revealed' && this.selectedSpace() === this.current()?.space,
  );
  readonly progressLabel = computed(() => `${this.questionIndex() + 1} / ${this.deck().length}`);
  readonly totalScore = computed(() => this.timeScore() + this.spaceScore());
  readonly maxScore = computed(() => this.deck().length * 2);
  readonly scorePercent = computed(() =>
    this.maxScore() > 0 ? Math.round((this.totalScore() / this.maxScore()) * 100) : 0,
  );

  readonly vizLink = computed(() => vizRouteFor(this.current()?.lcNumber));
  readonly leetCodeLink = computed(() =>
    leetCodeUrlFor(this.current()?.url, this.current()?.lcNumber),
  );
  /** Same construction as `GroundedCodePanelComponent.attemptBlobUrl` — the "Source on
   *  GitHub" link points at the entry's `attempt` segment, not the container/helpers. */
  readonly attemptBlobUrl = computed(() => {
    const entry = this.current();
    const attempt = entry?.segments.find((s) => s.kind === 'attempt');
    if (!entry || !attempt) return null;
    return blobUrl(GOLD_STANDARD_REPO, entry.file, attempt.startLine, attempt.endLine);
  });

  constructor() {
    this.bigO.load();

    // Deals the first run once the contract is ready. `untracked` keeps this effect
    // dependent on `status()` alone — `startRun()` itself reads `pool()` (which depends on
    // `filter()`/`data()`), and without `untracked` those reads would also become effect
    // dependencies, re-running `startRun()` on every filter change in addition to the
    // explicit call already made by `setDifficulty`/`toggleMisses`/`resetFilter`. Same
    // pattern as `progress-page.component.ts`'s constructor effect.
    effect(() => {
      const status = this.bigO.status();
      if (status === 'ready') untracked(() => this.startRun());
    });
  }

  startRun(): void {
    this.deck.set(dealDeck(this.pool(), Math.random, RUN_CAP));
    this.questionIndex.set(0);
    this.selectedTime.set(null);
    this.selectedSpace.set(null);
    this.mode.set('quiz');
    this.timeScore.set(0);
    this.spaceScore.set(0);
  }

  pickTime(opt: string): void {
    if (this.mode() === 'revealed') return;
    this.selectedTime.set(opt);
  }

  pickSpace(opt: string): void {
    if (this.mode() === 'revealed') return;
    this.selectedSpace.set(opt);
  }

  check(): void {
    const current = this.current();
    if (!this.canCheck() || !current) return;
    this.mode.set('revealed');
    if (this.selectedTime() === current.time) this.timeScore.update((s) => s + 1);
    if (this.selectedSpace() === current.space) this.spaceScore.update((s) => s + 1);
  }

  next(): void {
    if (this.mode() !== 'revealed') return;
    if (this.questionIndex() + 1 >= this.deck().length) {
      this.mode.set('finished');
      return;
    }
    this.questionIndex.update((i) => i + 1);
    this.selectedTime.set(null);
    this.selectedSpace.set(null);
    this.mode.set('quiz');
  }

  setDifficulty(difficulty: DifficultyFilter): void {
    this.applyFilter({ ...this.filter(), difficulty });
  }

  toggleMisses(): void {
    this.applyFilter({ ...this.filter(), missesOnly: !this.filter().missesOnly });
  }

  resetFilter(): void {
    this.applyFilter(DEFAULT_FILTER);
  }

  retry(): void {
    this.bigO.load(true);
  }

  private applyFilter(next: DeckFilter): void {
    this.filter.set(next);
    writeStoredFilter(next);
    this.startRun();
  }
}
