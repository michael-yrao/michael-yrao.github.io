import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';

import { WORKER_API_URL } from '../data/site-links';
import { GITHUB_APP_CONFIG } from '../pattern-sense/github-save';
import { authGuard } from './auth.guard';
import { AuthService, AuthSession, PENDING_KEY, REPO_KEY, SESSION_KEY, safeReturnUrl } from './auth.service';

const TEST_CONFIG = { clientId: 'Iv1.test', appSlug: 'progressive-overflow' };
const HOUR_MS = 3_600_000;
const OLD_TOKEN = 'ghu_old';
const NEW_TOKEN = 'ghu_new';
const GITHUB_API = 'https://api.github.com';

function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length(): number {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key) => void entries.delete(key),
    setItem: (key, value) => void entries.set(key, String(value)),
  };
}

function sessionExpiringIn(offsetMs: number): AuthSession {
  return {
    token: OLD_TOKEN,
    login: 'someone',
    expiresAt: new Date(Date.now() + offsetMs).toISOString(),
    refreshToken: 'ghr_old',
    refreshExpiresAt: new Date(Date.now() + HOUR_MS).toISOString(),
  };
}

function workerReply(token: string): AuthSession {
  return { ...sessionExpiringIn(HOUR_MS), token };
}

/** Lets the service's awaited steps run so the next request is on the mock backend. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve));

function setup(
  stored: AuthSession | null,
  extraProviders: Provider[] = [],
): { service: AuthService; httpMock: HttpTestingController } {
  if (stored !== null) localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: GITHUB_APP_CONFIG, useValue: TEST_CONFIG },
      ...extraProviders,
    ],
  });
  return { service: TestBed.inject(AuthService), httpMock: TestBed.inject(HttpTestingController) };
}

describe('safeReturnUrl', () => {
  const ROWS: readonly (readonly [string, string])[] = [
    ['/practice?x=1', '/practice?x=1'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    ['javascript:alert(1)', '/'],
    ['', '/'],
  ];

  it.each(ROWS)('%j -> %j', (input, expected) => {
    expect(safeReturnUrl(input)).toBe(expected);
  });
});

describe('AuthService', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    vi.stubGlobal('sessionStorage', createMemoryStorage());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('completeSignIn with a mismatched state stores nothing and calls no Worker', async () => {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state: 'right', returnUrl: '/practice' }));
    const { service, httpMock } = setup(null);

    const result = await service.completeSignIn('code', 'wrong');

    expect(result).toBeNull();
    expect(service.signInFailed()).toBe(true);
    expect(service.session()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    httpMock.expectNone(`${WORKER_API_URL}auth/token`);
  });

  describe('getToken near expiry', () => {
    interface Row {
      readonly name: string;
      readonly status: number;
      readonly expectedToken: string | null;
      readonly isSignedIn: boolean;
    }
    const ROWS: readonly Row[] = [
      { name: 'refreshes once, both callers get the new token', status: 200, expectedToken: NEW_TOKEN, isSignedIn: true },
      { name: 'failed refresh signs out', status: 401, expectedToken: null, isSignedIn: false },
    ];

    it.each(ROWS)('$name', async (row) => {
      const { service, httpMock } = setup(sessionExpiringIn(0));

      const first = service.getToken();
      const second = service.getToken();
      const req = httpMock.expectOne(`${WORKER_API_URL}auth/refresh`);
      expect(req.request.body).toEqual({ refreshToken: 'ghr_old' });
      if (row.status === 200) req.flush(workerReply(NEW_TOKEN));
      else req.flush({ error: 'refresh-failed' }, { status: row.status, statusText: 'x' });

      expect(await first).toBe(row.expectedToken);
      expect(await second).toBe(row.expectedToken);
      expect(service.isSignedIn()).toBe(row.isSignedIn);
      expect(localStorage.getItem(SESSION_KEY) === null).toBe(!row.isSignedIn);
    });
  });

  it('repos auto-selects the only reachable repo', async () => {
    const { service, httpMock } = setup(sessionExpiringIn(HOUR_MS));

    const listing = service.repos();
    await tick();
    httpMock.expectOne(`${GITHUB_API}/user/installations?per_page=100`).flush({ installations: [{ id: 7 }] });
    await tick();
    httpMock
      .expectOne(`${GITHUB_API}/user/installations/7/repositories?per_page=100`)
      .flush({ repositories: [{ full_name: 'someone/their-repo' }] });

    expect(await listing).toEqual(['someone/their-repo']);
    expect(service.selectedRepo()).toBe('someone/their-repo');
    expect(localStorage.getItem(REPO_KEY)).toBe('someone/their-repo');
  });

  describe('repos selection with several repos', () => {
    interface Row {
      readonly name: string;
      readonly stored: string | null;
      readonly expected: string;
    }
    const ROWS: readonly Row[] = [
      { name: 'nothing stored: the first is selected and stored', stored: null, expected: 'a/one' },
      { name: 'stored repo still listed: kept', stored: 'b/two', expected: 'b/two' },
      { name: 'stored repo gone: replaced by the first', stored: 'z/gone', expected: 'a/one' },
    ];

    it.each(ROWS)('$name', async (row) => {
      if (row.stored !== null) localStorage.setItem(REPO_KEY, row.stored);
      const { service, httpMock } = setup(sessionExpiringIn(HOUR_MS));

      const listing = service.repos();
      await tick();
      httpMock.expectOne(`${GITHUB_API}/user/installations?per_page=100`).flush({ installations: [{ id: 7 }] });
      await tick();
      httpMock
        .expectOne(`${GITHUB_API}/user/installations/7/repositories?per_page=100`)
        .flush({ repositories: [{ full_name: 'a/one' }, { full_name: 'b/two' }] });
      await listing;

      expect(service.selectedRepo()).toBe(row.expected);
      expect(localStorage.getItem(REPO_KEY)).toBe(row.expected);
    });
  });

  describe('signOut navigation', () => {
    interface Row {
      readonly name: string;
      readonly isGuarded: boolean;
      readonly expectedCalls: readonly string[];
    }
    const ROWS: readonly Row[] = [
      { name: 'on a guarded route: goes to /practice', isGuarded: true, expectedCalls: ['/practice'] },
      { name: 'on /practice/1: stays', isGuarded: false, expectedCalls: [] },
    ];

    it.each(ROWS)('$name', (row) => {
      const navigateByUrl = vi.fn().mockResolvedValue(true);
      const leaf = { routeConfig: { canActivate: row.isGuarded ? [authGuard] : [] }, firstChild: null };
      const router = { routerState: { snapshot: { root: { routeConfig: null, firstChild: leaf } } }, navigateByUrl };
      const { service } = setup(sessionExpiringIn(HOUR_MS), [{ provide: Router, useValue: router }]);

      service.signOut();

      expect(navigateByUrl.mock.calls.map((call) => call[0])).toEqual(row.expectedCalls);
    });
  });

  it('signOut clears the stored session', () => {
    const { service } = setup(sessionExpiringIn(HOUR_MS));
    service.selectRepo('someone/their-repo');

    service.signOut();

    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(localStorage.getItem(REPO_KEY)).toBeNull();
    expect(service.session()).toBeNull();
    expect(service.isSignedIn()).toBe(false);
  });
});
