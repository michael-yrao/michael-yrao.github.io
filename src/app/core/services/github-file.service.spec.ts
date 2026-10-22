import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import {
  GitHubFileService,
  CONTENT_REPO,
  DEMO_REPO,
  DEFAULT_REPO,
  DEFAULT_BRANCH,
  parseRepoSlug,
  sameRef,
  blobUrl,
  fileUrl,
  httpErrorMessage,
} from './github-file.service';

describe('CONTENT_REPO / DEMO_REPO / DEFAULT_REPO / DEFAULT_BRANCH', () => {
  it('derive from the two repo slugs in site-links', () => {
    expect(CONTENT_REPO).toEqual({
      owner: 'michael-yrao',
      repo: 'progressive-overflow-content',
      branch: 'main',
    });
    expect(DEMO_REPO).toEqual({
      owner: 'michael-yrao',
      repo: 'progressive-overflow-demo',
      branch: 'main',
    });
    expect(DEFAULT_REPO).toBe('michael-yrao/progressive-overflow-demo');
    expect(DEFAULT_BRANCH).toBe('main');
  });
});

describe('parseRepoSlug', () => {
  it('returns the fallback (the content repo by default) when no slug is given', () => {
    expect(parseRepoSlug(null)).toEqual(CONTENT_REPO);
    expect(parseRepoSlug(undefined)).toEqual(CONTENT_REPO);
    expect(parseRepoSlug('')).toEqual(CONTENT_REPO);
    expect(parseRepoSlug('', DEMO_REPO)).toEqual(DEMO_REPO);
  });

  it('parses owner/name and owner/name@branch', () => {
    expect(parseRepoSlug('someone/their-repo')).toEqual({
      owner: 'someone',
      repo: 'their-repo',
      branch: 'main',
    });
    expect(parseRepoSlug('someone/their-repo@dev')).toEqual({
      owner: 'someone',
      repo: 'their-repo',
      branch: 'dev',
    });
  });

  it('returns null on a malformed slug', () => {
    expect(parseRepoSlug('nope')).toBeNull();
    expect(parseRepoSlug('a/b/c')).toBeNull();
    expect(parseRepoSlug('/name')).toBeNull();
    expect(parseRepoSlug('owner/')).toBeNull();
    expect(parseRepoSlug('owner/name@')).toBeNull();
    expect(parseRepoSlug('owner/name@dev@extra')).toBeNull();
  });
});

describe('sameRef', () => {
  it('is true for two refs with the same owner/repo/branch', () => {
    expect(
      sameRef({ owner: 'a', repo: 'b', branch: 'main' }, { owner: 'a', repo: 'b', branch: 'main' }),
    ).toBe(true);
  });

  it('is false when any field differs, and handles null', () => {
    expect(
      sameRef({ owner: 'a', repo: 'b', branch: 'main' }, { owner: 'a', repo: 'b', branch: 'dev' }),
    ).toBe(false);
    expect(sameRef(null, null)).toBe(true);
    expect(sameRef(null, { owner: 'a', repo: 'b', branch: 'main' })).toBe(false);
  });
});

describe('fileUrl', () => {
  it('builds the GitHub blob URL of a whole file, on the given branch', () => {
    expect(
      fileUrl({ owner: 'someone', repo: 'their-log', branch: 'dev' }, 'dsa/leetcode/x/1_x.py'),
    ).toBe('https://github.com/someone/their-log/blob/dev/dsa/leetcode/x/1_x.py');
  });
});

describe('blobUrl', () => {
  it('builds a GitHub blob URL with a line range', () => {
    const url = blobUrl(CONTENT_REPO, 'dsa/leetcode/graphs/733_flood_fill.py', 41, 70);
    expect(url).toBe(
      'https://github.com/michael-yrao/progressive-overflow-content/blob/main/dsa/leetcode/graphs/733_flood_fill.py#L41-L70',
    );
  });

  it('is fileUrl plus the line-range fragment — one spelling of blob/<branch>/', () => {
    const file = 'dsa/leetcode/graphs/733_flood_fill.py';
    expect(blobUrl(CONTENT_REPO, file, 41, 70)).toBe(
      `${fileUrl(CONTENT_REPO, file)}#L41-L70`,
    );
  });
});

