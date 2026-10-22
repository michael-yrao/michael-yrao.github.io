import {
  Component,
  ChangeDetectionStrategy,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ALGORITHM_INDEX, AlgorithmIndexEntry } from '../../../core/data/algorithms.data';
import { labelFor } from '../../../core/data/family-labels';
import { loadMetaOrNull } from '../../../core/data/load-meta';
import { vizRouteFor } from '../../../core/data/viz-route';
import { AlgorithmMeta, Category, CATEGORY_LABELS } from '../../../core/models/algorithm.model';
import { PatternSenseData } from '../../../core/models/pattern-sense.model';
import {
  WeekRunState,
  advance,
  chooseFamily,
  chooseTechnique,
  correctFamily,
  correctFamilyIndex,
  correctTechniqueIndex,
  currentProblem,
  encodeResults,
  restoreCode,
  startWeekRun,
} from '../../../core/pattern-sense/week-run';
import { AuthService } from '../../../core/auth/auth.service';
import { GithubSaveService } from '../../../core/services/github-save.service';
import {
  CONTENT_REPO,
  RepoRef,
  parseRepoSlug,
} from '../../../core/services/github-file.service';
import { PatternSenseService } from '../../../core/services/pattern-sense.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PageHeaderComponent, BreadcrumbEntry } from '../../../shared/components/page-header/page-header.component';

const BREADCRUMB: BreadcrumbEntry[] = [
  { label: 'Home', link: '/' },
  { label: 'Learn', link: '/learn' },
  { label: 'Quiz', link: '/quiz' },
  { label: 'Pattern Sense' },
];

const BEST_STREAK_KEY = 'po-pattern-sense-best';
const WEEK_CODE_KEY_PREFIX = 'po-pattern-sense-week-';
const WEEK_DECK_PARAM = 'week';

type Tab = 'practice' | 'week';
type ChipState = 'idle' | 'correct' | 'wrong';
type CopyState = 'idle' | 'copied' | 'failed';

/** The `?repo=` ref; a malformed slug falls back to the author's repo. */
function refFromSlug(slug: string | null): RepoRef {
  return parseRepoSlug(slug) ?? CONTENT_REPO;
}

interface WeekChip {
  readonly index: number;
  readonly label: string;
  readonly state: ChipState;
}

function chipStateOf(index: number, pick: number | null, correct: number, isAnswered: boolean): ChipState {
  if (!isAnswered) return 'idle';
  if (index === correct) return 'correct';
  return index === pick ? 'wrong' : 'idle';
}

function readStoredCode(week: string): string | null {
  try {
    return localStorage.getItem(WEEK_CODE_KEY_PREFIX + week);
  } catch {
    return null; // storage blocked: the week simply replays
  }
}

