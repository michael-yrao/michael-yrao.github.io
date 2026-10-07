import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ALGORITHM_INDEX, AlgorithmIndexEntry } from '../../../core/data/algorithms.data';
import { loadMetaOrNull } from '../../../core/data/load-meta';
import { vizRouteFor } from '../../../core/data/viz-route';
import { AlgorithmMeta, Category, CATEGORY_LABELS } from '../../../core/models/algorithm.model';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { PageHeaderComponent, BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Quiz', link: '/quiz' },
  { label: 'Pattern Sense' },
];

const BEST_STREAK_KEY = 'po-pattern-sense-best';

/** Why each technique applies — shown after every answer to build recognition. */
const RECOGNITION_CUES: Record<Category, string> = {
  'arrays-hash':
    'Cue: "have I seen this before?" or counting/grouping → a hash map or set gives O(1) lookups.',
  'two-pointers':
    'Cue: sorted input, pair-finding, or in-place rearranging → walk two indices instead of nesting loops.',
  'sliding-window':
    'Cue: longest/shortest CONTIGUOUS run satisfying a constraint → grow the right edge, shrink the left.',
  'stack':
    'Cue: nested structure or "most recent first" matching → LIFO stack.',
  'binary-search':
    'Cue: sorted data, O(log n) demanded, or a monotonic yes/no answer space → halve the range each step.',
  'linked-list':
    'Cue: a chain you must re-link in place, or cycle detection → pointer surgery and fast/slow pointers.',
  'trees':
    'Cue: hierarchy questions. Level-by-level → BFS with a queue; depth, paths, ancestors → DFS recursion.',
  'graphs':
    'Cue: connectivity, regions, dependencies, or spreading → BFS/DFS flood, or topological sort for ordering.',
  'greedy':
    'Cue: a locally optimal choice that is provably safe at every step → no need to look back.',
  'heap':
    'Cue: repeatedly need the min/max, the "top k", or a running kth element → a heap (priority queue) gives O(log n) push/pop.',
  'trie':
    'Cue: prefix lookups, autocomplete, or many words sharing leading characters → a trie (prefix tree) walks one node per character.',
  'dynamic-programming':
    'Cue: overlapping subproblems + optimal substructure → memoize the recursion or tabulate bottom-up.',
  'backtracking':
    'Cue: enumerate every valid combination/permutation/subset → choose, recurse, un-choose; prune on a legality check.',
};

interface CategoryOption {
  id: Category;
  label: string;
}

@Component({
    selector: 'app-pattern-sense',
    templateUrl: './pattern-sense.component.html',
    styleUrls: ['./pattern-sense.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, NgClass, PageHeaderComponent]
})
export class PatternSenseComponent {
  readonly breadcrumb = BREADCRUMB;
  readonly categoryLabels = CATEGORY_LABELS;
  readonly options: CategoryOption[] = (Object.keys(CATEGORY_LABELS) as Category[]).map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
  }));

  deck: readonly AlgorithmIndexEntry[] = [];
  roundIndex = 0;
  current: AlgorithmIndexEntry | null = null;
  /** The dealt card's full algorithm (description, constraints); null until its chunk loads. */
  readonly loaded = signal<AlgorithmMeta | null>(null);

  selected: Category | null = null;
  revealed = false;

  streak = 0;
  bestStreak = 0;
  correctCount = 0;
  answeredCount = 0;
  finished = false;

  constructor() {
    this.bestStreak = Number(localStorage.getItem(BEST_STREAK_KEY) ?? 0) || 0;
    this.startRun();
  }

  get isCorrect(): boolean {
    return this.revealed && this.selected === this.current?.category;
  }

  get correctLabel(): string {
    return this.current ? CATEGORY_LABELS[this.current.category] : '';
  }

  /** The current problem's walkthrough route; null when the deck is empty. */
  get solutionRoute(): string | null {
    return vizRouteFor(this.current?.lcNumber);
  }

  get recognitionCue(): string {
    return this.current ? RECOGNITION_CUES[this.current.category] : '';
  }

  get progressLabel(): string {
    return `${this.roundIndex + 1} / ${this.deck.length}`;
  }

  startRun(): void {
    this.deck = this.shuffle([...ALGORITHM_INDEX]);
    this.roundIndex = 0;
    this.streak = 0;
    this.correctCount = 0;
    this.answeredCount = 0;
    this.finished = false;
    this.selected = null;
    this.revealed = false;
    this.deal();
  }

  choose(category: Category): void {
    if (this.revealed || !this.current) return;
    this.selected = category;
    this.revealed = true;
    this.answeredCount++;

    if (category === this.current.category) {
      this.correctCount++;
      this.streak++;
      if (this.streak > this.bestStreak) {
        this.bestStreak = this.streak;
        localStorage.setItem(BEST_STREAK_KEY, String(this.bestStreak));
      }
    } else {
      this.streak = 0;
    }
  }

  next(): void {
    if (!this.revealed) return;
    if (this.roundIndex + 1 >= this.deck.length) {
      this.finished = true;
      return;
    }
    this.roundIndex++;
    this.selected = null;
    this.revealed = false;
    this.deal();
  }

  /** Makes the deck's card at `roundIndex` current, loads its meta and prefetches the next
   *  card's (loads are memoized, so the next deal finds it ready). */
  private deal(): void {
    const dealt = this.deck[this.roundIndex] ?? null;
    this.current = dealt;
    this.loaded.set(null);
    void loadMetaOrNull(dealt ?? undefined).then((meta) => {
      if (this.current === dealt) this.loaded.set(meta);
    });
    void loadMetaOrNull(this.deck[this.roundIndex + 1]);
  }

  private shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
