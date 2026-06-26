import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ALL_ALGORITHMS } from '../../../core/data/algorithms.data';
import { AlgorithmMeta, Category, CATEGORY_LABELS } from '../../../core/models/algorithm.model';

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
  'dynamic-programming':
    'Cue: overlapping subproblems + optimal substructure → memoize the recursion or tabulate bottom-up.',
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
})
export class PatternSenseComponent {
  readonly categoryLabels = CATEGORY_LABELS;
  readonly options: CategoryOption[] = (Object.keys(CATEGORY_LABELS) as Category[]).map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
  }));

  deck: AlgorithmMeta[] = [];
  roundIndex = 0;
  current: AlgorithmMeta | null = null;

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

  get recognitionCue(): string {
    return this.current ? RECOGNITION_CUES[this.current.category] : '';
  }

  get progressLabel(): string {
    return `${this.roundIndex + 1} / ${this.deck.length}`;
  }

  startRun(): void {
    this.deck = this.shuffle([...ALL_ALGORITHMS]);
    this.roundIndex = 0;
    this.streak = 0;
    this.correctCount = 0;
    this.answeredCount = 0;
    this.finished = false;
    this.current = this.deck[0] ?? null;
    this.selected = null;
    this.revealed = false;
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
    this.current = this.deck[this.roundIndex];
    this.selected = null;
    this.revealed = false;
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
