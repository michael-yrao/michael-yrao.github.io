import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';
import { createMemoryStorage } from '../memory-storage.testing';
import { AttemptMeta } from '../practice/practice-attempt';
import { PracticeSaveService } from './practice-save.service';

const REF = { owner: 'someone', repo: 'their-repo', branch: 'dev' };
const TARGET = { number: 261, title: 'Graph Valid Tree' };
const TOKEN = 'ghu_secret';
const CODE = 'class Solution:\n    pass\n';
// Local time, late evening: the path's date is the viewer's local day.
const NOW = new Date(2026, 9, 18, 23, 30);
const PATH = 'dsa/attempts/20261018/261_graph_valid_tree.py';

const COMPLEXITY = { time: 'O(n)', space: 'O(1)', whyTime: 'one pass', whySpace: 'two counters' };

const ROWS: readonly { readonly name: string; readonly meta: AttemptMeta; readonly header: object }[] = [
  {
    name: 'an incomplete save',
    meta: { complete: false, rating: null, tests: null, complexity: null },
    header: { complete: false, rating: null, tests: null, complexity: null, savedAt: NOW.toISOString() },
  },
  {
    name: 'a complete save',
    meta: { complete: true, rating: 'shaky', tests: '5/5', complexity: COMPLEXITY },
    header: { complete: true, rating: 'shaky', tests: '5/5', complexity: COMPLEXITY, savedAt: NOW.toISOString() },
  },
];

describe('PracticeSaveService', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(ROWS)('$name posts the dated path and the header line above the code', async ({ meta, header }) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => Promise.resolve(TOKEN) } },
      ],
    });
    const service = TestBed.inject(PracticeSaveService);
    const httpMock = TestBed.inject(HttpTestingController);

    const saving = service.save(REF, TARGET, CODE, meta, NOW);
    await new Promise((resolve) => setTimeout(resolve)); // the token arrives before the request
    const req = httpMock.expectOne(`${WORKER_API_URL}practice/save`);
    req.flush({ ok: true });
    await saving;

    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(req.request.body).toEqual({
      owner: 'someone',
      repo: 'their-repo',
      branch: 'dev',
      path: PATH,
      content: `# po-attempt: ${JSON.stringify(header)}\n${CODE}`,
    });
    expect(service.statusFor(TARGET.number)).toEqual({ state: 'saved', isComplete: meta.complete });
    expect(service.statusFor(TARGET.number + 1).state).toBe('idle');
  });
});
