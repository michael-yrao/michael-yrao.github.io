import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
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
