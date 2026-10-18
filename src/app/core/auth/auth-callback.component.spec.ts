import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
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
});
