import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../../../core/auth/auth.service';
import { PracticeData, PracticeProblem } from '../../../core/models/practice.model';
import { ProblemProgress, ProgressSummary, RetiredProblem } from '../../../core/models/progress.model';
import { CONTENT_REPO, LoadStatus, RepoRef } from '../../../core/services/github-file.service';
import { PracticeService } from '../../../core/services/practice.service';
import { ProgressService } from '../../../core/services/progress.service';
import { PracticeListComponent } from './practice-list.component';

const RUN_MARK = 'app-icon svg[data-name="terminal"]';
const VISUALIZED_MARK = 'app-icon svg[data-name="hexagon"]';
const COMFORT_MARK = 'app-comfort-mark svg';
const CONTRACT_ONLY_NUMBER = 9001;
const STATIC_AND_CONTRACT_NUMBER = 20;
const STATIC_ONLY_NUMBER = 1;
const REPO_SLUG = 'Owner/cse-progress';
const REPO_REF: RepoRef = { owner: 'Owner', repo: 'cse-progress', branch: 'main' };

function progressRow(
  lcNumber: number,
  repCount: number,
  overrides: Partial<ProblemProgress> = {},
): ProblemProgress {
  return {
    lcNumber,
    title: `Problem ${lcNumber}`,
    comfort: '🟢',
    streak: 1,
    nextReview: '2999-01-01',
    repDates: Array.from({ length: repCount }, (_, i) => `2026-09-0${i + 1}`),
    ...overrides,
  } as ProblemProgress;
}

interface SetUpOptions {
  readonly isAuthorFallback?: boolean;
  /** The viewer's repo slug; null is signed out with no `?repo=`. */
  readonly repo?: string | null;
  readonly details?: readonly ProblemProgress[];
  readonly params?: Record<string, string>;
  /** The summary's trophy-case retired list (rows that left the tracker). */
  readonly retired?: readonly RetiredProblem[];
}

function problem(number: number, title: string): PracticeProblem {
  return {
    number,
    title,
    url: null,
    statement: '',
    stub: '',
    entry: { className: 'Solution', method: 'solve' },
    compare: 'exact',
    cases: [],
  };
}

function setUp(
  status: LoadStatus,
  error: string | null,
  problems: readonly PracticeProblem[],
  { isAuthorFallback = false, repo = null, details = [], params = {}, retired = [] }: SetUpOptions = {},
) {
  const data: PracticeData = { schemaVersion: 1, generatedAt: '2026-10-01', problems };
  const query = convertToParamMap(params);
  const progress = {
    data: signal({ trophyCase: { graduated: [], retired: [...retired] } } as unknown as ProgressSummary),
    details: signal<ProblemProgress[] | null>(repo === null ? null : [...details]),
    detailsStatus: signal<'idle' | 'ready'>(repo === null ? 'idle' : 'ready'),
    detailsSource: signal<RepoRef | null>(repo === null ? null : REPO_REF),
    loadSummary: vi.fn(),
    loadDetails: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [PracticeListComponent],
    providers: [
      provideRouter([]),
      {
        provide: PracticeService,
        useValue: {
          status: signal(status),
          error: signal(error),
          data: signal<PracticeData | null>(status === 'ready' ? data : null),
          ref: signal(CONTENT_REPO),
          isAuthorFallback: signal(isAuthorFallback),
          load: vi.fn(),
        },
      },
      { provide: ProgressService, useValue: progress },
      { provide: AuthService, useValue: { resolveRepo: () => repo, isSignedIn: () => false } },
      {
        provide: ActivatedRoute,
        useValue: { queryParamMap: of(query), snapshot: { queryParamMap: query } },
      },
    ],
  });
  const fixture = TestBed.createComponent(PracticeListComponent);
  fixture.detectChanges();
  return Object.assign(fixture, { progress });
}

function rows(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('li.practice-list__row'));
}

function rowNumber(row: HTMLElement): number {
  return Number(row.querySelector('.practice-list__num')?.textContent?.replace('#', ''));
}

function rowFor(root: HTMLElement, number: number): HTMLElement {
  const row = rows(root).find((r) => rowNumber(r) === number);
  if (!row) throw new Error(`no row #${number}`);
  return row;
}

