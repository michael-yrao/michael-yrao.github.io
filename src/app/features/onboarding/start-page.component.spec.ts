import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';
import { OnboardingService } from '../../core/onboarding/onboarding.service';
import { StartPageComponent } from './start-page.component';

const INSTALL_URL = 'https://github.com/apps/progressive-overflow/installations/new';

function setup(
  query: Record<string, string>,
  step = 'idle',
  selectedRepo: string | null = null,
  listedRepos: readonly string[] = [],
) {
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
    installUrl: INSTALL_URL,
    signIn: vi.fn(),
    selectedRepo: () => selectedRepo,
    repos: vi.fn(async () => listedRepos),
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

  describe('DSA card', () => {
    const cases = [
      { name: 'stored own repo, listed', selected: 'ada/cse-progress', listed: ['ada/cse-progress'], slug: 'ada/cse-progress', hasCheck: true, hasAccess: false },
      { name: 'stored own repo, not listed', selected: 'ada/cse-progress', listed: [], slug: 'ada/cse-progress', hasCheck: false, hasAccess: true },
      { name: 'listed own repo, any case', selected: null, listed: ['Ada/CSE-Progress'], slug: 'Ada/CSE-Progress', hasCheck: true, hasAccess: false },
      { name: 'no repo', selected: null, listed: [], slug: null, hasCheck: false, hasAccess: false },
    ];

    it.each(cases)('$name', async ({ selected, listed, slug, hasCheck, hasAccess }) => {
      const { fixture, element } = setup({}, 'idle', selected, listed);
      await fixture.whenStable();
      fixture.detectChanges();
      const buttons = Array.from(element.querySelectorAll('button')).map((b) => b.textContent?.trim());
      expect(element.querySelector('.start__repo-slug')?.textContent?.trim() ?? null).toBe(slug);
      expect(buttons.includes('Start DSA')).toBe(slug === null);
      expect(buttons.includes('Go to my board')).toBe(slug !== null);
      expect(element.querySelector('.start__repo app-icon') !== null).toBe(hasCheck);
      const access = element.querySelector<HTMLAnchorElement>('.start__access');
      expect(access !== null).toBe(hasAccess);
      if (access) {
        expect(access.textContent).toContain('Allow Progressive Overflow to save to this repo');
        expect(access.getAttribute('href')).toBe(INSTALL_URL);
      }
    });

    it('Go to my board navigates home', async () => {
      const { fixture, element } = setup({}, 'idle', 'ada/cse-progress');
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
      Array.from(element.querySelectorAll('button'))
        .find((b) => b.textContent?.trim() === 'Go to my board')
        ?.click();
      expect(navigate).toHaveBeenCalledWith('/');
      await fixture.whenStable();
    });
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
