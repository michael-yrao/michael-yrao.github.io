import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { authGuard, signedOutGuard } from './auth.guard';
import { AuthService } from './auth.service';

interface Row {
  readonly name: string;
  readonly isSignedIn: boolean;
  readonly expected: true | string;
}

const ROWS: readonly Row[] = [
  { name: 'signed out: sent to /signin', isSignedIn: false, expected: '/signin' },
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

interface SignedOutRow {
  readonly name: string;
  readonly isEnabled: boolean;
  readonly isSignedIn: boolean;
  readonly expected: true | string;
}

const SIGNED_OUT_ROWS: readonly SignedOutRow[] = [
  { name: 'app on, signed out: allowed', isEnabled: true, isSignedIn: false, expected: true },
  { name: 'app on, signed in: sent to /', isEnabled: true, isSignedIn: true, expected: '/' },
  { name: 'app off: sent to /', isEnabled: false, isSignedIn: false, expected: '/' },
];

describe('signedOutGuard', () => {
  it.each(SIGNED_OUT_ROWS)('$name', ({ isEnabled, isSignedIn, expected }) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isEnabled, isSignedIn: () => isSignedIn } },
      ],
    });

    const result = TestBed.runInInjectionContext(() =>
      signedOutGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    if (expected === true) {
      expect(result).toBe(true);
      return;
    }
    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(expected);
  });
});
