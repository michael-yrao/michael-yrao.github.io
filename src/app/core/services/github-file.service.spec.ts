import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import {
  GitHubFileService,
  GOLD_STANDARD_REPO,
  DEFAULT_REPO,
  DEFAULT_BRANCH,
  parseRepoSlug,
  sameRef,
  blobUrl,
  httpErrorMessage,
} from './github-file.service';

describe('GOLD_STANDARD_REPO / DEFAULT_REPO / DEFAULT_BRANCH', () => {
  it('DEFAULT_REPO and DEFAULT_BRANCH derive from the single GOLD_STANDARD_REPO constant', () => {
    expect(GOLD_STANDARD_REPO).toEqual({
      owner: 'michael-yrao',
      repo: 'cse-progress',
      branch: 'main',
    });
    expect(DEFAULT_REPO).toBe('michael-yrao/cse-progress');
    expect(DEFAULT_BRANCH).toBe('main');
  });
});

describe('parseRepoSlug', () => {
  it('defaults to the gold-standard repo when no slug is given', () => {
    expect(parseRepoSlug(null)).toEqual(GOLD_STANDARD_REPO);
    expect(parseRepoSlug(undefined)).toEqual(GOLD_STANDARD_REPO);
    expect(parseRepoSlug('')).toEqual(GOLD_STANDARD_REPO);
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

describe('blobUrl', () => {
  it('builds a GitHub blob URL with a line range', () => {
    const url = blobUrl(GOLD_STANDARD_REPO, 'dsa/leetcode/graphs/733_flood_fill.py', 41, 70);
    expect(url).toBe(
      'https://github.com/michael-yrao/cse-progress/blob/main/dsa/leetcode/graphs/733_flood_fill.py#L41-L70',
    );
  });
});

describe('httpErrorMessage', () => {
  it('preserves the progress dashboard wording byte-for-byte', () => {
    expect(httpErrorMessage({ status: 404 }, 'progress')).toBe(
      'No progress data found on that repo/branch. It must be a public cse-coach repo that has generated one.',
    );
    expect(httpErrorMessage({ status: 403 }, 'progress')).toBe(
      'GitHub rate limit reached for anonymous requests. Sign in (coming soon) or try again shortly.',
    );
    expect(httpErrorMessage({ status: 0 }, 'progress')).toBe(
      'Could not reach GitHub — check your connection.',
    );
    expect(httpErrorMessage({ status: 500 }, 'progress')).toBe(
      'Could not load progress (HTTP 500).',
    );
    expect(httpErrorMessage(null, 'progress')).toBe('Could not load progress (HTTP ?).');
  });

  it('parametrizes the noun for a different resource', () => {
    expect(httpErrorMessage({ status: 404 }, 'solution code')).toBe(
      'No solution code data found on that repo/branch. It must be a public cse-coach repo that has generated one.',
    );
  });
});

describe('GitHubFileService', () => {
  function makeHttp() {
    const calls: { url: string; opts: any }[] = [];
    const http = {
      calls,
      get: (url: string, opts: any) => {
        calls.push({ url, opts });
        return of({ ok: true });
      },
    };
    return http;
  }

  it('hits the Contents API with the raw Accept header', () => {
    const http = makeHttp();
    TestBed.configureTestingModule({
      providers: [GitHubFileService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(GitHubFileService);

    service.fetch$(GOLD_STANDARD_REPO, 'dashboard/showcase.json', false).subscribe();

    expect(http.calls[0].url).toBe(
      'https://api.github.com/repos/michael-yrao/cse-progress/contents/dashboard/showcase.json?ref=main',
    );
    expect(http.calls[0].opts.headers.get('Accept')).toBe('application/vnd.github.raw');
  });

  it('falls back to raw.githubusercontent.com on a 403', () => {
    const calls: string[] = [];
    const http = {
      get: (url: string) => {
        calls.push(url);
        return url.includes('api.github.com')
          ? throwError(() => ({ status: 403 }))
          : of({ ok: true });
      },
    };
    TestBed.configureTestingModule({
      providers: [GitHubFileService, { provide: HttpClient, useValue: http }],
    });
    const service = TestBed.inject(GitHubFileService);

    service.fetch$(GOLD_STANDARD_REPO, 'dashboard/showcase.json', false).subscribe();

    expect(calls[1]).toBe(
      'https://raw.githubusercontent.com/michael-yrao/cse-progress/main/dashboard/showcase.json',
    );
  });
});
