import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

import { ProgressPageComponent } from './progress-page.component';
import { ProgressService } from '../../../core/services/progress.service';
import { ProgressSummary, ProblemProgress } from '../../../core/models/progress.model';

// A minimal, valid summary — enough for the 'ready' branch of every card on the landing,
// including the two instant drills (techniques/studyDays ride the summary, no fetch).
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
      { name: 'Bellman-Ford', family: 'advanced_graphs', problemCount: 1, problems: [787],
        bestComfort: '🟢', hasGreen: true, thin: true, hasVariantGap: false },
      { name: 'Frequency Counting', family: 'arrays_and_hash', problemCount: 2, problems: [49, 242],
        bestComfort: '🎓', hasGreen: true, thin: false, hasVariantGap: false },
    ],
    studyDays: ['2026-09-18', '2026-09-19', '2026-09-20'],
  };
}

// A stub with real signals (so the component's `readonly x = this.progress.x` field
// assignments and template bindings behave exactly as against the real service), but no
// HTTP: loadSummary/loadDetails/refresh are spies that never populate `details`, so the
// 'Explore problems' opt-in is never exercised unless a test calls it explicitly.
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

  it('fetches details only when "Explore problems" is clicked', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

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

    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(0);

    const row: HTMLButtonElement = fixture.nativeElement.querySelector('.problem__row');
    row.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-problem-timeline').length).toBe(1);
  });

  // ── Drill-through: the two instant drills (summary-only, no fetch) ──────────────────
  it('renders the technique panel from the summary alone, with no details fetch', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const disclosure: HTMLButtonElement = fixture.nativeElement.querySelector('.gauge__disclosure');
    expect(disclosure).toBeTruthy();
    disclosure.click();
    fixture.detectChanges();

    const techList = fixture.nativeElement.querySelectorAll('app-technique-list');
    expect(techList.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Bellman-Ford');
    expect(progress.loadDetails).not.toHaveBeenCalled();
  });

  it('renders the streak calendar from the summary alone, with no details fetch', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const streakBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.hero__streak--btn');
    expect(streakBtn).toBeTruthy();
    streakBtn.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-streak-calendar').length).toBe(1);
    expect(progress.loadDetails).not.toHaveBeenCalled();
  });

  // ── Drill-through: the three heavy drills (pipeline / on-schedule / difficulty) ─────
  it('clicking a pipeline tier fetches details and sets the comfort facet', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const seg: HTMLButtonElement = fixture.nativeElement.querySelector('.funnel__seg.seg-grad');
    expect(seg).toBeTruthy();
    seg.click();

    expect(progress.loadDetails).toHaveBeenCalled();
    expect(fixture.componentInstance.listFilter()).toEqual({ kind: 'comfort', value: '🎓' });
  });

  it('clicking "Needs attention" fetches details and sets a single schedule facet covering overdue + due today', () => {
    // Fixture has overdue:0, dueToday:1 — sum > 0, so the single drill button renders.
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const attentionBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.gauge__drill');
    expect(attentionBtn).toBeTruthy();
    expect(attentionBtn.textContent).toContain('Needs attention');
    attentionBtn.click();

    expect(progress.loadDetails).toHaveBeenCalled();
    expect(fixture.componentInstance.listFilter()).toEqual({ kind: 'schedule', value: 'attention' });
  });

  it('hides the "Needs attention" drill when nothing is overdue or due', () => {
    progress.data.set({ ...makeSummary(), onSchedule: { totalActive: 5, dueToday: 0, overdue: 0 } });
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.gauge__drill')).toBeFalsy();
  });

  it('clicking a difficulty count fetches details and sets the difficulty facet', () => {
    const fixture = TestBed.createComponent(ProgressPageComponent);
    fixture.detectChanges();

    const diffBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.difficulty-row__btn');
    expect(diffBtn).toBeTruthy();
    diffBtn.click();

    expect(progress.loadDetails).toHaveBeenCalled();
    const facet = fixture.componentInstance.listFilter();
    expect(facet?.kind).toBe('difficulty');
  });

  // ── Fix: 🏆 Retired never appears in details().problems[] (retired rows leave the
  // tracker entirely), so it must not drill into a comfort facet — it scrolls to the
  // Trophy Case card instead, with no fetch and no filter change. ──────────────────────
  it('clicking the 🏆 Retired segment scrolls to the Trophy Case and does NOT set a facet or fetch details', () => {
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

    // jsdom doesn't implement scrollIntoView; find the Trophy Case card by its heading and
    // stub it so the click doesn't throw, then assert it was called.
    const cards: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.card'));
    const trophyCard = cards.find((c) => c.querySelector('h2')?.textContent === 'Trophy case');
    expect(trophyCard).toBeTruthy();
    const scrollSpy = vi.fn();
    (trophyCard as HTMLElement & { scrollIntoView: () => void }).scrollIntoView = scrollSpy;

    const retiredSeg: HTMLButtonElement = fixture.nativeElement.querySelector('.funnel__seg.seg-retired');
    expect(retiredSeg).toBeTruthy();
    retiredSeg.click();

    expect(scrollSpy).toHaveBeenCalled();
    expect(progress.loadDetails).not.toHaveBeenCalled();
    expect(fixture.componentInstance.listFilter()).toBeNull();
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
