import { TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

import { ProgressPageComponent, ProgressTab } from './progress-page.component';
import { By } from '@angular/platform-browser';
import { ProgressService } from '../../../core/services/progress.service';
import { TodayBoardComponent } from '../today-board/today-board.component';
import { GOLD_STANDARD_REPO, RepoRef } from '../../../core/services/github-file.service';
import { ProgressSummary, ProblemProgress, Comfort } from '../../../core/models/progress.model';
import { addDaysISO, todayLocalISO } from '../../../core/utils/local-date';

// A minimal, valid summary — enough for the 'ready' branch of every tab, including the two
// instant drills (techniques/studyDays ride the summary, no fetch) and the overview-first
// landing's lead tile (schedule rides the summary too). The schedule's matching day uses the
// SAME local-date function the component uses, so "today" always lines up with whatever
// date the test actually runs on. `techniques` mixes a started 'core' entry with two
// not-started entries (one above the interview-ROI line, one below) so the honest-
// denominator breadth bar has something real to tier.
function makeSummary(): ProgressSummary {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-20',
    totals: { problems: 2, solutions: 2, reps: 10 },
    pipeline: {
      blank: 0,
      shaky: 0,
      clean: { s0: 0, s1: 0, s2plus: 1, total: 1 },
      graduated: 1,
      retired: 0,
    },
    difficulty: { Easy: 1, Medium: 1, Hard: 0 },
    streak: {
      current: 3,
      longest: 5,
      lastStudyDay: '2026-09-20',
      studyDays: 10,
      restDayAllowance: 1,
    },
    coverage: { total: 56, started: 40, noGreen: 2, thin: 3, variantGaps: 1 },
    onSchedule: { totalActive: 5, dueToday: 1, overdue: 0 },
    trophyCase: {
      graduated: [{ lcNumber: 206, title: 'Reverse Linked List', difficulty: 'Easy' }],
      retired: [],
    },
    badges: [{ id: 'first-graduate', title: 'First Graduation', earned: true }],
    techniques: [
      {
        name: 'Bellman-Ford',
        family: 'advanced_graphs',
        tier: 'core',
        started: true,
        minProblems: 3,
        problemCount: 1,
        problems: [787],
        bestComfort: '🟢',
        hasGreen: true,
        thin: true,
        hasVariantGap: false,
      },
      {
        name: 'Frequency Counting',
        family: 'arrays_and_hash',
        tier: 'core',
        started: true,
        minProblems: 2,
        problemCount: 2,
        problems: [49, 242],
        bestComfort: '🎓',
        hasGreen: true,
        thin: false,
        hasVariantGap: false,
      },
      {
        name: 'Knapsack',
        family: 'dynamic_programming',
        tier: 'dp',
        started: false,
        minProblems: 3,
        problemCount: 0,
        problems: [],
        bestComfort: null,
        hasGreen: false,
        thin: false,
        hasVariantGap: false,
      },
      {
        name: 'Segment Tree Beats',
        family: 'expansion',
        tier: 'tier3',
        started: false,
        minProblems: 3,
        problemCount: 0,
        problems: [],
        bestComfort: null,
        hasGreen: false,
        thin: false,
        hasVariantGap: false,
      },
    ],
    studyDays: ['2026-09-18', '2026-09-19', '2026-09-20'],
    schedule: {
      weekOf: '2026-09-21',
      days: [
        {
          date: todayLocalISO(),
          weekday: 'Today',
          label: 'Test day',
          units: 5,
          items: [
            {
              lcNumber: 22,
              title: 'Generate Parentheses',
              technique: 'Backtracking',
              startComfort: '🔴',
              difficulty: 'Medium',
              done: false,
            },
            {
              lcNumber: 100,
              title: 'Same Tree',
              technique: 'Tree-DFS',
              startComfort: '🟢',
              difficulty: 'Easy',
              done: true,
            },
          ],
        },
      ],
    },
    effortCeiling: 8,
    effortFloor: 3,
    probes: {
      total: 8,
      cleanRate: 0.5,
      items: [
        { date: '2026-09-01', lcNumber: 1, title: 'Two Sum', technique: 'Hash Map', result: '🟢' },
        {
          date: '2026-09-08',
          lcNumber: 200,
          title: 'Number of Islands',
          technique: 'Graph-DFS',
          result: '🔴',
        },
      ],
    },
  };
}

// A stub with real signals (so the component's `readonly x = this.progress.x` field
// assignments and template bindings behave exactly as against the real service), but no
// HTTP: loadSummary/loadDetails/refresh are spies that never populate `details` or change
// `detailsStatus`, so the Problems tab's idle branch (and its manual "Explore problems"
// button) stays visible throughout unless a test explicitly flips the stub's signals.
// parseRepo is a pure method (it never touches the HttpClient the service is constructed
// with), so a real instance built with a throwaway HttpClient is safe to call just for that
// method — the stub below delegates to it instead of reimplementing its parsing rule.
const realProgressService = new ProgressService({} as never);

function makeProgressServiceStub() {
  return {
    status: signal<'idle' | 'loading' | 'ready' | 'error'>('ready'),
    error: signal<string | null>(null),
    data: signal<ProgressSummary | null>(makeSummary()),
    repoSlug: signal<string | null>('michael-yrao/cse-progress'),
    repoRef: signal<RepoRef | null>(GOLD_STANDARD_REPO),
    refreshing: signal(false),
    refreshError: signal<string | null>(null),

    detailsStatus: signal<'idle' | 'loading' | 'ready' | 'error'>('idle'),
    detailsError: signal<string | null>(null),
    detailsRefreshing: signal(false),
    details: signal<ProblemProgress[] | null>(null),

    loadSummary: vi.fn(),
    loadDetails: vi.fn(),
    refresh: vi.fn(),
    // Delegates to the REAL ProgressService.parseRepo (a pure method — it never touches the
    // HttpClient it's constructed with) rather than reimplementing its parsing rule here, so
    // the repo-picker tests exercise the actual validation the component calls, not a copy
    // of it that could drift out of sync.
    parseRepo: (raw: string | null | undefined) => realProgressService.parseRepo(raw),
  };
}

