import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { WORKER_API_URL } from '../data/site-links';
import { GITHUB_APP_CONFIG } from '../pattern-sense/github-save';
import { AUTH_KEY, GithubSaveService, PENDING_KEY } from './github-save.service';

const ROUTES_URL = `${WORKER_API_URL}pattern-sense/`;
const TEST_CONFIG = { clientId: 'Iv1.test', appSlug: 'pattern-sense' };
const REF = { owner: 'someone', repo: 'their-repo', branch: 'dev' };
const WEEK = '2026-11-30';
const TOKEN = 'ghu_secret';

function setup(): { service: GithubSaveService; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: GITHUB_APP_CONFIG, useValue: TEST_CONFIG },
    ],
  });
  return {
    service: TestBed.inject(GithubSaveService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('GithubSaveService', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('save posts the loaded repo, path and results to the Worker with the Bearer token', async () => {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify({ token: TOKEN, login: 'someone' }));
    const { service, httpMock } = setup();

    const saving = service.save(REF, WEEK, 'abc123', 'PS1 2026-11-30 abc123 1:+/+');
    const req = httpMock.expectOne(`${ROUTES_URL}save`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(req.request.body).toEqual({
      owner: 'someone',
      repo: 'their-repo',
      branch: 'dev',
      path: 'dashboard/pattern_sense_results/20261130.json',
      results: {
        schemaVersion: 1,
        week: WEEK,
        vocabulary: 'abc123',
        code: 'PS1 2026-11-30 abc123 1:+/+',
        submittedAt: expect.any(String),
      },
    });
    req.flush({ ok: true });
    await saving;
    expect(service.saveState()).toBe('saved');
  });

  it('completeSignIn with a mismatched state stores nothing and calls no Worker', async () => {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ state: 'right', repo: 'a/b@main', week: WEEK }),
    );
    const { service, httpMock } = setup();

    const result = await service.completeSignIn('code', 'wrong');

    expect(result).toBeNull();
    expect(sessionStorage.getItem(AUTH_KEY)).toBeNull();
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    httpMock.expectNone(`${ROUTES_URL}token`);
  });
});
