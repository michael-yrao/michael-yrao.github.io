import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

import { ProgressPageComponent } from './progress-page.component';
import { ProgressService } from '../../../core/services/progress.service';
import { ProgressSummary, ProblemProgress } from '../../../core/models/progress.model';

// A minimal, valid summary — enough for the 'ready' branch of every card on the landing.
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