function makeActivatedRouteStub() {
  const paramMap = convertToParamMap({});
  return { queryParamMap: of(paramMap), snapshot: { queryParamMap: paramMap } };
}

// A trivial catch-all route target — every RouterLink this page renders (vizRoute links,
// the problem__status--link badge) needs SOMETHING to resolve to, or a real click on one throws an
// uncaught NG04002 ("cannot match any routes") that Vitest reports as an unhandled error
// even though the assertions themselves still pass.
@Component({ selector: 'app-blank-route-stub', template: '' })
class BlankRouteStubComponent {}

// Round 2 replaced the single "Full breakdown" toggle with a segmented tablist. Every test
// below that touches pipeline/gauges/difficulty/techniques/activity/Explore needs this
// called first to switch off the Overview tab.
function clickTab(
  fixture: { nativeElement: HTMLElement; detectChanges: () => void },
  tab: ProgressTab,
): void {
  const btn: HTMLButtonElement = fixture.nativeElement.querySelector(`#tab-${tab}`)!;
  btn.click();
  fixture.detectChanges();
}

describe('ProgressPageComponent', () => {
  let progress: ReturnType<typeof makeProgressServiceStub>;

  beforeEach(() => {
    progress = makeProgressServiceStub();
    TestBed.configureTestingModule({
      imports: [ProgressPageComponent],
      providers: [
        { provide: ProgressService, useValue: progress },
        { provide: ActivatedRoute, useValue: makeActivatedRouteStub() },
        // A real (empty) router — RouterLink (vizRoute links) needs a working Router, not
        // just a navigate() stub.
        provideRouter([{ path: '**', component: BlankRouteStubComponent }]),
      ],
    });
  });

  it('renders zero app-problem-timeline elements on the landing (summary-only, no details loaded)', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const timelines = fixture.nativeElement.querySelectorAll('app-problem-timeline');
    expect(timelines.length).toBe(0);
  });

  it('renders no <h1> in the ready state (the nav already says "Progress")', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')).toBeFalsy();
  });

  it('an app-today-board trend emission calls the stubbed loadDetails()', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const title: HTMLButtonElement = fixture.nativeElement.querySelector(
      'app-today-board .today-board__trend-btn',
    );
    expect(title).toBeTruthy();
    title.click();
    fixture.detectChanges();

    expect(progress.loadDetails).toHaveBeenCalled();
  });

  it('loads the summary (not details) on init', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    expect(progress.loadSummary).toHaveBeenCalled();
    expect(progress.loadDetails).not.toHaveBeenCalled();
  });

  // ── Overview-first landing: Today's board is the lead tile; everything else lives in a
  // tab, Overview selected by default. ────────────────────────────────────────────────
  it("renders Today's board on the landing with the correct done count, no details fetch", () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const board = fixture.nativeElement.querySelector('app-today-board');
    expect(board).toBeTruthy();
    expect(board!.textContent).toContain('1 of 2 done');
    expect(board!.textContent).toContain('Generate Parentheses');
    expect(board!.textContent).toContain('Same Tree');
    expect(progress.loadDetails).not.toHaveBeenCalled();
  });

  it('shows only the Overview tab content by default — pipeline/gauges/difficulty/Explore live elsewhere', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-segmented-bar')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.gauge')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.progress__explore')).toBeFalsy();
    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);

    const overviewTab: HTMLButtonElement = fixture.nativeElement.querySelector('#tab-overview');
    expect(overviewTab.getAttribute('aria-selected')).toBe('true');
    const masteryTab: HTMLButtonElement = fixture.nativeElement.querySelector('#tab-mastery');
    expect(masteryTab.getAttribute('aria-selected')).toBe('false');
  });

  it('the pipeline bar has no legend (round 2 item 6)', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    expect(fixture.nativeElement.querySelector('app-segmented-bar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.legend')).toBeFalsy();
  });

  // ── Round 4: the pipeline, difficulty, and breadth bars all render through the ONE
  // shared <app-segmented-bar> component instead of three bespoke markups. Round 5: the
  // breadth bar and the technique list now live in the SAME Mastery tab as the pipeline —
  // three bars total, pipeline+difficulty sharing one card, breadth in its own. ──────────
  it('difficulty mix is folded into the Mastery pipeline card, sharing the segmented-bar component', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    const bars = fixture.nativeElement.querySelectorAll('app-segmented-bar');
    expect(bars.length).toBe(3); // pipeline + difficulty (same card) + breadth (own card)
    const pipelineCard = bars[0].closest('.card');
    expect(pipelineCard).toBeTruthy();
    expect(pipelineCard!.contains(bars[1])).toBe(true);
    expect(pipelineCard!.contains(bars[2])).toBe(false);
    // No separate "Difficulty mix" h2 card heading — only the inline h3 inside the pipeline card.
    const h2s = Array.from(fixture.nativeElement.querySelectorAll('h2')) as HTMLElement[];
    expect(h2s.some((h) => h.textContent === 'Difficulty mix')).toBe(false);
  });

  it('Mastery (with the technique list folded in), Activity, and Problems tabs reveal their content on selection', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    clickTab(fixture, 'mastery');
    expect(fixture.nativeElement.querySelector('app-segmented-bar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-technique-list')).toBeTruthy();

    clickTab(fixture, 'activity');
    expect(fixture.nativeElement.querySelector('app-streak-calendar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.gauge')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-badge-grid')).toBeTruthy();

    clickTab(fixture, 'problems');
    expect(fixture.nativeElement.querySelector('.progress__explore')).toBeTruthy();
  });

  it('orders the Activity tab as calendar, gauge, Achievements, then Trophy case', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'activity');

    const panel = fixture.nativeElement.querySelector('#panel-activity')!;
    const order = ['app-streak-calendar', '.gauge', 'app-badge-grid', '.trophies'];
    const indices = order.map((sel) =>
      Array.from(panel.querySelectorAll('*')).findIndex((el) => (el as HTMLElement).matches(sel)),
    );
    expect(indices.every((i) => i >= 0)).toBe(true);
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });

  it('renders the Workload card on the Activity tab when the summary carries workload, first and before the calendar', () => {
    progress.data.set({
      ...makeSummary(),
      workload: [{ date: '2026-09-20', planned: 6, done: 5, built: 6, partial: false }],
    });
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'activity');

    const panel = fixture.nativeElement.querySelector('#panel-activity')!;
    const headings = Array.from(panel.querySelectorAll('h2')) as HTMLElement[];
    expect(headings.some((h) => h.textContent === 'Workload')).toBe(true);
    expect(fixture.nativeElement.querySelector('app-workload-chart')).toBeTruthy();

    const firstCardHeading = panel.querySelector('.card h2') as HTMLElement;
    expect(firstCardHeading.textContent).toBe('Workload');
    const workloadIndex = headings.findIndex((h) => h.textContent === 'Workload');
    const calendarIndex = headings.findIndex((h) => h.textContent === 'Study-day calendar');
    expect(calendarIndex).toBeGreaterThan(workloadIndex);
  });

  it('omits the Workload card on the Activity tab when the summary carries no workload', () => {
    // makeSummary() carries no `workload` field at all — the same "an older contract
    // predating it still renders identically" case the model's own doc comment describes.
    progress.data.set(makeSummary());
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'activity');

    const headings = Array.from(fixture.nativeElement.querySelectorAll('#panel-activity h2')) as HTMLElement[];
    expect(headings.some((h) => h.textContent === 'Workload')).toBe(false);
    expect(fixture.nativeElement.querySelector('app-workload-chart')).toBeFalsy();
  });

  it('switching to the Problems tab fetches details automatically', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    clickTab(fixture, 'problems');

    expect(progress.loadDetails).toHaveBeenCalled();
  });

  it('the manual "Explore problems" button also fetches (idle-state fallback)', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');
    progress.loadDetails.mockClear();

    const exploreBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.progress__explore');
    expect(exploreBtn).toBeTruthy();
    exploreBtn.click();

    expect(progress.loadDetails).toHaveBeenCalled();
  });

  it('mounts exactly one timeline once a row is expanded', () => {
    const problem: ProblemProgress = {
      lcNumber: 206,
      title: 'Reverse Linked List',
      url: 'https://leetcode.com/problems/reverse-linked-list/',
      difficulty: 'Easy',
      category: 'linked-list',
      comfort: '🎓',
      level: 3,
      streak: 3,
      nextReview: '2026-10-01',
      repDates: ['2026-09-01'],
      timeline: [{ date: '2026-09-01', comfort: '🎓', level: 3 }],
    };
    progress.detailsStatus.set('ready');
    progress.details.set([problem]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);

    const row: HTMLButtonElement = fixture.nativeElement.querySelector('.problem__row');
    row.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(1);
  });

  // ── Round 5: .problem__row is a role="button" div (an <a> can't nest inside a real
  // <button>), so its Enter/Space keyboard activation is hand-rolled and needs its own
  // regression coverage — a native <button> wouldn't need this. ──────────────────────
  it('expands and collapses on Enter and Space, same as a native button would', () => {
    const problem: ProblemProgress = {
      lcNumber: 206,
      title: 'Reverse Linked List',
      url: 'https://leetcode.com/problems/reverse-linked-list/',
      difficulty: 'Easy',
      category: 'linked-list',
      comfort: '🎓',
      level: 3,
      streak: 3,
      nextReview: '2026-10-01',
      repDates: ['2026-09-01'],
      timeline: [{ date: '2026-09-01', comfort: '🎓', level: 3 }],
    };
    progress.detailsStatus.set('ready');
    progress.details.set([problem]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    const row: HTMLElement = fixture.nativeElement.querySelector('.problem__row');
    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);

    row.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(1);

    row.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);
  });

  it('an Enter keydown on the problem__status link does not expand the row (stopPropagation)', () => {
    const problem: ProblemProgress = {
      lcNumber: 206,
      title: 'Reverse Linked List',
      url: 'https://leetcode.com/problems/reverse-linked-list/',
      difficulty: 'Easy',
      category: 'linked-list',
      comfort: '🎓',
      level: 3,
      streak: 3,
      nextReview: '2026-10-01',
      repDates: ['2026-09-01'],
      timeline: [{ date: '2026-09-01', comfort: '🎓', level: 3 }],
    };
    progress.detailsStatus.set('ready');
    progress.details.set([problem]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    const glyph: HTMLAnchorElement = fixture.nativeElement.querySelector('.problem__status--link');
    expect(glyph).toBeTruthy();
    glyph.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);
  });

  it('clicking the problem__status link inside the row does not toggle the row (stopPropagation)', () => {
    const problem: ProblemProgress = {
      lcNumber: 206,
      title: 'Reverse Linked List',
      url: 'https://leetcode.com/problems/reverse-linked-list/',
      difficulty: 'Easy',
      category: 'linked-list',
      comfort: '🎓',
      level: 3,
      streak: 3,
      nextReview: '2026-10-01',
      repDates: ['2026-09-01'],
      timeline: [{ date: '2026-09-01', comfort: '🎓', level: 3 }],
    };
    progress.detailsStatus.set('ready');
    progress.details.set([problem]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    const glyph: HTMLAnchorElement = fixture.nativeElement.querySelector('.problem__status--link');
    expect(glyph).toBeTruthy();
    glyph.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);
  });

  it("a Problems row's textContent never contains the technique category (recognition-gate spoiler)", () => {
    const problem: ProblemProgress = {
      lcNumber: 206,
      title: 'Reverse Linked List',
      url: 'https://leetcode.com/problems/reverse-linked-list/',
      difficulty: 'Easy',
      category: 'linked-list',
      comfort: '🎓',
      level: 3,
      streak: 3,
      nextReview: '2026-10-01',
      repDates: ['2026-09-01'],
      timeline: [{ date: '2026-09-01', comfort: '🎓', level: 3 }],
    };
    progress.detailsStatus.set('ready');
    progress.details.set([problem]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    const row: HTMLElement = fixture.nativeElement.querySelector('.problem__row');
    expect(row.textContent).not.toContain('linked-list');
  });

  it('a Problems row renders the LC number with a leading #', () => {
    const problem: ProblemProgress = {
      lcNumber: 206,
      title: 'Reverse Linked List',
      url: 'https://leetcode.com/problems/reverse-linked-list/',
      difficulty: 'Easy',
      category: 'linked-list',
      comfort: '🎓',
      level: 3,
      streak: 3,
      nextReview: '2026-10-01',
      repDates: ['2026-09-01'],
      timeline: [{ date: '2026-09-01', comfort: '🎓', level: 3 }],
    };
    progress.detailsStatus.set('ready');
    progress.details.set([problem]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    const row: HTMLElement = fixture.nativeElement.querySelector('.problem__row');
    expect(row.querySelector('.problem__num')!.textContent).toContain('#206');
  });

  it('the ↗ LeetCode link lives inside the row and does not toggle it on click (stopPropagation)', () => {
    const problem: ProblemProgress = {
      lcNumber: 206,
      title: 'Reverse Linked List',
      url: 'https://leetcode.com/problems/reverse-linked-list/',
      difficulty: 'Easy',
      category: 'linked-list',
      comfort: '🎓',
      level: 3,
      streak: 3,
      nextReview: '2026-10-01',
      repDates: ['2026-09-01'],
      timeline: [{ date: '2026-09-01', comfort: '🎓', level: 3 }],
    };
    progress.detailsStatus.set('ready');
    progress.details.set([problem]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    const row: HTMLElement = fixture.nativeElement.querySelector('.problem__row');
    const link: HTMLAnchorElement = row.querySelector('.problem__links a')!;
    expect(link).toBeTruthy();
    expect(row.contains(link)).toBe(true);

    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(row.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);
  });

  // The `src` link — the learner's own solution file (progress.json's additive `file`) on GitHub.
  function problemWithFile(file: string | null | undefined, comfort: Comfort = '🔴'): ProblemProgress {
    return {
      lcNumber: 39,
      title: 'Combination Sum',
      url: 'https://leetcode.com/problems/combination-sum/',
      difficulty: 'Medium',
      category: 'backtracking',
      comfort,
      level: 0,
      streak: 0,
      nextReview: '2026-09-26',
      repDates: ['2026-09-23'],
      timeline: [{ date: '2026-09-23', comfort, level: 0 }],
      ...(file === undefined ? {} : { file }),
    };
  }

  it('renders the status badge as a GitHub solution-file link (always ○, no comfort encoding) when the row has no walkthrough route, in the ACTIVE repo/branch (not the gold standard)', () => {
    progress.repoRef.set({ owner: 'someone', repo: 'their-log', branch: 'dev' });
    progress.detailsStatus.set('ready');
    progress.details.set([
      problemWithFile('dsa/leetcode/backtracking/39_combination_sum.py', '🔴'),
      { ...problemWithFile('dsa/leetcode/backtracking/40_combination_sum_ii.py', '🎓'), lcNumber: 40, title: 'Combination Sum II' },
    ]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    const rows = Array.from(fixture.nativeElement.querySelectorAll('.problem__row')) as HTMLElement[];
    const row39 = rows.find((r) => r.querySelector('.problem__num')?.textContent?.trim() === '#39')!;
    const row40 = rows.find((r) => r.querySelector('.problem__num')?.textContent?.trim() === '#40')!;

    const src39: HTMLAnchorElement = row39.querySelector('.problem__status--github')!;
    expect(src39).toBeTruthy();
    expect(src39.textContent?.trim()).toBe('○'); // 🔴 — no comfort encoding
    expect(src39.getAttribute('href')).toBe(
      'https://github.com/someone/their-log/blob/dev/dsa/leetcode/backtracking/39_combination_sum.py',
    );
    expect(src39.getAttribute('aria-label')).toBe('Solution source for #39 on GitHub');
    // Never labelled "Visualize"/"View solution" — it's a personal practice file, not a walkthrough.
    expect(src39.getAttribute('title')).toBe('Solution on GitHub');

    const src40: HTMLAnchorElement = row40.querySelector('.problem__status--github')!;
    expect(src40.textContent?.trim()).toBe('○'); // 🎓 — still ○, no comfort encoding
    expect(src40.getAttribute('aria-label')).toBe('Solution source for #40 on GitHub');

    // Clicking it opens GitHub, never the timeline (stopPropagation, same as ↗).
    src39.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(row39.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);
  });

  it('renders no GitHub status-badge link (plain spacer) when the contract has no file for the row (null) or predates the field (undefined), but keeps the LeetCode ↗', () => {
    progress.repoRef.set({ owner: 'someone', repo: 'their-log', branch: 'dev' });
    progress.detailsStatus.set('ready');
    progress.details.set([
      problemWithFile(null),
      { ...problemWithFile(undefined), lcNumber: 40, title: 'Combination Sum II' },
    ]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    expect(fixture.nativeElement.querySelectorAll('.problem__row').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.problem__status--github').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.problem__status--spacer').length).toBe(2);
    // ...and the LeetCode link is unaffected.
    const lcLinks = Array.from(fixture.nativeElement.querySelectorAll('.problem__links a')) as HTMLAnchorElement[];
    expect(lcLinks.length).toBe(2);
    expect(lcLinks.every((a) => a.textContent?.trim() === '↗')).toBe(true);
  });

  it('keeps the `</>` walkthrough link (never the GitHub fallback) for a row with a registered viz route, even with a `file` and a repo ref', () => {
    progress.repoRef.set({ owner: 'someone', repo: 'their-log', branch: 'dev' });
    progress.detailsStatus.set('ready');
    // lcNumber 206 (Reverse Linked List) has a real registered viz route.
    progress.details.set([
      { ...problemWithFile('dsa/leetcode/linked-list/206_reverse_linked_list.py'), lcNumber: 206, title: 'Reverse Linked List' },
    ]);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'problems');

    const row: HTMLElement = fixture.nativeElement.querySelector('.problem__row');
    const badge: HTMLAnchorElement = row.querySelector('.problem__status--link')!;
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('</>');
    expect(row.querySelector('.problem__status--github')).toBeFalsy();
  });

  it('passes the active repo ref down to <app-today-board> so board rows can build their own status-badge links', () => {
    const ref = { owner: 'someone', repo: 'their-log', branch: 'dev' };
    progress.repoRef.set(ref);
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const board = fixture.debugElement.query(By.directive(TodayBoardComponent));
    expect(board).toBeTruthy();
    expect((board.componentInstance as TodayBoardComponent).repoRef()).toEqual(ref);
  });

  // ── Mastery tab (round 5 — folded in from the removed Techniques tab): the technique
  // list + the honest, tiered denominator live alongside the pipeline. ────────────────
  it('renders the technique list on the Mastery tab, with no details fetch', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    expect(fixture.nativeElement.querySelectorAll('app-technique-list').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Bellman-Ford');
    expect(progress.loadDetails).not.toHaveBeenCalled();
  });

  it('the breadth bar tiers practiced / interview-upcoming / competitive-horizon honestly, self-labeled', () => {
    // Fixture: 2 started ('core'), 1 not-started 'dp' (above the ROI line), 1 not-started
    // 'tier3' (below the line) -> practiced=2, upcoming=1, horizon=1.
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    // Third bar in Mastery: pipeline, difficulty, then breadth.
    const bar = fixture.nativeElement.querySelectorAll('app-segmented-bar')[2];
    expect(bar.textContent).toContain('Practiced (started)');
    expect(bar.textContent).toContain('2');
    expect(bar.textContent).toContain('Interview-upcoming');
    expect(bar.textContent).toContain('Competitive-horizon');

    // Both stage bars read still-ahead → earned: horizon, then upcoming, then practiced at
    // the right edge, same direction as the pipeline's 🎓/🏆.
    const segs = Array.from(bar.querySelectorAll('.segbar__seg')) as HTMLElement[];
    expect(segs.map((s) => Array.from(s.classList).find((c) => c.startsWith('seg-')))).toEqual([
      'seg-horizon',
      'seg-upcoming',
      'seg-practiced',
    ]);
  });

  it('the pipeline and roadmap bars each carry an axis; the difficulty bar is a mix variant with a legend', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    const bars = fixture.nativeElement.querySelectorAll('app-segmented-bar');
    const [pipelineBar, difficultyBar, roadmapBar] = Array.from(bars) as HTMLElement[];

    expect(pipelineBar.querySelector('.segbar__axis')).toBeTruthy();
    expect(roadmapBar.querySelector('.segbar__axis')).toBeTruthy();

    expect(difficultyBar.querySelector('.segbar__bar--mix')).toBeTruthy();
    expect(difficultyBar.querySelector('.segbar__legend')).toBeTruthy();
  });

  it('the breadth bar shows a title and a caption explaining the interview-ROI split', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    const bar = fixture.nativeElement.querySelectorAll('app-segmented-bar')[2];
    expect(bar.querySelector('.segbar__title')?.textContent).toContain('Roadmap coverage');
    expect(bar.querySelector('.segbar__caption')?.textContent).toContain('interview-ROI');
  });

  it('the streak calendar is not present until the Activity tab is opened', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-streak-calendar').length).toBe(0);

    clickTab(fixture, 'activity');

    expect(fixture.nativeElement.querySelectorAll('app-streak-calendar').length).toBe(1);
    expect(progress.loadDetails).not.toHaveBeenCalled();
  });

  // ── The three heavy drills (pipeline / on-schedule / difficulty) now switch to the
  // Problems tab instead of scrolling to an in-page anchor. ──────────────────────────
  it('clicking a pipeline tier fetches details, sets the comfort facet, and switches to Problems', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    const seg: HTMLButtonElement = fixture.nativeElement.querySelector('.segbar__seg.seg-grad');
    expect(seg).toBeTruthy();
    seg.click();
    fixture.detectChanges();

    expect(progress.loadDetails).toHaveBeenCalled();
    expect(fixture.componentInstance.listFilter()).toEqual({ kind: 'comfort', value: '🎓' });
    expect(fixture.nativeElement.querySelector('#tab-problems').getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('clicking "Needs attention" fetches details and expands the list inline, without switching tabs', () => {
    // Fixture has overdue:0, dueToday:1 — sum > 0, so the single drill button renders.
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'activity');

    const attentionBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.gauge__drill');
    expect(attentionBtn).toBeTruthy();
    expect(attentionBtn.textContent).toContain('Needs attention');
    attentionBtn.click();
    fixture.detectChanges();

    expect(progress.loadDetails).toHaveBeenCalled();
    expect(attentionBtn.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.gauge__attention')).toBeTruthy();
    // Stays on Activity — no more jump to the Problems tab.
    expect(fixture.nativeElement.querySelector('#tab-activity').getAttribute('aria-selected')).toBe(
      'true',
    );

    // Populate details as the (idempotent) loadDetails() call would, and re-render.
    const overdue: ProblemProgress = {
      ...problemWithFile(undefined),
      lcNumber: 39,
      nextReview: addDaysISO(todayLocalISO(), -1),
    };
    const notYetDue: ProblemProgress = {
      ...problemWithFile(undefined),
      lcNumber: 40,
      title: 'Combination Sum II',
      nextReview: addDaysISO(todayLocalISO(), 1),
    };
    progress.details.set([overdue, notYetDue]);
    progress.detailsStatus.set('ready');
    fixture.detectChanges();

    const attentionList = fixture.nativeElement.querySelector('.gauge__attention')!;
    const rows = attentionList.querySelectorAll('.problem');
    expect(rows.length).toBe(1);
    expect(attentionList.textContent).toContain('1d overdue');

    // Clicking again collapses it.
    attentionBtn.click();
    fixture.detectChanges();
    expect(attentionBtn.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.gauge__attention')).toBeFalsy();
  });

  it('hides the "Needs attention" drill when nothing is overdue or due', () => {
    progress.data.set({
      ...makeSummary(),
      onSchedule: { totalActive: 5, dueToday: 0, overdue: 0 },
    });
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'activity');

    expect(fixture.nativeElement.querySelector('.gauge__drill')).toBeFalsy();
  });

  it('clicking a difficulty count fetches details, sets the difficulty facet, and switches to Problems', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    // The difficulty bar is a `mix` variant — its slim segments aren't clickable; the legend
    // row beneath it is the click target.
    const diffBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.difficulty-inline .segbar__legend-btn',
    );
    expect(diffBtn).toBeTruthy();
    diffBtn.click();
    fixture.detectChanges();

    expect(progress.loadDetails).toHaveBeenCalled();
    const facet = fixture.componentInstance.listFilter();
    expect(facet?.kind).toBe('difficulty');
    expect(fixture.nativeElement.querySelector('#tab-problems').getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  // ── 🏆 Retired never appears in details().problems[] (retired rows leave the tracker
  // entirely), so it must not drill into a comfort facet. Round 5: the Trophy Case moved
  // to the Activity tab, so clicking Retired now switches there instead of staying put —
  // no fetch, no facet, just a tab switch. ────────────────────────────────────────────
  it('clicking the 🏆 Retired segment does NOT set a facet or fetch details, and switches to Activity', () => {
    const withRetired: ProgressSummary = {
      ...makeSummary(),
      pipeline: { ...makeSummary().pipeline, retired: 1 },
      trophyCase: {
        graduated: makeSummary().trophyCase!.graduated,
        retired: [{ lcNumber: 704, title: 'Binary Search', retiredOn: '2026-08-01' }],
      },
    };
    progress.data.set(withRetired);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    const retiredSeg: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.segbar__seg.seg-retired',
    );
    expect(retiredSeg).toBeTruthy();
    retiredSeg.click();
    fixture.detectChanges();

    expect(progress.loadDetails).not.toHaveBeenCalled();
    expect(fixture.componentInstance.listFilter()).toBeNull();
    expect(fixture.nativeElement.querySelector('#tab-activity').getAttribute('aria-selected')).toBe(
      'true',
    );
    // The Trophy Case itself lives there now, retired row included.
    expect(fixture.nativeElement.querySelector('.trophy--retired')?.textContent).toContain(
      'Binary Search',
    );
  });

  // ── Keyboard nav: the tablist is a real roving-tabindex control ─────────────────────
  it('ArrowRight on the active tab moves selection to the next tab', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const overviewTab: HTMLButtonElement = fixture.nativeElement.querySelector('#tab-overview');
    overviewTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#tab-mastery').getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('ArrowLeft on the first tab wraps to the last tab (Activity, round 5)', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const overviewTab: HTMLButtonElement = fixture.nativeElement.querySelector('#tab-overview');
    overviewTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#tab-activity').getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  // ── Round 5: exactly 5 tabs — Techniques folded into Mastery ────────────────────────
  it('renders exactly 5 tabs in a fixed order, Recognition hidden until selected', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(5);
    const ids = Array.from(tabs).map((t) => (t as HTMLElement).id);
    expect(ids).toEqual([
      'tab-overview',
      'tab-mastery',
      'tab-recognition',
      'tab-problems',
      'tab-activity',
    ]);

    const recognitionTab: HTMLButtonElement =
      fixture.nativeElement.querySelector('#tab-recognition');
    expect(recognitionTab).toBeTruthy();
    expect(recognitionTab.textContent).toContain('Recognition');
    expect(recognitionTab.getAttribute('aria-selected')).toBe('false');
    expect(fixture.nativeElement.querySelector('app-recognition-panel')).toBeFalsy();

    expect(fixture.nativeElement.querySelector('#tab-techniques')).toBeFalsy();
  });

  it("switching to Recognition renders app-recognition-panel wired to the summary's probes, no fetch", () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    clickTab(fixture, 'recognition');

    const panel = fixture.nativeElement.querySelector('app-recognition-panel');
    expect(panel).toBeTruthy();
    expect(panel!.textContent).toContain('8 probes');
    expect(panel!.textContent).toContain('50% clean cold');
    expect(progress.loadDetails).not.toHaveBeenCalled();
  });

  // ── Round 3: technique minProblems + click-to-expand-problems wiring (round 5: now on
  // the Mastery tab) ───────────────────────────────────────────────────────────────────
  it("shows each technique's count/target ratio (problemCount/minProblems) on the Mastery tab", () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    const ratios = Array.from(fixture.nativeElement.querySelectorAll('.tech-row__ratio')).map(
      (el) => (el as HTMLElement).textContent,
    );
    expect(ratios).toContain('1/3');
    expect(ratios).toContain('2/2');
  });

  it('expanding a technique row calls onTechniqueExpand, which fetches details via loadDetails()', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    const row: HTMLButtonElement = fixture.nativeElement.querySelector('.tech-row__toggle');
    expect(row).toBeTruthy();
    row.click();
    fixture.detectChanges();

    expect(progress.loadDetails).toHaveBeenCalled();
  });

  // ── Round 5: loading state is a skeleton, not text ──────────────────────────────────
  it('shows a skeleton (2 tiles + 1 card) while loading, not the text "Loading progress…"', () => {
    progress.status.set('loading');
    progress.data.set(null);

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Loading progress…');
    expect(fixture.nativeElement.querySelectorAll('.skeleton__tile').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('.skeleton__card').length).toBe(1);
  });

  // ── Round 5: the generated-at line moved into the Refresh button ───────────────────
  it('removes the standalone "Generated" line; generatedAt appears in the Refresh button instead', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.progress__gen')).toBeFalsy();
    expect(fixture.nativeElement.textContent).not.toContain('Generated 2026-09-20');

    const refreshBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.progress__refresh');
    expect(refreshBtn.title).toContain('Data as of 2026-09-20');
    expect(refreshBtn.title).toContain('pull the latest from GitHub');
    // The accessible name still says "Refresh" — aria-label overrides visible text, so the
    // freshness line alone would silently drop that word for assistive tech.
    expect(refreshBtn.getAttribute('aria-label')).toContain('Refresh');
    expect(refreshBtn.getAttribute('aria-label')).toContain('data as of 2026-09-20');
  });

  it('shows a visible "as of <date>" label beside the Refresh button, not just in its title', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const asOf = fixture.nativeElement.querySelector('.progress__asof');
    expect(asOf).toBeTruthy();
    expect(asOf!.textContent).toContain('as of 2026-09-20'); // makeSummary()'s generatedAt
  });

  // ── Round 6: header "change" control + inline repo picker ──────────────────────────
  describe('default-repo notice + repo picker', () => {
    it('renders neither the removed default-repo notice nor a "Get the coach" link anywhere', () => {
      const fixture = TestBed.createComponent(ProgressPageComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.progress__notice')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('a[href="/coach"]')).toBeFalsy();
    });

    it('the header "change" control reveals the picker, and a second click hides it', () => {
      const fixture = TestBed.createComponent(ProgressPageComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.progress__picker-row')).toBeFalsy();

      const change: HTMLButtonElement =
        fixture.nativeElement.querySelector('.progress__repo-change');
      expect(change).toBeTruthy();
      change.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.progress__picker-row')).toBeTruthy();

      change.click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.progress__picker-row')).toBeFalsy();
    });

    it('the "change" control is absent while the page is in the error state', () => {
      const fixture = TestBed.createComponent(ProgressPageComponent);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.progress__repo-change')).toBeTruthy();

      progress.status.set('error');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.progress__repo-change')).toBeFalsy();
    });

    it('submitting a valid "owner/name" navigates with the repo queryParam', () => {
      const fixture = TestBed.createComponent(ProgressPageComponent);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      fixture.detectChanges();

      const change: HTMLButtonElement =
        fixture.nativeElement.querySelector('.progress__repo-change');
      change.click();
      fixture.detectChanges();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('.repo-picker__input');
      input.value = 'someone/else';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const form: HTMLFormElement = fixture.nativeElement.querySelector('.repo-picker');
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();

      expect(navigateSpy).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { repo: 'someone/else' } }),
      );
      expect(fixture.nativeElement.querySelector('.progress__hint')).toBeFalsy();
      // A successful submit also closes the picker it was opened from.
      expect(fixture.nativeElement.querySelector('.progress__picker-row')).toBeFalsy();
    });

    it('a malformed ?repo= renders the error state AND the repo picker (not just the hint)', () => {
      progress.status.set('error');
      progress.error.set("'nope' isn't a repo slug — use owner/name or owner/name@branch.");
      progress.data.set(null);
      progress.repoSlug.set(null);
      TestBed.overrideProvider(ActivatedRoute, {
        useValue: {
          queryParamMap: of(convertToParamMap({ repo: 'nope' })),
          snapshot: { queryParamMap: convertToParamMap({ repo: 'nope' }) },
        },
      });

      const fixture = TestBed.createComponent(ProgressPageComponent);
      fixture.detectChanges();

      const errorBlock = fixture.nativeElement.querySelector('.progress__error');
      expect(errorBlock).toBeTruthy();
      expect(errorBlock.textContent).toContain("isn't a repo slug");
      expect(errorBlock.querySelector('button')?.textContent).toContain('Retry');
      expect(errorBlock.querySelector('.repo-picker__input')).toBeTruthy();
      expect(errorBlock.querySelector('.repo-picker__submit')).toBeTruthy();
    });

    it('submitting an invalid entry from the error state shows exactly one hint, not two', () => {
      progress.status.set('error');
      progress.error.set("'nope' isn't a repo slug — use owner/name or owner/name@branch.");
      progress.data.set(null);
      progress.repoSlug.set(null);
      TestBed.overrideProvider(ActivatedRoute, {
        useValue: {
          queryParamMap: of(convertToParamMap({ repo: 'nope' })),
          snapshot: { queryParamMap: convertToParamMap({ repo: 'nope' }) },
        },
      });

      const fixture = TestBed.createComponent(ProgressPageComponent);
      fixture.detectChanges();

      const errorBlock = fixture.nativeElement.querySelector('.progress__error');
      const input: HTMLInputElement = errorBlock.querySelector('.repo-picker__input');
      input.value = 'still-not-valid';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const form: HTMLFormElement = errorBlock.querySelector('.repo-picker');
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();

      expect(errorBlock.querySelectorAll('.progress__hint').length).toBe(1);
    });

    it('submitting an invalid entry shows the error hint and does not navigate', () => {
      const fixture = TestBed.createComponent(ProgressPageComponent);
      const router = TestBed.inject(Router);
      const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
      fixture.detectChanges();

      const change: HTMLButtonElement =
        fixture.nativeElement.querySelector('.progress__repo-change');
      change.click();
      fixture.detectChanges();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('.repo-picker__input');
      input.value = 'not-a-valid-slug';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const form: HTMLFormElement = fixture.nativeElement.querySelector('.repo-picker');
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();

      expect(navigateSpy).not.toHaveBeenCalled();
      const hint = fixture.nativeElement.querySelector('.progress__hint');
      expect(hint?.textContent).toContain('?repo=owner/name');
    });
  });
});

