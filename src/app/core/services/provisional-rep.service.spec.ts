import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';
import { createMemoryStorage } from '../memory-storage.testing';
import { buildAttemptFile } from '../practice/practice-attempt';
import { ProvisionalRepService } from './provisional-rep.service';
import { loadRecords, addRecord } from './provisional-records';

const REF = { owner: 'someone', repo: 'their-repo', branch: 'dev' };
const PATH = 'dsa/attempts/20261018/261_graph_valid_tree.py';
const SAVED_AT = new Date(2026, 9, 18, 23, 30);
const PROVISIONAL_META = { complete: true, rating: null, tests: '3/3', complexity: null } as const;
const COMPLETE_META = {
  complete: true,
  rating: 'clean',
  tests: '3/3',
  complexity: { time: 'O(n)', space: 'O(1)', whyTime: 'a', whySpace: 'b' },
} as const;
const CODE = 'class Solution:\n    pass\n';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

describe('ProvisionalRepService.resendPending', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { login: () => REF.owner, isSignedIn: () => true, getToken: () => Promise.resolve('ghu_secret') },
        },
      ],
    });
    addRecord({ ref: REF, path: PATH, content: buildAttemptFile(PROVISIONAL_META, SAVED_AT, CODE), date: SAVED_AT.toISOString() });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    {
      name: 'no landed save: re-sent, then the record is dropped',
      remote: null,
      isSent: true,
    },
    {
      name: 'the path already holds a complete file: dropped without a send',
      remote: { path: PATH, content: buildAttemptFile(COMPLETE_META, SAVED_AT, CODE) },
      isSent: false,
    },
  ])('$name', async ({ remote, isSent }) => {
    const service = TestBed.inject(ProvisionalRepService);
    const httpMock = TestBed.inject(HttpTestingController);

    const resending = service.resendPending();
    await tick(); // the token arrives before the request
    const latest = httpMock.expectOne(`${WORKER_API_URL}practice/latest`);
    if (remote === null) latest.flush({}, { status: 404, statusText: 'none' });
    else latest.flush(remote);
    await tick();
    const saves = httpMock.match(`${WORKER_API_URL}practice/save`);
    saves.forEach((req) => req.flush({ ok: true }));
    await resending;

    expect(saves).toHaveLength(isSent ? 1 : 0);
    expect(loadRecords()).toEqual([]);
  });
});
