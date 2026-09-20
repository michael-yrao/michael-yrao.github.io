import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { ProgressService, DEFAULT_REPO, DEFAULT_BRANCH } from './progress.service';
import { ProgressData } from '../models/progress.model';

// A recording HttpClient stub: captures every get() and returns a valid minimal contract,
// so we can assert the request shape (API-first, Accept header) and the refresh behaviour
// without real network.
function makeHttp() {
  const calls: { url: string; opts: any }[] = [];
  const payload = { schemaVersion: 1, streak: { current: 1 }, pipeline: {}, totals: {}, problems: [], badges: [] };
  const http = {
    calls,
    get: (url: string, opts: any) => {
      calls.push({ url, opts });
      return of(payload);
    },
  };
  return http;
}

describe('ProgressService', () => {
  let service: ProgressService;
  let http: ReturnType<typeof makeHttp>;

  beforeEach(() => {
    http = makeHttp();
    TestBed.configureTestingModule({
      providers: [ProgressService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(ProgressService);
  });

  describe('parseRepo', () => {
    it('defaults to the owner repo when no repo is given', () => {
      const ref = service.parseRepo(null);
      expect(`${ref.owner}/${ref.repo}`).toBe(DEFAULT_REPO);
      expect(ref.branch).toBe(DEFAULT_BRANCH);
    });

    it('parses owner/name and owner/name@branch', () => {
      expect(service.parseRepo('someone/their-repo').owner).toBe('someone');
      expect(service.parseRepo('someone/their-repo@dev').branch).toBe('dev');
    });

    it('falls back to the default on a malformed slug', () => {
      expect(`${service.parseRepo('nope').owner}/${service.parseRepo('nope').repo}`).toBe(DEFAULT_REPO);
    });
  });

  describe('fetch path', () => {
    it('hits the GitHub Contents API (not raw) with the raw media Accept header', () => {
      service.loadSummary(null);
      const call = http.calls[0];
      expect(call.url).toContain('api.github.com/repos/');
      expect(call.url).toContain('/contents/progress-summary.json?ref=main');
      expect(call.opts.headers.get('Accept')).toBe('application/vnd.github.raw');
      expect(service.status()).toBe('ready');
    });

    it('skips a redundant reload of the repo already shown', () => {
      service.loadSummary(null);
      service.loadSummary(null); // same repo, already ready -> no new request
      expect(http.calls.length).toBe(1);
    });
  });

  describe('refresh', () => {
    it('bypasses the ready short-circuit and re-fetches with a cache-buster', () => {
      service.loadSummary(null);
      expect(http.calls.length).toBe(1);

      service.refresh();
      expect(http.calls.length).toBe(2);
      expect(http.calls[1].url).toContain('_='); // cache-buster query param
    });

    it('does not re-fetch details on refresh when details were never opened', () => {
      service.loadSummary(null);
      service.refresh();
      expect(http.calls.every((c) => c.url.includes('progress-summary.json'))).toBe(true);
    });
  });

  describe('loadDetails', () => {
    it('fetches progress.json for the current source once details are opted into', () => {
      service.loadSummary(null);
      service.loadDetails();
      const call = http.calls[http.calls.length - 1];
      expect(call.url).toContain('/contents/progress.json?ref=main');
      expect(service.detailsStatus()).toBe('ready');
      expect(service.details()).toEqual([]);
    });

    it('is a no-op with nothing loaded (no source yet)', () => {
      service.loadDetails();
      expect(http.calls.length).toBe(0);
    });

    it('refetches details on refresh once they have been opened', () => {
      service.loadSummary(null);
      service.loadDetails();
      const before = http.calls.length;
      service.refresh();
      expect(http.calls.length).toBe(before + 2); // summary + details
    });
  });
});

// A repo on an older gamify.py (or mid-regeneration) has progress.json but no
// progress-summary.json yet. loadSummary() must fall back to the full contract and derive
// the aggregates client-side rather than showing the error card.
function makeFullPayload(): ProgressData {
  const problem = {
    lcNumber: 206,
    title: 'Reverse Linked List',
    url: 'https://leetcode.com/problems/reverse-linked-list/',
    difficulty: 'Easy' as const,
    category: 'linked-list',
    comfort: '🎓' as const,
    level: 3,
    streak: 3,
    nextReview: '2026-10-01',
    repDates: ['2026-01-01'],
    timeline: [],
  };
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-20',
    totals: { problems: 1, solutions: 1, reps: 3 },
    pipeline: { blank: 0, shaky: 0, clean: { s0: 0, s1: 0, s2plus: 1, total: 1 }, graduated: 1, retired: 0 },
    difficulty: { Easy: 1, Medium: 0, Hard: 0 },
    streak: { current: 2, longest: 4, lastStudyDay: '2026-09-20', studyDays: 5, restDayAllowance: 1 },
    coverage: null,
    onSchedule: { totalActive: 1, dueToday: 0, overdue: 0 },
    trophyCase: { graduated: [problem], retired: [] },
    badges: [{ id: 'first-graduate', title: 'First Graduation', earned: true }],
    problems: [problem],
  };
}

function makeHttpMissingSummary() {
  const calls: { url: string; opts: any }[] = [];
  const full = makeFullPayload();
  const http = {
    calls,
    get: (url: string, opts: any) => {
      calls.push({ url, opts });
      if (url.includes('progress-summary.json')) {
        return throwError(() => ({ status: 404 }));
      }
      return of(full);
    },
  };
  return http;
}

describe('ProgressService — missing progress-summary.json', () => {
  it('falls back to progress.json and derives the summary client-side on a 404', () => {
    const http = makeHttpMissingSummary();
    TestBed.configureTestingModule({
      providers: [ProgressService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(ProgressService);

    service.loadSummary(null);

    expect(service.status()).toBe('ready');
    expect(service.error()).toBeNull();
    const data = service.data();
    expect(data).toBeTruthy();
    expect((data as unknown as Record<string, unknown>)['problems']).toBeUndefined();
    expect(data?.streak.current).toBe(2);
    expect(data?.pipeline.graduated).toBe(1);
    expect(data?.trophyCase?.graduated).toEqual([
      { lcNumber: 206, title: 'Reverse Linked List', difficulty: 'Easy' },
    ]);
    // Both the summary attempt and the details fallback were requested.
    expect(http.calls.some((c) => c.url.includes('progress-summary.json'))).toBe(true);
    expect(http.calls.some((c) => c.url.includes('/contents/progress.json'))).toBe(true);
  });

  it('a non-404 summary error does NOT fall back to progress.json', () => {
    const calls: { url: string }[] = [];
    const http = {
      get: (url: string) => {
        calls.push({ url });
        return throwError(() => ({ status: 403 }));
      },
    };
    TestBed.configureTestingModule({
      providers: [ProgressService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(ProgressService);

    service.loadSummary(null);

    expect(service.status()).toBe('error');
    expect(calls.some((c) => c.url.includes('/contents/progress.json'))).toBe(false);
  });
});