// Regression test for the effect-loop bug: the constructor's
// `effect(() => this.progress.loadSummary(this.repoParam()))` used to read `loadSummary`
// INLINE inside the effect's reactive tracking. loadSummary reads `source`/`status` (making
// the effect depend on them) and then writes a brand-new `source` object on every call — a
// write that always looks like a change, re-triggering the effect. A stub with a fake
// `loadSummary()` (as used above) can never exercise this: the bug is in the REAL signal
// read/write interplay inside ProgressService, so this test wires up the actual
// ProgressService against a counting HttpClient double instead.
//
// The HTTP response deliberately NEVER resolves during the test: the loop only manifests
// while `status` is still 'loading' (the skip-check's `this.status() === 'ready'` reads
// false), which needs a real, sustained gap between issuing the request and it resolving —
// a synchronous `of()` mock resolves before the effect can ever re-run and masks the bug
// entirely. Angular flushes dirty effects synchronously as part of change detection, so with
// the request permanently pending, a real loop cascades entirely within the single
// `detectChanges()` call below — no fakeAsync/tick needed, and nothing to await. Each
// HttpClient.get() past CALL_CAP throws synchronously with a clear message, so a real loop
// fails fast instead of spinning forever.
const CALL_CAP = 5;

function makeCountingHttp() {
  const calls: string[] = [];
  return {
    calls,
    get: (url: string) => {
      calls.push(url);
      if (calls.length > CALL_CAP) {
        throw new Error(
          `Effect loop regression: HttpClient.get() called ${calls.length} times for a ` +
            `stable ?repo param (expected 1). URLs: ${calls.join(', ')}`,
        );
      }
      return new Observable(); // never emits, never completes — status can never reach 'ready'
    },
  };
}

