import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

interface Row {
  readonly name: string;
  readonly isSignedIn: boolean;
  readonly expected: true | string;
}

const ROWS: readonly Row[] = [
  { name: 'signed out: sent to /practice', isSignedIn: false, expected: '/practice' },
  { name: 'signed in: allowed', isSignedIn: true, expected: true },
];

describe('authGuard', () => {
  it.each(ROWS)('$name', ({ isSignedIn, expected }) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isEnabled: true, isSignedIn: () => isSignedIn } },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    if (expected === true) {
      expect(result).toBe(true);
      return;
    }
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(expected);
  });
});
