import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { OnboardingService } from '../../core/onboarding/onboarding.service';
import { StartPageComponent } from './start-page.component';

function setup(query: Record<string, string>, step = 'idle') {
  const onboarding = {
    step: signal(step),
    failure: signal(null),
    repoSlug: signal(null),
    isAdopted: signal(false),
    hasConfig: signal(false),
    startDsa: vi.fn(async () => undefined),
    checkInstall: vi.fn(async () => undefined),
    checkAgain: vi.fn(async () => undefined),
    submitIntake: vi.fn(async () => undefined),
  };
  const auth = {
    isSignedIn: () => true,
    login: () => 'ada',
    appSlug: 'progressive-overflow',
    signIn: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: AuthService, useValue: auth },
      { provide: OnboardingService, useValue: onboarding },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
    ],
  });
  const fixture = TestBed.createComponent(StartPageComponent);
  fixture.detectChanges();
  return { onboarding, fixture, element: fixture.nativeElement as HTMLElement };
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

  describe('intake form', () => {
    const TIMEZONE_ID = '#intake-timezone';

    it('submits the four fields', () => {
      const { onboarding, fixture, element } = setup({}, 'intake');
      fixture.detectChanges();
      const toggles = Array.from(element.querySelectorAll<HTMLButtonElement>('.start__toggle'));
      toggles.find((b) => b.textContent?.trim() === 'Interview prep, big tech')?.click();
      fixture.detectChanges();
      element.querySelector<HTMLFormElement>('form')?.dispatchEvent(new Event('submit'));
      const zone = element.querySelector<HTMLSelectElement>(TIMEZONE_ID)?.value;
      expect(onboarding.submitIntake).toHaveBeenCalledWith({
        name: 'ada',
        target: 'faang_interview',
        timezone: zone,
        startDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      });
    });

    it('defaults the timezone from the browser', () => {
      const { fixture, element } = setup({}, 'intake');
      fixture.detectChanges();
      const select = element.querySelector<HTMLSelectElement>(TIMEZONE_ID);
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const options = Array.from(select?.options ?? []).map((o) => o.value);
      expect(select?.value).toBe(options.includes(local) ? local : options[0]);
    });
  });

  it('?resume=1 calls checkInstall', () => {
    const { onboarding } = setup({ resume: '1' });
    expect(onboarding.checkInstall).toHaveBeenCalledTimes(1);
  });
});