describe('ProgressPageComponent — effect loop regression (real ProgressService)', () => {
  it('fetches the summary exactly once for a stable repo param (no infinite effect loop)', () => {
    const http = makeCountingHttp();
    TestBed.configureTestingModule({
      imports: [ProgressPageComponent],
      providers: [
        ProgressService,
        { provide: HttpClient, useValue: http },
        { provide: ActivatedRoute, useValue: makeActivatedRouteStub() },
        provideRouter([{ path: '**', component: BlankRouteStubComponent }]),
      ],
    });

    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges(); // constructs the effect and flushes it (synchronously, to stability)

    expect(http.calls.length).toBe(1);
  });
});

// Smoke test: mount with the REAL ProgressService (not a stub — see the regression test above
// for why a fake loadSummary() can't catch a wiring bug) against a call-capped counting
// HttpClient double that DOES resolve (unlike the never-emitting double above), so this
// asserts the OTHER half of the effect-loop lesson: not just "bounded call count" but "the
// landing actually renders DOM and mounting/wiring the drill-through additions throws
// nothing." Synchronous `of()` is safe here specifically because we are not testing loop
// timing — see the never-emitting double above for why timing-sensitive assertions need an
// unresolved response instead.
function makeResolvingCountingHttp() {
  const calls: string[] = [];
  const payload = makeSummary();
  return {
    calls,
    get: (url: string) => {
      calls.push(url);
      if (calls.length > CALL_CAP) {
        throw new Error(
          `Effect loop regression: HttpClient.get() called ${calls.length} times for a ` +
            `stable ?repo param (expected 1). URLs: ${calls.join(', ')}`,
        );
      }
      return of(payload);
    },
  };
}

describe('ProgressPageComponent — smoke test (real ProgressService, resolving HTTP)', () => {
  it('renders the landing DOM with a bounded fetch count and throws nothing', () => {
    const http = makeResolvingCountingHttp();
    TestBed.configureTestingModule({
      imports: [ProgressPageComponent],
      providers: [
        ProgressService,
        { provide: HttpClient, useValue: http },
        { provide: ActivatedRoute, useValue: makeActivatedRouteStub() },
        provideRouter([{ path: '**', component: BlankRouteStubComponent }]),
      ],
    });

    const fixture = TestBed.createComponent(ProgressPageComponent);
    expect(() => fixture.detectChanges()).not.toThrow();

    expect(fixture.nativeElement.querySelectorAll('.hero').length).toBeGreaterThan(0);
    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);
    expect(http.calls.length).toBeLessThanOrEqual(CALL_CAP);
    expect(http.calls.length).toBe(1);
  });
});
