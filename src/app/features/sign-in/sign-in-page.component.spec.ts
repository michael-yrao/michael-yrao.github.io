import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { SignInPageComponent } from './sign-in-page.component';

describe('SignInPageComponent', () => {
  it('the button signs in and returns to the home route', () => {
    const auth = { signIn: vi.fn() };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    const fixture = TestBed.createComponent(SignInPageComponent);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.signin__button')?.click();

    expect(auth.signIn).toHaveBeenCalledWith('/');
  });
});
