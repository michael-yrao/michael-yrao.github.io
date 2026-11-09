import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { BuildResult, EngineService } from './engine.service';

const REF = { owner: 'ada', repo: 'cse-progress', branch: 'main' };
const CONFLICT = 409;

const UNAUTHORIZED = 401;
const RUN_ID = 7;

function setupReads(auth: { isSignedIn: () => boolean; getToken: () => Promise<string | null> }) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: auth }],
  });
  return { http: TestBed.inject(HttpTestingController), service: TestBed.inject(EngineService) };
}

describe('EngineService Actions reads', () => {
  interface AuthCase {
    readonly name: string;
    readonly auth: { isSignedIn: () => boolean; getToken: () => Promise<string | null> };
    readonly header: string | null;
  }
  const reads: readonly { readonly name: string; readonly start: (s: EngineService) => void; readonly url: string }[] = [
    { name: 'status$', start: (s) => s.status$(REF, true).subscribe(), url: '/workflows/weekly-build.yml/runs' },
    { name: 'step$', start: (s) => s.step$(REF, RUN_ID).subscribe(), url: `/actions/runs/${RUN_ID}/jobs` },
  ];
  const auths: readonly AuthCase[] = [
    { name: 'signed in sends the bearer token', auth: { isSignedIn: () => true, getToken: async () => 'tok' }, header: 'Bearer tok' },
    { name: 'signed out sends no Authorization', auth: { isSignedIn: () => false, getToken: async () => null }, header: null },
  ];

  describe.each(reads)('$name', ({ start, url }) => {
    it.each(auths)('$name', async ({ auth, header }) => {
      const { http, service } = setupReads(auth);
      start(service);
      const req = await vi.waitFor(() => http.expectOne((r) => r.url.includes(url)));
      expect(req.request.headers.get('Authorization')).toBe(header);
      expect(req.request.url).toMatch(/[?&]_=\d+/);
      req.flush({});
    });
  });

  it('a read inside the TTL with no bust makes no request', () => {
    const { http, service } = setupReads({ isSignedIn: () => false, getToken: async () => null });
    service.status$(REF).subscribe();
    http.expectOne((r) => r.url.includes('/runs')).flush({ workflow_runs: [] });
    service.status$(REF).subscribe();

    http.expectNone((r) => r.url.includes('/runs'));
  });

  it('a token rejected with 401 is retried once anonymously and its result is used', async () => {
    const { http, service } = setupReads({ isSignedIn: () => true, getToken: async () => 'stale' });
    const results: unknown[] = [];
    service.status$(REF, true).subscribe((status) => results.push(status));
    const authed = await vi.waitFor(() => http.expectOne((r) => r.headers.has('Authorization')));
    authed.flush({}, { status: UNAUTHORIZED, statusText: 'Unauthorized' });
    const anonymous = http.expectOne((r) => !r.headers.has('Authorization'));
    anonymous.flush({ workflow_runs: [{ id: RUN_ID, status: 'completed', conclusion: 'success', html_url: 'u' }] });

    expect(results).toEqual([{ state: 'ok', runId: RUN_ID, htmlUrl: 'u' }]);
  });
});

describe('EngineService.buildNextWeek', () => {
  it.each<{ code: string; expected: BuildResult }>([
    { code: 'no-config', expected: 'no-config' },
  ])('a 409 $code answers $expected', async ({ code, expected }) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: async () => 'token' } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const pending = TestBed.inject(EngineService).buildNextWeek(REF);
    const req = await vi.waitFor(() => http.expectOne((r) => r.url.endsWith('engine/weekly-build')));
    req.flush({ error: code }, { status: CONFLICT, statusText: 'Conflict' });

    expect(await pending).toBe(expected);
  });
});
