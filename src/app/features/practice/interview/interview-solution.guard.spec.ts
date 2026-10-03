import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, convertToParamMap } from '@angular/router';

import { interviewSolutionGuard } from './interview-solution.guard';

describe('interviewSolutionGuard', () => {
  const cases: { name: string; queryParams: Record<string, string>; expected: string | true }[] = [
    {
      name: 'redirects a candidate to the problem, keeping join and repo',
      queryParams: { join: 'peer-1', repo: 'me/notes' },
      expected: '/practice/42?join=peer-1&repo=me%2Fnotes',
    },
    { name: 'lets everyone else through', queryParams: { repo: 'me/notes' }, expected: true },
  ];

  for (const { name, queryParams, expected } of cases) {
    it(name, () => {
      const route = {
        paramMap: convertToParamMap({ number: '42' }),
        queryParams,
        queryParamMap: convertToParamMap(queryParams),
      } as ActivatedRouteSnapshot;
      const result = TestBed.runInInjectionContext(() =>
        interviewSolutionGuard(route, {} as RouterStateSnapshot),
      );
      if (expected === true) {
        expect(result).toBe(true);
        return;
      }
      expect(result).toBeInstanceOf(UrlTree);
      expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(expected);
    });
  }
});
