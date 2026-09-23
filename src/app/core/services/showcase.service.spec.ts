import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { ShowcaseService } from './showcase.service';
import { ShowcaseData } from '../models/showcase.model';

// A recording HttpClient stub, matching the pattern in progress.service.spec.ts (kept local
// here rather than shared, per the engineering brief, since progress.service.spec.ts is not
// to be edited).
function makeHttp() {
  const calls: { url: string; opts: any }[] = [];
  const payload: ShowcaseData = { schemaVersion: 1, generatedAt: '2026-09-22', entries: [] };
  const http = {
    calls,
    get: (url: string, opts: any) => {
      calls.push({ url, opts });
      return of(payload);
    },
  };
  return http;
}

function makeShowcase(overrides: Partial<ShowcaseData> = {}): ShowcaseData {
  return { schemaVersion: 1, generatedAt: '2026-09-22', entries: [], ...overrides };
}

describe('ShowcaseService', () => {
  let service: ShowcaseService;
  let http: ReturnType<typeof makeHttp>;

  beforeEach(() => {
    http = makeHttp();
    TestBed.configureTestingModule({
      providers: [ShowcaseService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(ShowcaseService);
  });

  it('fetches dashboard/showcase.json from the gold-standard repo via the API', () => {
    service.load();

    const call = http.calls[0];
    expect(call.url).toContain(
      'api.github.com/repos/michael-yrao/cse-progress/contents/dashboard/showcase.json',
    );
    expect(call.url).toContain('ref=main');
    expect(call.opts.headers.get('Accept')).toBe('application/vnd.github.raw');
    expect(service.status()).toBe('ready');
  });

  it('loads once per session; a second load() makes no request', () => {
    service.load();
    service.load();

    expect(http.calls.length).toBe(1);
  });

  it('force reloads even when already ready, with a cache-buster', () => {
    service.load();
    service.load(true);

    expect(http.calls.length).toBe(2);
    expect(http.calls[1].url).toContain('_=');
  });

  it('falls back to raw on a 403 from the API', () => {
    const payload = makeShowcase();
    let apiCalled = false;
    const raw403Http = {
      get: (url: string) => {
        if (url.includes('api.github.com')) {
          apiCalled = true;
          return throwError(() => ({ status: 403 }));
        }
        return of(payload);
      },
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ShowcaseService, { provide: HttpClient, useValue: raw403Http }],
    });
    const svc = TestBed.inject(ShowcaseService);

    svc.load();

    expect(apiCalled).toBe(true);
    expect(svc.status()).toBe('ready');
  });

  it('sets a not-found error message on a 404', () => {
    const notFoundHttp = { get: () => throwError(() => ({ status: 404 })) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ShowcaseService, { provide: HttpClient, useValue: notFoundHttp }],
    });
    const svc = TestBed.inject(ShowcaseService);

    svc.load();

    expect(svc.status()).toBe('error');
    expect(svc.error()).toBe(
      'No solution code data found on that repo/branch. It must be a public cse-coach repo that has generated one.',
    );
  });

  it('sets a schema-mismatch error when the contract speaks a newer version', () => {
    const mismatched = { schemaVersion: 2, generatedAt: '2026-09-22', entries: [] };
    const mismatchHttp = { get: () => of(mismatched) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ShowcaseService, { provide: HttpClient, useValue: mismatchHttp }],
    });
    const svc = TestBed.inject(ShowcaseService);

    svc.load();

    expect(svc.status()).toBe('error');
    expect(svc.error()).toBe(
      'The solution code contract is schema v2; this site speaks v1. Update the site.',
    );
  });

  it('sets a malformed-entry error naming the entry by key when a segment is structurally broken', () => {
    const brokenEntry = {
      key: '733:bfs',
      lcNumber: 733,
      variant: 'bfs',
      title: 'Flood Fill',
      url: null,
      file: 'dsa/leetcode/graphs/733_flood_fill.py',
      symbol: 'floodFill_20260729',
      attemptDate: '2026-07-29',
      segments: [
        {
          kind: 'attempt' as const,
          symbol: 'floodFill_20260729',
          startLine: 1,
          endLine: 3,
          lines: ['only one line'],
        },
      ],
    };
    const brokenHttp = { get: () => of(makeShowcase({ entries: [brokenEntry] })) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ShowcaseService, { provide: HttpClient, useValue: brokenHttp }],
    });
    const svc = TestBed.inject(ShowcaseService);

    svc.load();

    expect(svc.status()).toBe('error');
    expect(svc.error()).toContain('733:bfs');
  });

  describe('entryFor', () => {
    it('returns null before any data has loaded', () => {
      expect(service.entryFor('733:bfs')).toBeNull();
    });

    it('returns null for a null key', () => {
      service.load();
      expect(service.entryFor(null)).toBeNull();
    });

    it('finds an entry by key once loaded, and null on a miss', () => {
      const entry = {
        key: '733:bfs',
        lcNumber: 733,
        variant: 'bfs',
        title: 'Flood Fill',
        url: null,
        file: 'dsa/leetcode/graphs/733_flood_fill.py',
        symbol: 'floodFill_20260729',
        attemptDate: '2026-07-29',
        segments: [],
      };
      const withEntry = { get: () => of(makeShowcase({ entries: [entry] })) };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ShowcaseService, { provide: HttpClient, useValue: withEntry }],
      });
      const svc = TestBed.inject(ShowcaseService);

      svc.load();

      expect(svc.entryFor('733:bfs')).toEqual(entry);
      expect(svc.entryFor('9999:none')).toBeNull();
    });
  });
});
