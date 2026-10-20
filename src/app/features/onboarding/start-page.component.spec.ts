import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { OnboardingService } from '../../core/onboarding/onboarding.service';
import { StartPageComponent } from './start-page.component';

function setup(query: Record<string, string>) {
  const onboarding = {
    step: signal('idle'),
    failure: signal(null),
    repoSlug: signal(null),
    isAdopted: signal(false),
    startDsa: vi.fn(async () => undefined),
    checkInstall: vi.fn(async () => undefined),
  };
  const auth = { isSignedIn: () => true, appSlug: 'progressive-overflow', signIn: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: auth },
      { provide: OnboardingService, useValue: onboarding },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
    ],
  });
  const fixture = TestBed.createComponent(StartPageComponent);
  fixture.detectChanges();
  return { onboarding, element: fixture.nativeElement as HTMLElement };
}

describe('StartPageComponent', () => {
  it('renders the System Design and AI cards as aria-disabled', () => {
    const { element } = setup({});
    expect(element.querySelectorAll('button[aria-disabled="true"]').length).toBe(2);
  });

  it('Start DSA calls startDsa', () => {
    const { onboarding, element } = setup({});
    const buttons = Array.from(element.querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Start DSA')?.click();
    expect(onboarding.startDsa).toHaveBeenCalledTimes(1);
  });

  it('?resume=1 calls checkInstall', () => {
    const { onboarding } = setup({ resume: '1' });
    expect(onboarding.checkInstall).toHaveBeenCalledTimes(1);
  });
});
