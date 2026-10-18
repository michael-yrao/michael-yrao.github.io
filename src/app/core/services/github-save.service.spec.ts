import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';
import { GithubSaveService } from './github-save.service';

const ROUTES_URL = `${WORKER_API_URL}pattern-sense/`;
const REF = { owner: 'someone', repo: 'their-repo', branch: 'dev' };
const WEEK = '2026-11-30';
const TOKEN = 'ghu_secret';

function setup(): { service: GithubSaveService; httpMock: HttpTestingController } {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { getToken: () => Promise.resolve(TOKEN) } },
    ],
  });
  return {
    service: TestBed.inject(GithubSaveService),
    httpMock: TestBed.inject(HttpTestingController),
  };
}

describe('GithubSaveService', () => {
  it('save posts the loaded repo, path and results to the Worker with the Bearer token', async () => {
    const { service, httpMock } = setup();

    const saving = service.save(REF, WEEK, 'abc123', 'PS1 2026-11-30 abc123 1:+/+');
    await new Promise((resolve) => setTimeout(resolve)); // the token arrives before the request
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
});
