import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { PracticeService } from './practice.service';
import { RepoRef } from './github-file.service';

const REF_A: RepoRef = { owner: 'a', repo: 'cse-progress', branch: 'main' };
const REF_B: RepoRef = { owner: 'b', repo: 'cse-progress', branch: 'main' };

function makeProblem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    number: 90,
    title: 'Subsets II',
    url: null,
    statement: '',
    stub: '',
    entry: { className: 'Solution', method: 'subsetsWithDup' },
    compare: 'exact',
    cases: [],
    ...overrides,
  };
}

describe('PracticeService', () => {
  function setup(payload: unknown | ((url: string) => unknown)) {
    const urls: string[] = [];
    const http = {
      get: (url: string) => {
        if (url.includes('manifest.json')) return throwError(() => ({ status: 404 })); // unrecorded
        urls.push(url);
        return of(typeof payload === 'function' ? payload(url) : payload);
      },
    };
    TestBed.configureTestingModule({
      providers: [PracticeService, { provide: HttpClient, useValue: http }],
    });
    return { service: TestBed.inject(PracticeService), urls };
  }

  it('rejects a schema mismatch and a malformed problem, and refetches on a changed ref', () => {
    const mismatch = setup({ schemaVersion: 2, generatedAt: 'x', problems: [] });
    mismatch.service.load(REF_A);
    expect(mismatch.service.status()).toBe('error');
    expect(mismatch.service.data()).toBeNull();

    TestBed.resetTestingModule();
    const malformed = setup({
      schemaVersion: 1,
      generatedAt: 'x',
      problems: [makeProblem({ compare: 'nope' })],
    });
    malformed.service.load(REF_A);
    expect(malformed.service.status()).toBe('error');
    expect(malformed.service.data()).toBeNull();
    expect(malformed.service.error()).toContain('#90');

    TestBed.resetTestingModule();
    const ok = setup({ schemaVersion: 1, generatedAt: 'x', problems: [makeProblem()] });
    ok.service.load(REF_A);
    ok.service.load(REF_A);
    expect(ok.urls.length).toBe(1);
    expect(ok.service.problemFor(90)?.title).toBe('Subsets II');
    ok.service.load(REF_B);
    expect(ok.urls.length).toBe(2);
    expect(ok.urls[1]).toContain('/repos/b/cse-progress/');
  });

  it('loadIndex(B) after load(A) leaves the full-load state alone, so load(B) still fetches B', () => {
    const { service, urls } = setup((url: string) =>
      url.includes('practice-index.json')
        ? { schemaVersion: 1, generatedAt: 'x', numbers: [90] }
        : { schemaVersion: 1, generatedAt: 'x', problems: [makeProblem()] },
    );
    service.load(REF_A);
    expect(service.status()).toBe('ready');

    service.loadIndex(REF_B);
    expect(service.indexNumbers()).toEqual(new Set([90]));
    expect(service.ref()).toEqual(REF_A);

    service.load(REF_B);
    expect(urls[urls.length - 1]).toContain('/repos/b/cse-progress/');
    expect(urls[urls.length - 1]).toContain('dashboard/practice.json');
  });
});
