import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { CheatSheetService } from './cheat-sheet.service';
import { CheatSheetsData, CHEAT_SHEETS_SCHEMA_VERSION } from '../models/cheat-sheet.model';

function makeTechnique(id: string, family: string) {
  return {
    id,
    name: id,
    family,
    tier: 'core',
    whenToUse: `Use ${id}.`,
    signals: [`signal for ${id}`],
    picking: { feature: `feature for ${id}`, notWhen: [] },
    variants: [
      {
        title: 'Basic',
        code: 'pass',
        complexity: { time: 'O(n)', space: 'O(1)', why: 'because' },
      },
    ],
    pitfalls: ['TODO'],
    keyProblems: [{ lcNumber: 1, title: 'Two Sum' }],
    docUrl: `https://example.com/${id}.md`,
  };
}

function makePayload(): CheatSheetsData {
  return {
    schemaVersion: CHEAT_SHEETS_SCHEMA_VERSION,
    generatedAt: '2026-09-22T00:00:00Z',
    signals: [
      { see: 'sorted pair sum', reach: 'two-pointer', note: 'converge from ends' },
      { see: 'k largest from a stream', reach: 'heap', note: 'one-trick entry', page: false },
    ],
    techniques: [
      makeTechnique('two-pointer', 'arrays_and_hash'),
      makeTechnique('sliding-window', 'arrays_and_hash'),
      makeTechnique('binary-search', 'search'),
    ],
  };
}

function makeHttp(payload: unknown) {
  const calls: string[] = [];
  const http = {
    calls,
    get: (url: string) => {
      calls.push(url);
      return of(payload);
    },
  };
  return http;
}

describe('CheatSheetService', () => {
  it('loads the bundled asset once and exposes it as signals', () => {
    const http = makeHttp(makePayload());
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();

    expect(http.calls).toEqual(['assets/cheat-sheets.json']);
    expect(service.status()).toBe('ready');
    expect(service.error()).toBeNull();
    expect(service.data()?.techniques.length).toBe(3);
  });

  it('fetches the asset only once across repeated load() calls', () => {
    const http = makeHttp(makePayload());
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();
    service.load();
    service.load();

    expect(http.calls.length).toBe(1);
  });

  it('goes to an error state when the HTTP request fails', () => {
    const http = {
      get: () => throwError(() => ({ status: 404 })),
    };
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();

    expect(service.status()).toBe('error');
    expect(service.data()).toBeNull();
  });

  it('goes to an error state on a schemaVersion mismatch, with a clear message', () => {
    const mismatched = { ...makePayload(), schemaVersion: CHEAT_SHEETS_SCHEMA_VERSION + 1 };
    const http = makeHttp(mismatched);
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();

    expect(service.status()).toBe('error');
    expect(service.data()).toBeNull();
    expect(service.error()).toContain('schema');
  });

  it('groups techniques by family in first-appearance order', () => {
    const http = makeHttp(makePayload());
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();

    const groups = service.techniquesByFamily();
    expect(groups.map((g) => g.family)).toEqual(['arrays_and_hash', 'search']);
    expect(groups[0].techniques.map((t) => t.id)).toEqual(['two-pointer', 'sliding-window']);
    expect(service.orderedTechniques().map((t) => t.id)).toEqual([
      'two-pointer',
      'sliding-window',
      'binary-search',
    ]);
  });

  describe('resolveProblemLink', () => {
    it('resolves to the internal visualizer route when ALL_ALGORITHMS has the lcNumber', () => {
      const http = makeHttp(makePayload());
      TestBed.configureTestingModule({
        providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
      });
      const service = TestBed.inject(CheatSheetService);

      const link = service.resolveProblemLink(1, 'Two Sum');

      expect(link).toEqual({ kind: 'internal', commands: ['/algorithms', 'arrays-hash', 'two-sum'] });
    });

    it('falls back to a derived LeetCode URL when the lcNumber has no visualizer', () => {
      const http = makeHttp(makePayload());
      TestBed.configureTestingModule({
        providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
      });
      const service = TestBed.inject(CheatSheetService);

      const link = service.resolveProblemLink(999999, "Pow(x, n) & Friends");

      expect(link).toEqual({
        kind: 'external',
        url: 'https://leetcode.com/problems/pow-x-n-friends/',
      });
    });
  });
});
