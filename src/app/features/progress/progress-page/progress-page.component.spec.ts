import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

import { ProgressPageComponent, ProgressTab } from './progress-page.component';
import { ProgressService } from '../../../core/services/progress.service';
import { ProgressSummary, ProblemProgress } from '../../../core/models/progress.model';
import { todayLocalISO } from '../../../core/utils/local-date';

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
    streak: { current: 3, longest: 5, lastStudyDay: '2026-09-20', studyDays: 10, restDayAllowance: 1 },
    coverage: { total: 56, started: 40, noGreen: 2, thin: 3, variantGaps: 1 },
    onSchedule: { totalActive: 5, dueToday: 1, overdue: 0 },
    trophyCase: {
      graduated: [{ lcNumber: 206, title: 'Reverse Linked List', difficulty: 'Easy' }],
      retired: [],
    },
    badges: [{ id: 'first-graduate', title: 'First Graduation', earned: true }],
    techniques: [
      { name: 'Bellman-Ford', family: 'advanced_graphs', tier: 'core', started: true,
        minProblems: 3, problemCount: 1, problems: [787], bestComfort: '🟢',
        hasGreen: true, thin: true, hasVariantGap: false },
      { name: 'Frequency Counting', family: 'arrays_and_hash', tier: 'core', started: true,
        minProblems: 2, problemCount: 2, problems: [49, 242], bestComfort: '🎓',
        hasGreen: true, thin: false, hasVariantGap: false },
      { name: 'Knapsack', family: 'dynamic_programming', tier: 'dp', started: false,
        minProblems: 3, problemCount: 0, problems: [], bestComfort: null,
        hasGreen: false, thin: false, hasVariantGap: false },
      { name: 'Segment Tree Beats', family: 'expansion', tier: 'tier3', started: false,
        minProblems: 3, problemCount: 0, problems: [], bestComfort: null,
        hasGreen: false, thin: false, hasVariantGap: false },
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
            { lcNumber: 22, title: 'Generate Parentheses', technique: 'Backtracking',
              startComfort: '🔴', difficulty: 'Medium', done: false },
            { lcNumber: 100, title: 'Same Tree', technique: 'Tree-DFS',
              startComfort: '🟢', difficulty: 'Easy', done: true },
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
        { date: '2026-09-08', lcNumber: 200, title: 'Number of Islands', technique: 'Graph-DFS', result: '🔴' },
      ],
    },
  };
}

// A stub with real signals (so the component's `readonly x = this.progress.x` field
// assignments and template bindings behave exactly as against the real service), but no
// HTTP: loadSummary/loadDetails/refresh are spies that never populate `details` or change
// `detailsStatus`, so the Problems tab's idle branch (and its manual "Explore problems"
// button) stays visible throughout unless a test explicitly flips the stub's signals.
function makeProgressServiceStub() {
  return {
    status: signal<'idle' | 'loading' | 'ready' | 'error'>('ready'),
    error: signal<string | null>(null),
    data: signal<ProgressSummary | null>(makeSummary()),
    repoSlug: signal<string | null>('michael-yrao/cse-progress'),
    refreshing: signal(false),
    refreshError: signal<string | null>(null),

    detailsStatus: signal<'idle' | 'loading' | 'ready' | 'error'>('idle'),
    detailsError: signal<string | null>(null),
    detailsRefreshing: signal(false),
    details: signal<ProblemProgress[] | null>(null),

    loadSummary: vi.fn(),
    loadDetails: vi.fn(),
    refresh: vi.fn(),
  };
}

