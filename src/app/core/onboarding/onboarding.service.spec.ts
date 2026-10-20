import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';
import { ONBOARDING_DELAY, OnboardingService, OnboardingStep } from './onboarding.service';

const URL = `${WORKER_API_URL}onboard/dsa`;
const SLUG = 'ada/cse-progress';
const MAX_TICKS = 50;

interface Harness {
  readonly service: OnboardingService;
  readonly http: HttpTestingController;
  readonly calls: string[];
}

function setup(installed: readonly string[]): Harness {
  const calls: string[] = [];
  const auth = {
    getToken: async () => 'tok',
    login: () => 'ada',
    selectedRepo: () => null,
    selectRepo: () => calls.push('selectRepo'),
    repos: async () => {
      calls.push('repos');
      return [...installed];
    },
  };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: auth },
      { provide: ONBOARDING_DELAY, useValue: async () => undefined },
    ],
  });
  return { service: TestBed.inject(OnboardingService), http: TestBed.inject(HttpTestingController), calls };
}

/** The next POST to the onboard route, once the service has issued it. */
async function nextPost(http: HttpTestingController) {
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    const [req] = http.match(URL);
    if (req) return req;
    await new Promise((resolve) => setTimeout(resolve));
  }
  throw new Error('no POST issued');
}

const created = (ready: boolean) => ({ status: 'created', owner: 'ada', repo: 'cse-progress', ready });

describe('OnboardingService', () => {
  it('created, ready and installed ends done, selecting the repo before checking installs', async () => {
    const { service, http, calls } = setup([SLUG]);
    const run = service.startDsa();
    (await nextPost(http)).flush(created(true));
    await run;
    expect(service.step()).toBe('done');
    expect(calls).toEqual(['selectRepo', 'repos']);
  });

  it('not ready then ready takes two POSTs and ends done', async () => {
    const { service, http, calls } = setup([SLUG]);
    const run = service.startDsa();
    (await nextPost(http)).flush(created(false));
    const second = await nextPost(http);
    expect(calls).toEqual(['selectRepo']);
    second.flush(created(true));
    await run;
    expect(service.step()).toBe('done');
  });

  it('ready but not installed ends needs-install', async () => {
    const { service, http } = setup([]);
    const run = service.startDsa();
    (await nextPost(http)).flush(created(true));
    await run;
    expect(service.step()).toBe('needs-install');
  });

  it.each<{ name: string; installed: string[]; step: OnboardingStep; failure: string | null }>([
    { name: '403 with no installs needs install', installed: [], step: 'needs-install', failure: null },
    { name: '403 with installs needs re-authorize', installed: ['ada/other'], step: 'failed', failure: 'needs-reauthorize' },
  ])('$name', async ({ installed, step, failure }) => {
    const { service, http } = setup(installed);
    const run = service.startDsa();
    (await nextPost(http)).flush({ error: 'integration-refused' }, { status: 403, statusText: 'Forbidden' });
    await run;
    expect(service.step()).toBe(step);
    expect(service.failure()).toBe(failure);
  });

  it('check again after a 403 re-POSTs to create the repo', async () => {
    const { service, http } = setup([]);
    const run = service.startDsa();
    (await nextPost(http)).flush({ error: 'integration-refused' }, { status: 403, statusText: 'Forbidden' });
    await run;
    expect(service.step()).toBe('needs-install');
    const check = service.checkInstall();
    (await nextPost(http)).flush(created(true));
    await check;
    expect(service.repoSlug()).toBe(SLUG);
  });

  it('502 template-unavailable fails as invite-only', async () => {
    const { service, http } = setup([]);
    const run = service.startDsa();
    (await nextPost(http)).flush({ error: 'template-unavailable' }, { status: 502, statusText: 'Bad Gateway' });
    await run;
    expect(service.step()).toBe('failed');
    expect(service.failure()).toBe('invite-only');
  });
});
