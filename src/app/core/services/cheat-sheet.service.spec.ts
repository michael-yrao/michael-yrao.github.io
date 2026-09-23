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

// Any URL succeeds with `payload` — fine for tests that don't care which fetch path is
// taken (the repo fetch always resolves first, so these exercise that path).
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

interface HttpOutcome {
  payload?: unknown;
  error?: { status: number };
}

// Discriminates by URL, the way the real Contents-API vs. bundled-asset fetch does: the
// repo fetch goes to api.github.com (or, on a 403, raw.githubusercontent.com); the fallback
// goes to the bundled `assets/` path. Lets a test drive the repo and bundled outcomes
// independently.
function makeSplitHttp(repo: HttpOutcome, bundled: HttpOutcome) {
  const calls: string[] = [];
  const http = {
    calls,
    get: (url: string) => {
      calls.push(url);
      const outcome = url.startsWith('assets/') ? bundled : repo;
      return outcome.error ? throwError(() => outcome.error) : of(outcome.payload);
    },
  };
  return http;
}

describe('CheatSheetService', () => {
  it('fetches dashboard/cheat-sheets.json from the default repo first, and sets source=repo', () => {
    const http = makeSplitHttp({ payload: makePayload() }, { payload: makePayload() });
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();

    expect(http.calls).toEqual([
      'https://api.github.com/repos/michael-yrao/cse-progress/contents/dashboard/cheat-sheets.json?ref=main',
    ]);
    expect(service.status()).toBe('ready');
    expect(service.error()).toBeNull();
    expect(service.data()?.techniques.length).toBe(3);
    expect(service.source()).toBe('repo');
    expect(service.repoSlug()).toBe('michael-yrao/cse-progress');
    expect(service.sourceFooter()).toBe(`Generated ${makePayload().generatedAt} from michael-yrao/cse-progress`);
  });

  it('falls back to the bundled asset when the repo fetch 404s, and sets source=bundled', () => {
    const http = makeSplitHttp({ error: { status: 404 } }, { payload: makePayload() });
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();

    expect(http.calls).toEqual([
      'https://api.github.com/repos/michael-yrao/cse-progress/contents/dashboard/cheat-sheets.json?ref=main',
      'assets/cheat-sheets.json',
    ]);
    expect(service.status()).toBe('ready');
    expect(service.data()?.techniques.length).toBe(3);
    expect(service.source()).toBe('bundled');
    expect(service.repoSlug()).toBeNull();
    expect(service.sourceFooter()).toBe(`Bundled copy (generated ${makePayload().generatedAt})`);
  });

  it('falls back to the bundled asset on a remote schemaVersion mismatch', () => {
    const mismatched = { ...makePayload(), schemaVersion: CHEAT_SHEETS_SCHEMA_VERSION + 1 };
    const http = makeSplitHttp({ payload: mismatched }, { payload: makePayload() });
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();

    expect(service.status()).toBe('ready');
    expect(service.source()).toBe('bundled');
    expect(service.data()?.schemaVersion).toBe(CHEAT_SHEETS_SCHEMA_VERSION);
  });

  it('honours a ?repo= override, fetching that repo/branch instead of the default', () => {
    const http = makeSplitHttp({ payload: makePayload() }, { payload: makePayload() });
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load('someone/their-repo@dev');

    expect(http.calls).toEqual([
      'https://api.github.com/repos/someone/their-repo/contents/dashboard/cheat-sheets.json?ref=dev',
    ]);
    expect(service.status()).toBe('ready');
    expect(service.repoSlug()).toBe('someone/their-repo');
  });

  it('fetches only once across repeated load() calls', () => {
    const http = makeSplitHttp({ payload: makePayload() }, { payload: makePayload() });
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();
    service.load();
    service.load();

    expect(http.calls.length).toBe(1);
  });

  it('goes to an error state when both the repo fetch and the bundled fetch fail', () => {
    const http = makeSplitHttp({ error: { status: 404 } }, { error: { status: 404 } });
    TestBed.configureTestingModule({
      providers: [CheatSheetService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(CheatSheetService);

    service.load();

    expect(service.status()).toBe('error');
    expect(service.data()).toBeNull();
    expect(service.source()).toBeNull();
  });

  it('goes to an error state when both copies are schema-mismatched, with a clear message', () => {
    const mismatched = { ...makePayload(), schemaVersion: CHEAT_SHEETS_SCHEMA_VERSION + 1 };
    const http = makeSplitHttp({ payload: mismatched }, { payload: mismatched });
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
