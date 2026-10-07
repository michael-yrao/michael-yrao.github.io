import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';

import { FALLBACK_ROWS, settleRequests } from './author-fallback.testing';
import { BigOService } from './big-o.service';
import { GOLD_STANDARD_REPO } from './github-file.service';
import { BigOData } from '../models/big-o.model';

// A recording HttpClient stub, matching the pattern in showcase.service.spec.ts.
function makeHttp() {
  const calls: { url: string; opts: any }[] = [];
  const payload: BigOData = { schemaVersion: 1, generatedAt: '2026-09-24', entries: [] };
  const http = {
    calls,
    get: (url: string, opts: any) => {
      if (url.includes('manifest.json')) return throwError(() => ({ status: 404 })); // unrecorded
      calls.push({ url, opts });
      return of(payload);
    },
  };
  return http;
}

function makeBigOData(overrides: Partial<BigOData> = {}): BigOData {
  return { schemaVersion: 1, generatedAt: '2026-09-24', entries: [], ...overrides };
}

function validRawEntry() {
  return {
    key: '1216:cache',
    lcNumber: 1216,
    variant: 'cache',
    title: 'Valid Palindrome III',
    url: null,
    file: 'dsa/leetcode/1d_dynamic_programming/1216_valid_palindrome_iii.py',
    symbol: 'kPalindromeDP',
    attemptDate: '2026-09-01',
    difficulty: 'Medium',
    category: '1d_dynamic_programming',
    isMiss: false,
    note: null,
    time: 'O(n²)',
    space: 'O(n²)',
    whyTime: null,
    whySpace: null,
    timeOptions: ['O(n)', 'O(n log n)', 'O(n²)', 'O(n³)'],
    spaceOptions: ['O(1)', 'O(n)', 'O(n²)', 'O(n³)'],
    segments: [] as unknown[],
  };
}

describe('BigOService', () => {
  let service: BigOService;
  let http: ReturnType<typeof makeHttp>;

  beforeEach(() => {
    http = makeHttp();
    TestBed.configureTestingModule({
      providers: [BigOService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(BigOService);
  });

  it('fetches dashboard/big-o.json from the gold-standard repo via the API', () => {
    service.load();

    const call = http.calls[0];
    expect(call.url).toContain(
      'api.github.com/repos/michael-yrao/cse-progress/contents/dashboard/big-o.json',
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
    service.load(GOLD_STANDARD_REPO, true);

    expect(http.calls.length).toBe(2);
    expect(http.calls[1].url).toContain('_=');
  });

  it('falls back to raw on a 403 from the API', () => {
    const payload = makeBigOData();
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
      providers: [BigOService, { provide: HttpClient, useValue: raw403Http }],
    });
    const svc = TestBed.inject(BigOService);

    svc.load();

    expect(apiCalled).toBe(true);
    expect(svc.status()).toBe('ready');
  });

  it('sets a not-found error message on a 404', () => {
    const notFoundHttp = { get: () => throwError(() => ({ status: 404 })) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [BigOService, { provide: HttpClient, useValue: notFoundHttp }],
    });
    const svc = TestBed.inject(BigOService);

    svc.load();

    expect(svc.status()).toBe('error');
    expect(svc.error()).toBe(
      'No Big-O trainer data found on that repo/branch. It must be a public cse-coach repo that has generated one.',
    );
  });

  it('sets a schema-mismatch error when the contract speaks a newer version', () => {
    const mismatched = { schemaVersion: 2, generatedAt: '2026-09-24', entries: [] };
    const mismatchHttp = { get: () => of(mismatched) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [BigOService, { provide: HttpClient, useValue: mismatchHttp }],
    });
    const svc = TestBed.inject(BigOService);

    svc.load();

    expect(svc.status()).toBe('error');
    expect(svc.error()).toBe(
      "That repo's Big-O trainer data is schema v2; this viewer speaks v1. Update the site.",
    );
  });

  it('sets a malformed-entry error naming the entry by key when a field is structurally broken', () => {
    const brokenEntry = { ...validRawEntry(), timeOptions: ['O(n)'] }; // fewer than 4 options
    const brokenHttp = { get: () => of(makeBigOData({ entries: [brokenEntry as any] })) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [BigOService, { provide: HttpClient, useValue: brokenHttp }],
    });
    const svc = TestBed.inject(BigOService);

    svc.load();

    expect(svc.status()).toBe('error');
    expect(svc.error()).toContain('1216:cache');
  });

  describe.each(FALLBACK_ROWS)('load(ref): $name', (row) => {
    it('requests, sources and marks the fallback as the row says', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [BigOService, provideHttpClient(), provideHttpClientTesting()],
      });
      const svc = TestBed.inject(BigOService);

      svc.load(row.ref);
      const fileRequests = settleRequests(
        TestBed.inject(HttpTestingController),
        makeBigOData(),
        row.viewerHasFile,
      );

      expect(fileRequests).toEqual(row.fileRequests);
      expect(svc.status()).toBe('ready');
      expect(svc.source()).toBe(row.source);
      expect(svc.sourceRef()).toEqual(row.sourceRef);
      expect(svc.isAuthorFallback()).toBe(row.isAuthorFallback);
    });
  });

  it('goes ready with a well-formed entry', () => {
    const okHttp = { get: () => of(makeBigOData({ entries: [validRawEntry() as any] })) };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [BigOService, { provide: HttpClient, useValue: okHttp }],
    });
    const svc = TestBed.inject(BigOService);

    svc.load();

    expect(svc.status()).toBe('ready');
    expect(svc.data()?.entries.length).toBe(1);
  });
});