describe('httpErrorMessage', () => {
  const RATE_LIMIT_COPY =
    'GitHub rate limit reached. Sign in with GitHub or try again shortly.';
  const cases: { name: string; err: { status: number } | null; what: string; expected: string }[] = [
    {
      name: '404 names the missing progress data',
      err: { status: 404 },
      what: 'progress',
      expected:
        'No progress data found on that repo/branch. It must be a public cse-coach repo that has generated one.',
    },
    { name: '403 is the rate-limit copy', err: { status: 403 }, what: 'progress', expected: RATE_LIMIT_COPY },
    { name: '429 is the rate-limit copy', err: { status: 429 }, what: 'progress', expected: RATE_LIMIT_COPY },
    {
      name: 'status 0 is a connection failure',
      err: { status: 0 },
      what: 'progress',
      expected: 'Could not reach GitHub — check your connection.',
    },
    {
      name: '500 is a GitHub outage',
      err: { status: 500 },
      what: 'progress',
      expected: 'GitHub is having trouble serving progress; try again in a minute.',
    },
    {
      name: '503 parametrizes the noun',
      err: { status: 503 },
      what: 'solution code',
      expected: 'GitHub is having trouble serving solution code; try again in a minute.',
    },
    {
      name: '400 falls through to the HTTP status',
      err: { status: 400 },
      what: 'progress',
      expected: 'Could not load progress (HTTP 400).',
    },
    {
      name: 'null error has an unknown status',
      err: null,
      what: 'progress',
      expected: 'Could not load progress (HTTP ?).',
    },
  ];

  it.each(cases)('$name', ({ err, what, expected }) => {
    expect(httpErrorMessage(err, what)).toBe(expected);
  });
});

const CONTENT_REPO_PATH = 'michael-yrao/progressive-overflow-content';
const SIGNED_OUT_AUTH = { isSignedIn: () => false, getToken: () => Promise.resolve(null) };

function makeSignedOutService(http: unknown): GitHubFileService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: SIGNED_OUT_AUTH }] });
  return TestBed.runInInjectionContext(() => new GitHubFileService(http as HttpClient));
}

