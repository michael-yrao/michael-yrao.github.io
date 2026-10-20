import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { AuthCallbackComponent } from './auth-callback.component';
import { AuthService } from './auth.service';

describe('AuthCallbackComponent', () => {
  it('without a code makes no Worker call and shows the failure button', async () => {
    const completeSignIn = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { completeSignIn, signIn: vi.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
    });
    const fixture = TestBed.createComponent(AuthCallbackComponent);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(completeSignIn).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Sign-in failed — try again');
  });

  const RETURN_URL = '/practice?x=1';
  const ROUTING_ROWS = [
    { name: 'a repo is selected: goes to the return URL', selected: 'a/cse-progress', expected: RETURN_URL },
    {
      name: 'no repo selected: goes to /start with the return URL as next',
      selected: null,
      expected: `/start?next=${encodeURIComponent(RETURN_URL)}`,
    },
  ];

  it.each(ROUTING_ROWS)('after sign-in, $name', async (row) => {
    const auth = {
      completeSignIn: vi.fn().mockResolvedValue(RETURN_URL),
      repos: vi.fn().mockResolvedValue([]),
      selectedRepo: () => row.selected,
      signIn: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ code: 'c', state: 's' }) } },
        },
      ],
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    TestBed.createComponent(AuthCallbackComponent);
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled());

    expect(navigate).toHaveBeenCalledWith(row.expected, { replaceUrl: true });
  });
});