function text(element: Element): string {
  return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

describe('PracticeListComponent', () => {
  it('lists static and contract problems ascending, marking the runnable and visualized ones', () => {
    const root = setUp('ready', null, [
      problem(CONTRACT_ONLY_NUMBER, 'Custom Problem'),
      problem(STATIC_AND_CONTRACT_NUMBER, 'Valid Parentheses'),
    ]).nativeElement as HTMLElement;

    const numbers = rows(root).map(rowNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(numbers.at(-1)).toBe(CONTRACT_ONLY_NUMBER);

    const both = rowFor(root, STATIC_AND_CONTRACT_NUMBER);
    expect(both.querySelector('a.practice-list__link')?.getAttribute('href')).toBe('/practice/20');
    expect(both.querySelector(RUN_MARK)).not.toBeNull();
    expect(both.querySelector(VISUALIZED_MARK)).not.toBeNull();
    expect(both.querySelector('.difficulty-badge')).not.toBeNull();

    const contractOnly = rowFor(root, CONTRACT_ONLY_NUMBER);
    expect(contractOnly.querySelector(RUN_MARK)).not.toBeNull();
    expect(contractOnly.querySelector('.difficulty-badge')).toBeNull();

    expect(rowFor(root, STATIC_ONLY_NUMBER).querySelector(RUN_MARK)).toBeNull();
  });

  it.each([
    { isAuthorFallback: true, isShown: true },
    { isAuthorFallback: false, isShown: false },
  ])('author-fallback $isAuthorFallback shows the key mark: $isShown', ({ isAuthorFallback, isShown }) => {
    const root = setUp('ready', null, [], { isAuthorFallback }).nativeElement as HTMLElement;
    expect(text(root).includes("author's problem set")).toBe(isShown);
  });

  it('shows category and tags only after Tags is pressed', () => {
    const fixture = setUp('ready', null, []);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.practice-list__cat')).toBeNull();
    expect(root.querySelector('.practice-list__tag')).toBeNull();

    const tagsButton = Array.from(root.querySelectorAll('button')).find(
      (b) => text(b) === 'Tags',
    ) as HTMLButtonElement;
    tagsButton.click();
    fixture.detectChanges();

    expect(root.querySelector('.practice-list__cat')).not.toBeNull();
    expect(root.querySelector('.practice-list__tag')).not.toBeNull();
  });

  it('search narrows the chip-filtered rows by title, and says No matches for an unknown number', () => {
    const fixture = setUp('ready', null, []);
    const root = fixture.nativeElement as HTMLElement;
    const hardButton = Array.from(root.querySelectorAll('button')).find(
      (b) => text(b) === 'Hard',
    ) as HTMLButtonElement;
    hardButton.click();
    fixture.detectChanges();

    const input = root.querySelector('app-search-box input') as HTMLInputElement;
    input.value = 'water';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(rows(root).map((r) => text(r.querySelector('.practice-list__title') as Element))).toEqual([
      'Trapping Rain Water',
      'Swim in Rising Water',
    ]);
    expect(rows(root).every((r) => r.querySelector('.badge-hard') !== null)).toBe(true);

    input.value = '99999';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(rows(root)).toHaveLength(0);
    expect(root.querySelector('.practice-list__empty')?.textContent?.trim()).toBe('No matches');
  });

  interface ProgressCase {
    name: string;
    repo: string | null;
    details: readonly ProblemProgress[];
    isLoaded: boolean;
    markedLabel: string | null;
    repsText: string | null;
  }
  const PROGRESS_CASES: readonly ProgressCase[] = [
    { name: 'signed out, no repo', repo: null, details: [], isLoaded: false, markedLabel: null, repsText: null },
    {
      name: 'with repo + details for #1',
      repo: REPO_SLUG,
      details: [progressRow(STATIC_ONLY_NUMBER, 3)],
      isLoaded: true,
      markedLabel: 'Comfort: clean, streak 1',
      repsText: '3 reps',
    },
    {
      name: 'with repo + two variant rows for #1, higher level first',
      repo: REPO_SLUG,
      details: [
        progressRow(STATIC_ONLY_NUMBER, 3, { level: 2 }),
        progressRow(STATIC_ONLY_NUMBER, 5, { level: 1, comfort: '🔴' }),
      ],
      isLoaded: true,
      markedLabel: 'Comfort: clean, streak 1',
      repsText: '3 reps',
    },
  ];

  it.each(PROGRESS_CASES)('$name', ({ repo, details, isLoaded, markedLabel, repsText }) => {
    const fixture = setUp('ready', null, [], { repo, details });
    const root = fixture.nativeElement as HTMLElement;

    expect(fixture.progress.loadSummary).toHaveBeenCalledTimes(isLoaded ? 1 : 0);
    expect(fixture.progress.loadDetails).toHaveBeenCalledTimes(isLoaded ? 1 : 0);

    const marked = rowFor(root, STATIC_ONLY_NUMBER);
    expect(marked.querySelector(COMFORT_MARK)?.getAttribute('aria-label') ?? null).toBe(markedLabel);
    expect(marked.querySelector('.practice-list__reps')?.textContent?.trim() ?? null).toBe(repsText);

    const unmarked = rowFor(root, STATIC_AND_CONTRACT_NUMBER);
    expect(unmarked.querySelector(COMFORT_MARK)).toBeNull();
    expect(unmarked.querySelector('.practice-list__reps')).toBeNull();
  });

  interface ParamCase {
    name: string;
    params: Record<string, string>;
    details?: readonly ProblemProgress[];
    retired?: readonly RetiredProblem[];
    expectRows: (numbers: number[], root: HTMLElement) => void;
  }
  const PARAM_CASES: readonly ParamCase[] = [
    {
      name: 'difficulty=Medium shows only Medium rows',
      params: { difficulty: 'Medium' },
      expectRows: (numbers, root) => {
        expect(numbers.length).toBeGreaterThan(0);
        expect(rows(root).every((r) => r.querySelector('.badge-medium') !== null)).toBe(true);
      },
    },
    {
      name: 'mine=1 shows only rows with progress',
      params: { mine: '1' },
      expectRows: (numbers) => expect(numbers).toEqual([STATIC_ONLY_NUMBER, STATIC_AND_CONTRACT_NUMBER]),
    },
    {
      name: 'comfort=clean shows only clean rows',
      params: { comfort: 'clean' },
      details: [
        progressRow(STATIC_ONLY_NUMBER, 1, { comfort: '🟢' }),
        progressRow(STATIC_AND_CONTRACT_NUMBER, 2, { comfort: '🟡' }),
      ],
      expectRows: (numbers) => expect(numbers).toEqual([STATIC_ONLY_NUMBER]),
    },
    {
      name: "mine=1&comfort=retired lists a number from the summary's retired list, and only it",
      params: { mine: '1', comfort: 'retired' },
      details: [progressRow(STATIC_AND_CONTRACT_NUMBER, 2)],
      retired: [{ lcNumber: STATIC_ONLY_NUMBER, title: 'Gone', retiredOn: '2026-04-17' }],
      expectRows: (numbers, root) => {
        expect(numbers).toEqual([STATIC_ONLY_NUMBER]);
        expect(rowFor(root, STATIC_ONLY_NUMBER).querySelector('.practice-list__reps')).toBeNull();
      },
    },
  ];

  it.each(PARAM_CASES)('query param: $name', ({ params, details, retired, expectRows }) => {
    const root = setUp('ready', null, [], {
      params,
      retired,
      repo: REPO_SLUG,
      details: details ?? [progressRow(STATIC_ONLY_NUMBER, 1), progressRow(STATIC_AND_CONTRACT_NUMBER, 2)],
    }).nativeElement as HTMLElement;

    expectRows(rows(root).map(rowNumber), root);
  });

  it('still lists the static rows, plus the message, when the contract failed', () => {
    const root = setUp('error', 'The practice contract is invalid.', []).nativeElement as HTMLElement;

    expect(root.querySelector('.practice-list__message')?.textContent?.trim()).toBe(
      'The practice contract is invalid.',
    );
    expect(rows(root).length).toBeGreaterThan(0);
    expect(rows(root).some((r) => r.querySelector(RUN_MARK) !== null)).toBe(false);
  });
});