function writeStoredCode(week: string, code: string): void {
  try {
    localStorage.setItem(WEEK_CODE_KEY_PREFIX + week, code);
  } catch {
    // storage blocked: the code is still on screen for this visit
  }
}

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
    imports: [RouterLink, NgClass, PageHeaderComponent, IconComponent]
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

  // ── This week deck ──────────────────────────────────────────
  private readonly patternSense = inject(PatternSenseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly githubSave = inject(GithubSaveService);
  private readonly auth = inject(AuthService);
  private readonly wantsWeek = this.route.snapshot.queryParamMap.get('deck') === WEEK_DECK_PARAM;

  readonly loadFailed = computed(() => this.patternSense.status() === 'error');
  readonly copyState = signal<CopyState>('idle');
  readonly saveState = this.githubSave.saveState;
  readonly login = this.auth.login;
  readonly installUrl = this.auth.installUrl;

  /** The week deck is for signed-in viewers; with the GitHub App off the tab shows as before. */
  readonly canShowWeek = computed(() => !this.auth.isEnabled || this.auth.isSignedIn());

  /** Save UI exists only for a configured app, on the viewer's own deck (not the author's fallback). */
  readonly sourceRef = computed<RepoRef | null>(() =>
    this.auth.isEnabled && !this.patternSense.isAuthorFallback()
      ? this.patternSense.sourceRef()
      : null,
  );
  /** UX only: the Worker's owner check is the real guarantee. */
  readonly isRepoOwner = computed(() => {
    const login = this.login();
    const ref = this.sourceRef();
    return login !== null && ref !== null && login.toLowerCase() === ref.owner.toLowerCase();
  });

  readonly tab = signal<Tab>('practice');
  /** The tab on screen: a signed-out viewer is always on Practice. */
  readonly activeTab = computed<Tab>(() => (this.canShowWeek() ? this.tab() : 'practice'));
  /** The published deck; null when the load failed or no deck is published this week. */
  readonly weekData = computed<PatternSenseData | null>(() => {
    const data = this.patternSense.status() === 'ready' ? this.patternSense.data() : null;
    return data !== null && data.week !== null && data.problems.length > 0 ? data : null;
  });
  readonly run = signal<WeekRunState>(startWeekRun());
  private readonly storedCode = signal<string | null>(null);

  /** The finished week's code: the stored one on a return visit, else the one just earned. */
  readonly weekCode = computed<string | null>(() => {
    const data = this.weekData();
    if (data === null) return null;
    if (this.storedCode() !== null) return this.storedCode();
    return this.run().phase === 'done' ? encodeResults(data, this.run().answers) : null;
  });

  readonly weekView = computed(() => {
    const data = this.weekData();
    const state = this.run();
    // A restored code means the week is already finished: show its end screen, not a replay.
    if (data === null || state.phase === 'done' || this.storedCode() !== null) return null;

    const problem = currentProblem(data, state);
    const family = correctFamily(data, problem);
    const familyCorrect = correctFamilyIndex(data, problem);
    const techniqueCorrect = correctTechniqueIndex(data, problem);
    const isRevealed = state.phase === 'reveal';
    const hasTechniqueStep = family.techniques.length > 1;

    return {
      problem,
      progress: `${state.index + 1} / ${data.problems.length}`,
      phase: state.phase,
      isRevealed,
      familyChips: data.families.map(
        (f, i): WeekChip => ({
          index: i + 1,
          label: labelFor(f.id),
          state: chipStateOf(i + 1, state.familyPick, familyCorrect, state.phase !== 'family'),
        }),
      ),
      techniqueChips: family.techniques.map(
        (name, i): WeekChip => ({
          index: i + 1,
          label: name,
          state: chipStateOf(i + 1, state.techniquePick, techniqueCorrect, isRevealed),
        }),
      ),
      showTechniques: hasTechniqueStep && (state.phase === 'technique' || isRevealed),
      familyLabel: labelFor(family.id),
    };
  });

  constructor() {
    this.bestStreak = Number(localStorage.getItem(BEST_STREAK_KEY) ?? 0) || 0;
    this.startRun();

    this.patternSense.load(
      refFromSlug(this.auth.resolveRepo(this.route.snapshot.queryParamMap.get('repo'))),
    );
    // Once a deck lands: restore a finished week's code, and honour `?deck=week`.
    effect(() => {
      const data = this.weekData();
      if (data === null) return;
      untracked(() => {
        this.storedCode.set(restoreCode(data, readStoredCode(data.week as string)));
        if (this.wantsWeek) this.tab.set('week');
      });
    });
  }

  showTab(tab: Tab): void {
    this.tab.set(tab);
  }

  pickFamily(index: number): void {
    const data = this.weekData();
    if (data !== null) this.run.update((state) => chooseFamily(state, data, index));
  }

  pickTechnique(index: number): void {
    const data = this.weekData();
    if (data !== null) this.run.update((state) => chooseTechnique(state, data, index));
  }

  nextWeekProblem(): void {
    const data = this.weekData();
    if (data === null) return;
    const next = advance(this.run(), data);
    this.run.set(next);
    if (next.phase === 'done') writeStoredCode(data.week as string, encodeResults(data, next.answers));
  }

  async copyCode(): Promise<void> {
    const code = this.weekCode();
    if (code === null) return;
    try {
      await navigator.clipboard.writeText(code); // throws when the clipboard is unavailable
      this.copyState.set('copied');
    } catch {
      this.copyState.set('failed');
    }
  }

  /** Returns to the same page on the week deck, where the finished week's code is restored. */
  signIn(): void {
    const weekUrl = this.router.createUrlTree([], {
      queryParams: { deck: WEEK_DECK_PARAM },
      queryParamsHandling: 'merge',
    });
    this.auth.signIn(this.router.serializeUrl(weekUrl));
  }

  saveToGithub(): void {
    const ref = this.sourceRef();
    const data = this.weekData();
    const code = this.weekCode();
    if (ref === null || data === null || code === null || !data.week) return;
    void this.githubSave.save(ref, data.week, data.vocabHash, code);
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