function makeActivatedRouteStub() {
  const paramMap = convertToParamMap({});
  return { queryParamMap: of(paramMap), snapshot: { queryParamMap: paramMap } };
}

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
      ],
    });
  });

  it('renders zero app-problem-timeline elements on the landing (summary-only, no details loaded)', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const timelines = fixture.nativeElement.querySelectorAll('app-problem-timeline');
    expect(timelines.length).toBe(0);
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
    expect(board!.textContent).toContain('1 of 2 done today');
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
  // shared <app-segmented-bar> component instead of three bespoke markups. ──────────────
  it('difficulty mix is folded into the Mastery pipeline card, sharing the segmented-bar component', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    const bars = fixture.nativeElement.querySelectorAll('app-segmented-bar');
    expect(bars.length).toBe(2); // pipeline + difficulty, both inside the same card
    const pipelineCard = bars[0].closest('.card');
    expect(pipelineCard).toBeTruthy();
    expect(pipelineCard!.contains(bars[1])).toBe(true);
    // No separate "Difficulty mix" h2 card heading — only the inline h3 inside the pipeline card.
    const h2s = Array.from(fixture.nativeElement.querySelectorAll('h2')) as HTMLElement[];
    expect(h2s.some((h) => h.textContent === 'Difficulty mix')).toBe(false);
  });

  it('Mastery, Techniques, Activity, and Problems tabs reveal their content on selection', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    clickTab(fixture, 'mastery');
    expect(fixture.nativeElement.querySelector('app-segmented-bar')).toBeTruthy();

    clickTab(fixture, 'techniques');
    expect(fixture.nativeElement.querySelector('app-technique-list')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-segmented-bar')).toBeTruthy();

    clickTab(fixture, 'activity');
    expect(fixture.nativeElement.querySelector('app-streak-calendar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.gauge')).toBeTruthy();

    clickTab(fixture, 'problems');
    expect(fixture.nativeElement.querySelector('.progress__explore')).toBeTruthy();
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

  // ── Techniques tab: the technique list + the honest, tiered denominator ────────────
  it('renders the technique list on the Techniques tab, with no details fetch', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'techniques');

    expect(fixture.nativeElement.querySelectorAll('app-technique-list').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Bellman-Ford');
    expect(progress.loadDetails).not.toHaveBeenCalled();
  });

  it('the breadth bar tiers practiced / interview-upcoming / competitive-horizon honestly, self-labeled', () => {
    // Fixture: 2 started ('core'), 1 not-started 'dp' (above the ROI line), 1 not-started
    // 'tier3' (below the line) -> practiced=2, upcoming=1, horizon=1.
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'techniques');

    const bar = fixture.nativeElement.querySelector('app-segmented-bar')!;
    expect(bar.textContent).toContain('Practiced (started)');
    expect(bar.textContent).toContain('2');
    expect(bar.textContent).toContain('Interview-upcoming');
    expect(bar.textContent).toContain('Competitive-horizon');
  });

  it("the breadth bar shows a title and a caption explaining the interview-ROI split", () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'techniques');

    const bar = fixture.nativeElement.querySelector('app-segmented-bar')!;
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
    expect(fixture.nativeElement.querySelector('#tab-problems').getAttribute('aria-selected')).toBe('true');
  });

  it('clicking "Needs attention" fetches details, sets the schedule facet, and switches to Problems', () => {
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
    expect(fixture.componentInstance.listFilter()).toEqual({ kind: 'schedule', value: 'attention' });
    expect(fixture.nativeElement.querySelector('#tab-problems').getAttribute('aria-selected')).toBe('true');
  });

  it('hides the "Needs attention" drill when nothing is overdue or due', () => {
    progress.data.set({ ...makeSummary(), onSchedule: { totalActive: 5, dueToday: 0, overdue: 0 } });
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'activity');

    expect(fixture.nativeElement.querySelector('.gauge__drill')).toBeFalsy();
  });

  it('clicking a difficulty count fetches details, sets the difficulty facet, and switches to Problems', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'mastery');

    const diffBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.difficulty-inline .segbar__seg');
    expect(diffBtn).toBeTruthy();
    diffBtn.click();
    fixture.detectChanges();

    expect(progress.loadDetails).toHaveBeenCalled();
    const facet = fixture.componentInstance.listFilter();
    expect(facet?.kind).toBe('difficulty');
    expect(fixture.nativeElement.querySelector('#tab-problems').getAttribute('aria-selected')).toBe('true');
  });

  // ── 🏆 Retired never appears in details().problems[] (retired rows leave the tracker
  // entirely), so it must not drill into a comfort facet. Now that the Trophy Case lives
  // on the SAME (Mastery) tab as the pipeline funnel, clicking it is simply a no-op stay —
  // no fetch, no facet, no tab switch, no scrollIntoView needed. ─────────────────────────
  it('clicking the 🏆 Retired segment does NOT set a facet or fetch details, and stays on Mastery', () => {
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

    const retiredSeg: HTMLButtonElement = fixture.nativeElement.querySelector('.segbar__seg.seg-retired');
    expect(retiredSeg).toBeTruthy();
    retiredSeg.click();
    fixture.detectChanges();

    expect(progress.loadDetails).not.toHaveBeenCalled();
    expect(fixture.componentInstance.listFilter()).toBeNull();
    expect(fixture.nativeElement.querySelector('#tab-mastery').getAttribute('aria-selected')).toBe('true');
  });

  // ── Keyboard nav: the tablist is a real roving-tabindex control ─────────────────────
  it('ArrowRight on the active tab moves selection to the next tab', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const overviewTab: HTMLButtonElement = fixture.nativeElement.querySelector('#tab-overview');
    overviewTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#tab-mastery').getAttribute('aria-selected')).toBe('true');
  });

  it('ArrowLeft on the first tab wraps to the last tab (Recognition, round 3)', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const overviewTab: HTMLButtonElement = fixture.nativeElement.querySelector('#tab-overview');
    overviewTab.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#tab-recognition').getAttribute('aria-selected')).toBe('true');
  });

  // ── Round 3: the 6th "Recognition" tab ──────────────────────────────────────────────
  it('renders a 6th "Recognition" tab in the tablist, hidden until selected', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const tabs = fixture.nativeElement.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(6);
    const recognitionTab: HTMLButtonElement = fixture.nativeElement.querySelector('#tab-recognition');
    expect(recognitionTab).toBeTruthy();
    expect(recognitionTab.textContent).toContain('Recognition');
    expect(recognitionTab.getAttribute('aria-selected')).toBe('false');
    expect(fixture.nativeElement.querySelector('app-recognition-panel')).toBeFalsy();
  });

  it('switching to Recognition renders app-recognition-panel wired to the summary\'s probes, no fetch', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    clickTab(fixture, 'recognition');

    const panel = fixture.nativeElement.querySelector('app-recognition-panel');
    expect(panel).toBeTruthy();
    expect(panel!.textContent).toContain('8 probes');
    expect(panel!.textContent).toContain('50% clean cold');
    expect(progress.loadDetails).not.toHaveBeenCalled();
  });

  // ── Round 3: technique minProblems + click-to-expand-problems wiring ────────────────
  it('shows each technique\'s count/target ratio (problemCount/minProblems) on the Techniques tab', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'techniques');

    const ratios = Array.from(fixture.nativeElement.querySelectorAll('.tech-row__ratio'))
      .map((el) => (el as HTMLElement).textContent);
    expect(ratios).toContain('1/3');
    expect(ratios).toContain('2/2');
  });

  it('expanding a technique row calls onTechniqueExpand, which fetches details via loadDetails()', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();
    clickTab(fixture, 'techniques');

    const row: HTMLButtonElement = fixture.nativeElement.querySelector('.tech-row__toggle');
    expect(row).toBeTruthy();
    row.click();
    fixture.detectChanges();

    expect(progress.loadDetails).toHaveBeenCalled();
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