describe('GitHubFileService', () => {
  // The manifest GET answers 404 (an older repo) and is not recorded, so the data-file
  // assertions below see only the data requests.
  function makeHttp() {
    const calls: { url: string; opts: any }[] = [];
    const http = {
      calls,
      get: (url: string, opts: any) => {
        if (url.includes('manifest.json')) return throwError(() => ({ status: 404 }));
        calls.push({ url, opts });
        return of({ ok: true });
      },
    };
    return http;
  }

  it('hits the Contents API with the raw Accept header', () => {
    const http = makeHttp();
    TestBed.configureTestingModule({
      providers: [
        GitHubFileService,
        { provide: HttpClient, useValue: http },
        { provide: AuthService, useValue: SIGNED_OUT_AUTH },
      ],
    });
    const service = TestBed.inject(GitHubFileService);

    service.fetch$(CONTENT_REPO, 'dashboard/showcase.json', false).subscribe();

    expect(http.calls[0].url).toBe(
      `https://api.github.com/repos/${CONTENT_REPO_PATH}/contents/dashboard/showcase.json?ref=main`,
    );
    expect(http.calls[0].opts.headers.get('Accept')).toBe('application/vnd.github.raw');
  });

  it('falls back to raw.githubusercontent.com on a 403', () => {
    const calls: string[] = [];
    const http = {
      get: (url: string) => {
        if (url.includes('manifest.json')) return throwError(() => ({ status: 404 }));
        calls.push(url);
        return url.includes('api.github.com')
          ? throwError(() => ({ status: 403 }))
          : of({ ok: true });
      },
    };
    TestBed.configureTestingModule({
      providers: [
        GitHubFileService,
        { provide: HttpClient, useValue: http },
        { provide: AuthService, useValue: SIGNED_OUT_AUTH },
      ],
    });
    const service = TestBed.inject(GitHubFileService);

    service.fetch$(CONTENT_REPO, 'dashboard/showcase.json', false).subscribe();

    expect(calls[1]).toBe(
      `https://raw.githubusercontent.com/${CONTENT_REPO_PATH}/main/dashboard/showcase.json`,
    );
  });

  // Every Contents-API read resolves the token once; signed in it is sent and a 403 is an error.
  it.each([
    { name: 'signed in', isSignedIn: true, authHeader: 'Bearer tok', hasRawRetry: false },
    { name: 'signed out', isSignedIn: false, authHeader: null, hasRawRetry: true },
  ])('$name: Authorization header and 403 handling', async ({ isSignedIn, authHeader, hasRawRetry }) => {
    const calls: { url: string; auth: string | null }[] = [];
    const http = {
      get: (url: string, opts: any) => {
        if (url.includes('manifest.json')) return throwError(() => ({ status: 404 }));
        calls.push({ url, auth: opts?.headers?.get('Authorization') ?? null });
        return url.includes('api.github.com') ? throwError(() => ({ status: 403 })) : of({ ok: true });
      },
    };
    TestBed.configureTestingModule({
      providers: [
        GitHubFileService,
        { provide: HttpClient, useValue: http },
        {
          provide: AuthService,
          useValue: { isSignedIn: () => isSignedIn, getToken: () => Promise.resolve(isSignedIn ? 'tok' : null) },
        },
      ],
    });
    const service = TestBed.inject(GitHubFileService);

    await firstValueFrom(service.fetch$(CONTENT_REPO, 'dashboard/showcase.json', false)).catch(
      () => undefined,
    );

    expect(calls[0].auth).toBe(authHeader);
    expect(calls.some((call) => call.url.includes('raw.githubusercontent.com'))).toBe(hasRawRetry);
  });

  it('encodes the branch in both URLs, keeping slashes literal on the raw host', () => {
    const rows = [
      { branch: 'feature/x', rawPart: '/feature/x/', apiSuffix: '?ref=feature%2Fx' },
      { branch: 'a#b', rawPart: '/a%23b/', apiSuffix: '?ref=a%23b' },
    ];
    for (const row of rows) {
      const calls: string[] = [];
      const http = {
        get: (url: string) => {
          if (url.includes('manifest.json')) return throwError(() => ({ status: 404 }));
          calls.push(url);
          return url.includes('api.github.com')
            ? throwError(() => ({ status: 403 }))
            : of({ ok: true });
        },
      };
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          GitHubFileService,
          { provide: HttpClient, useValue: http },
          { provide: AuthService, useValue: SIGNED_OUT_AUTH },
        ],
      });
      const service = TestBed.inject(GitHubFileService);

      service
        .fetch$({ ...CONTENT_REPO, branch: row.branch }, 'dashboard/showcase.json', false)
        .subscribe();

      expect(calls[0].endsWith(row.apiSuffix)).toBe(true);
      expect(calls[1]).toContain(row.rawPart);
    }
  });

  describe('manifest-keyed fetch', () => {
    const HASH = 'a'.repeat(64);
    const FILE = 'dashboard/showcase.json';
    const MANIFEST = {
      schemaVersion: 1,
      generatedAt: '2026-10-06',
      files: { 'showcase.json': { sha256: HASH, bytes: 1 } },
    };
    const rows = [
      {
        name: 'manifest 404: no v param, 403 still falls back to raw',
        manifest: null,
        apiStatus: 403,
        bustSecond: false,
        check: (urls: string[], manifestCount: number) => {
          expect(urls[0]).not.toContain('v=');
          expect(urls[1]).toContain('raw.githubusercontent.com');
          expect(manifestCount).toBe(1);
        },
      },
      {
        name: 'manifest lists the file: data URL carries v=<hash> and no cache-bust',
        manifest: MANIFEST,
        apiStatus: 200,
        bustSecond: false,
        check: (urls: string[]) => {
          expect(urls[0]).toContain(`&v=${HASH}`);
          expect(urls[0]).not.toContain('&_=');
        },
      },
      {
        name: 'bust re-fetches the manifest: requested twice across a fetch and a bust fetch',
        manifest: MANIFEST,
        apiStatus: 200,
        bustSecond: true,
        check: (_urls: string[], manifestCount: number) => expect(manifestCount).toBe(2),
      },
    ];

    it.each(rows)('$name', async ({ manifest, apiStatus, bustSecond, check }) => {
      const dataUrls: string[] = [];
      let manifestCount = 0;
      const http = {
        get: (url: string) => {
          if (url.includes('manifest.json')) {
            manifestCount++;
            return manifest ? of(manifest) : throwError(() => ({ status: 404 }));
          }
          dataUrls.push(url);
          return url.includes('api.github.com') && apiStatus === 403
            ? throwError(() => ({ status: 403 }))
            : of({ ok: true });
        },
      };
      const service = makeSignedOutService(http);

      // A hashed fetch reads the (async) cache first, so each fetch is awaited.
      await firstValueFrom(service.fetch$(CONTENT_REPO, FILE, false));
      if (bustSecond) await firstValueFrom(service.fetch$(CONTENT_REPO, FILE, true));

      check(dataUrls, manifestCount);
    });
  });

  describe('manifestHashFor', () => {
    const HASH = 'b'.repeat(64);
    const MANIFEST = {
      schemaVersion: 1,
      generatedAt: '2026-10-06',
      files: { 'practice.json': { sha256: HASH, bytes: 1 } },
    };
    const rows = [
      { name: 'file listed in a loaded manifest: its hash', isLoaded: true, file: 'dashboard/practice.json', expected: HASH },
      { name: 'file absent from the loaded manifest: null', isLoaded: true, file: 'dashboard/other.json', expected: null },
      { name: 'no manifest loaded for the ref: null, no request', isLoaded: false, file: 'dashboard/practice.json', expected: null },
    ];

    it.each(rows)('$name', async ({ isLoaded, file, expected }) => {
      let requests = 0;
      const http = {
        get: () => {
          requests++;
          return of(MANIFEST);
        },
      };
      const service = makeSignedOutService(http);
      if (isLoaded) await firstValueFrom(service.fetch$(CONTENT_REPO, 'dashboard/practice.json', false));
      const requestsBefore = requests;

      expect(await service.manifestHashFor(CONTENT_REPO, file)).toBe(expected);
      expect(requests).toBe(requestsBefore);
    });
  });
});
