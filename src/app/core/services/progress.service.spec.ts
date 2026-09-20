import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

import { ProgressService, DEFAULT_REPO, DEFAULT_BRANCH } from './progress.service';

// A recording HttpClient stub: captures every get() and returns a valid minimal contract,
// so we can assert the request shape (API-first, Accept header) and the refresh behaviour
// without real network.
function makeHttp() {
  const calls: { url: string; opts: any }[] = [];
  const payload = { schemaVersion: 1, streak: { current: 1 }, pipeline: {}, totals: {}, problems: [], badges: [] };
  const http = {
    calls,
    get: (url: string, opts: any) => {
      calls.push({ url, opts });
      return of(payload);
    },
  };
  return http;
}

describe('ProgressService', () => {
  let service: ProgressService;
  let http: ReturnType<typeof makeHttp>;

  beforeEach(() => {
    http = makeHttp();
    TestBed.configureTestingModule({
      providers: [ProgressService, { provide: HttpClient, useValue: http }],
    });
    service = TestBed.inject(ProgressService);
  });

  describe('parseRepo', () => {
    it('defaults to the owner repo when no repo is given', () => {
      const ref = service.parseRepo(null);
      expect(`${ref.owner}/${ref.repo}`).toBe(DEFAULT_REPO);
      expect(ref.branch).toBe(DEFAULT_BRANCH);
    });

    it('parses owner/name and owner/name@branch', () => {
      expect(service.parseRepo('someone/their-repo').owner).toBe('someone');
      expect(service.parseRepo('someone/their-repo@dev').branch).toBe('dev');
    });

    it('falls back to the default on a malformed slug', () => {
      expect(`${service.parseRepo('nope').owner}/${service.parseRepo('nope').repo}`).toBe(DEFAULT_REPO);
    });
  });

  describe('fetch path', () => {
    it('hits the GitHub Contents API (not raw) with the raw media Accept header', () => {
      service.load(null);
      const call = http.calls[0];
      expect(call.url).toContain('api.github.com/repos/');
      expect(call.url).toContain('/contents/progress.json?ref=main');
      expect(call.opts.headers.get('Accept')).toBe('application/vnd.github.raw');
      expect(service.status()).toBe('ready');
    });

    it('skips a redundant reload of the repo already shown', () => {
      service.load(null);
      service.load(null); // same repo, already ready -> no new request
      expect(http.calls.length).toBe(1);
    });
  });

  describe('refresh', () => {
    it('bypasses the ready short-circuit and re-fetches with a cache-buster', () => {
      service.load(null);
      expect(http.calls.length).toBe(1);

      service.refresh();
      expect(http.calls.length).toBe(2);
      expect(http.calls[1].url).toContain('_='); // cache-buster query param
    });
  });
});
