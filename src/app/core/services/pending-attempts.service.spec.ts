import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import { buildAttemptFile } from '../practice/practice-attempt';
import { RepoRef } from './github-file.service';
import { PendingAttemptsService } from './pending-attempts.service';

const REF: RepoRef = { owner: 'o', repo: 'r', branch: 'main' };
const TODAY = '2026-10-19';
const DAY_DIR_URL = 'contents/dsa/attempts/20261019?';
const SAVED_AT = new Date('2026-10-19T10:00:00.000Z');

function attemptText(complete: boolean): string {
  return buildAttemptFile({ complete, rating: complete ? 'clean' : null, tests: null, complexity: null }, SAVED_AT, 'x = 1\n');
}

type Listing = { name: string; type: string }[] | 'missing';

/** Answers the day-folder listing with `listing` and each `<n>_<slug>.py` with `files[name]`. */
function makeHttp(listing: Listing, files: Record<string, string>) {
  const urls: string[] = [];
  return {
    urls,
    get: (url: string): Observable<unknown> => {
      urls.push(url);
      if (url.includes(DAY_DIR_URL)) {
        return listing === 'missing' ? throwError(() => ({ status: 404 })) : of(listing);
      }
      const name = Object.keys(files).find((file) => url.includes(`/${file}?`));
      return name ? of(files[name]) : throwError(() => ({ status: 404 }));
    },
  };
}

function serviceWith(http: ReturnType<typeof makeHttp>): PendingAttemptsService {
  TestBed.configureTestingModule({ providers: [{ provide: HttpClient, useValue: http }] });
  return TestBed.inject(PendingAttemptsService);
}

describe('PendingAttemptsService.load', () => {
  it('a missing day folder (404) leaves nothing pending', async () => {
    const service = serviceWith(makeHttp('missing', {}));
    const result = await service.load(REF, TODAY, new Set([1]));
    expect([...result]).toEqual([]);
    expect([...service.pending()]).toEqual([]);
  });

  it('marks only the number whose file is complete', async () => {
    const http = makeHttp(
      [
        { name: '1_two_sum.py', type: 'file' },
        { name: '2_add_two_numbers.py', type: 'file' },
      ],
      { '1_two_sum.py': attemptText(true), '2_add_two_numbers.py': attemptText(false) },
    );
    const service = serviceWith(http);
    const result = await service.load(REF, TODAY, new Set([1, 2]));
    expect([...result]).toEqual([1]);
    expect([...service.pending()]).toEqual([1]);
  });

  it('never requests a file whose number is not an open row', async () => {
    const http = makeHttp(
      [
        { name: '1_two_sum.py', type: 'file' },
        { name: '9_other.py', type: 'file' },
      ],
      { '1_two_sum.py': attemptText(true), '9_other.py': attemptText(true) },
    );
    const service = serviceWith(http);
    await service.load(REF, TODAY, new Set([1]));
    expect(http.urls.some((url) => url.includes('9_other.py'))).toBe(false);
  });
});
