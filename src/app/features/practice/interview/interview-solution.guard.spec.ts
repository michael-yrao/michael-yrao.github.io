import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, convertToParamMap } from '@angular/router';

import { CANDIDATE_LOCK_KEY, CANDIDATE_LOCK_TTL_MS } from './candidate-lock';
import { interviewSolutionGuard } from './interview-solution.guard';

describe('interviewSolutionGuard', () => {
  const now = Date.now();
  const cases: { name: string; queryParams: Record<string, string>; lock?: string; expected: string | true }[] = [
    {
      name: 'redirects a candidate to the problem, keeping join and repo',
      queryParams: { join: 'peer-1', repo: 'me/notes' },
      expected: '/practice/42?join=peer-1&repo=me%2Fnotes',
    },
    {
      name: 'redirects when a live lock names this problem',
      queryParams: { repo: 'me/notes' },
      lock: JSON.stringify({ problem: 42, savedAt: now }),
      expected: '/practice/42?repo=me%2Fnotes',
    },
    {
      name: 'lets through a lock for another problem',
      queryParams: { repo: 'me/notes' },
      lock: JSON.stringify({ problem: 7, savedAt: now }),
      expected: true,
    },
    {
      name: 'lets through an expired lock',
      queryParams: {},
      lock: JSON.stringify({ problem: 42, savedAt: now - CANDIDATE_LOCK_TTL_MS - 1 }),
      expected: true,
    },
    { name: 'lets through a malformed lock', queryParams: {}, lock: '{not json', expected: true },
  ];

  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each(cases)('$name', ({ queryParams, lock, expected }) => {
    if (lock !== undefined) localStorage.setItem(CANDIDATE_LOCK_KEY, lock);
    const route = {
      paramMap: convertToParamMap({ number: '42' }),
      queryParams,
      queryParamMap: convertToParamMap(queryParams),
    } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => interviewSolutionGuard(route, {} as RouterStateSnapshot));
    if (expected === true) {
      expect(result).toBe(true);
      return;
    }
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(expected);
  });
});
