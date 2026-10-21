import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { SITE_COUNTS } from '../../core/data/site-counts';
import { LandingPageComponent } from './landing-page.component';

function setup() {
  const signIn = vi.fn();
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: { signIn } }],
  });
  const fixture = TestBed.createComponent(LandingPageComponent);
  fixture.detectChanges();
  return { fixture, signIn, root: fixture.nativeElement as HTMLElement };
}

describe('LandingPageComponent', () => {
  it.each([
    { name: 'hero button', selector: '.landing__hero-signin' },
    { name: 'Progress card button', selector: '.landing__card-signin' },
  ])('$name signs in with a return to /', ({ selector }) => {
    const { signIn, root } = setup();

    root.querySelector<HTMLButtonElement>(selector)?.click();

    expect(signIn).toHaveBeenCalledWith('/');
  });

  it('shows the live problem and visualization counts on the Practice card', () => {
    const { root } = setup();

    const text = root.querySelector('.landing__practice-card')?.textContent ?? '';

    expect(text).toContain(String(SITE_COUNTS.totalSolved));
    expect(text).toContain(String(SITE_COUNTS.totalVisualized));
  });
});
