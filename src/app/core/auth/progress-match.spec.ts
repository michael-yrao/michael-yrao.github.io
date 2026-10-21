import { TestBed } from '@angular/core/testing';
import { PartialMatchRouteSnapshot, Route, Router, UrlSegment } from '@angular/router';

import { AuthService } from './auth.service';
import { progressMatch } from './progress-match';

interface Row {
  readonly name: string;
  readonly isEnabled: boolean;
  readonly isSignedIn: boolean;
  readonly repoParam: string | null;
  readonly expected: boolean;
}

const ROWS: readonly Row[] = [
  { name: 'app off: matches', isEnabled: false, isSignedIn: false, repoParam: null, expected: true },
  { name: 'signed in: matches', isEnabled: true, isSignedIn: true, repoParam: null, expected: true },
  { name: 'signed out with ?repo=: matches', isEnabled: true, isSignedIn: false, repoParam: 'a/b', expected: true },
  { name: 'signed out without ?repo=: falls through', isEnabled: true, isSignedIn: false, repoParam: null, expected: false },
];

describe('progressMatch', () => {
  it.each(ROWS)('$name', ({ isEnabled, isSignedIn, repoParam, expected }) => {
    const navigation =
      repoParam === null ? null : { extractedUrl: { queryParams: { repo: repoParam } } };
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isEnabled, isSignedIn: () => isSignedIn } },
        { provide: Router, useValue: { getCurrentNavigation: () => navigation } },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      progressMatch({} as Route, [] as UrlSegment[], {} as PartialMatchRouteSnapshot),
    );

    expect(result).toBe(expected);
  });
});
