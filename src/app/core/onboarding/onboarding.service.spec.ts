import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';
import { GitHubFileService } from '../services/github-file.service';
import { ProgressService } from '../services/progress.service';
import {
  BUILD_POLL_MAX,
  IntakeForm,
  ONBOARDING_DELAY,
  OnboardingService,
  OnboardingStep,
} from './onboarding.service';

const URL = `${WORKER_API_URL}onboard/dsa`;
const INTAKE_URL = `${WORKER_API_URL}onboard/intake`;
const SLUG = 'ada/cse-progress';
const MAX_TICKS = 50;
const FORM: IntakeForm = {
  name: 'Ada',
  target: 'faang_interview',
  timezone: 'America/New_York',
  startDate: '2026-10-19',
};

const configFound = (): Observable<string> => of('config');
const configMissing = (): Observable<string> =>
  throwError(() => new HttpErrorResponse({ status: 404 }));

interface Harness {
  readonly service: OnboardingService;
  readonly http: HttpTestingController;
  readonly calls: string[];
  readonly refresh: ReturnType<typeof vi.fn>;
  readonly fetchText: ReturnType<typeof vi.fn>;
}

function setup(
  installed: readonly string[],
  config: () => Observable<string> = configFound,
): Harness {
  const calls: string[] = [];
  const refresh = vi.fn();
  const fetchText = vi.fn(config);
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
      { provide: GitHubFileService, useValue: { fetchText$: fetchText } },
      { provide: ProgressService, useValue: { refresh } },
    ],
  });
  return {
    service: TestBed.inject(OnboardingService),
    http: TestBed.inject(HttpTestingController),
    calls,
    refresh,
    fetchText,
  };
}

/** The next POST to the given route (default: the onboard route), once the service has issued it. */
async function nextPost(http: HttpTestingController, url: string = URL) {
  for (let tick = 0; tick < MAX_TICKS; tick++) {
    const [req] = http.match(url);
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

  it.each<{
    name: string;
    config: () => Observable<string>;
    isAdopted: boolean;
    step: OnboardingStep;
    hasConfig: boolean;
    refreshes: number;
  }>([
    { name: 'adopted with config ends done', config: configFound, isAdopted: true, step: 'done', hasConfig: true, refreshes: 1 },
    { name: 'created with no config ends at the intake form', config: configMissing, isAdopted: false, step: 'intake', hasConfig: false, refreshes: 0 },
  ])('$name', async ({ config, isAdopted, step, hasConfig, refreshes }) => {
    const { service, http, refresh } = setup([SLUG], config);
    const run = service.startDsa();
    (await nextPost(http)).flush({ ...created(true), status: isAdopted ? 'adopted' : 'created' });
    await run;
    expect(service.step()).toBe(step);
    expect(service.hasConfig()).toBe(hasConfig);
    expect(refresh).toHaveBeenCalledTimes(refreshes);
  });

  describe('submitIntake', () => {
    async function atIntake(config: () => Observable<string>) {
      const harness = setup([SLUG], config);
      const run = harness.service.startDsa();
      (await nextPost(harness.http)).flush(created(true));
      await run;
      return harness;
    }

    it('posts the four fields, polls until the config appears, then refreshes', async () => {
      let polls = 0;
      const { service, http, refresh, fetchText } = await atIntake(configMissing);
      expect(service.step()).toBe('intake');
      fetchText.mockImplementation(() => (++polls < 3 ? configMissing() : configFound()));
      const run = service.submitIntake(FORM);
      const post = await nextPost(http, INTAKE_URL);
      expect(post.request.body).toEqual(FORM);
      post.flush({ status: 'queued' });
      await run;
      expect(polls).toBe(3);
      expect(service.step()).toBe('done');
      expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('ends at build-timeout once the polls are used up', async () => {
      const { service, http, fetchText } = await atIntake(configMissing);
      fetchText.mockClear();
      const run = service.submitIntake(FORM);
      (await nextPost(http, INTAKE_URL)).flush({ status: 'queued' });
      await run;
      expect(fetchText).toHaveBeenCalledTimes(BUILD_POLL_MAX);
      expect(service.step()).toBe('build-timeout');
    });

    it.each<{
      name: string;
      status: number;
      error: string;
      step: OnboardingStep;
      failure: string | null;
      refreshes: number;
    }>([
      { name: '409 already-onboarded with a config ends done', status: 409, error: 'already-onboarded', step: 'done', failure: null, refreshes: 1 },
      { name: '400 invalid-timezone fails as invalid-intake', status: 400, error: 'invalid-timezone', step: 'failed', failure: 'invalid-intake', refreshes: 0 },
    ])('$name', async ({ status, error, step, failure, refreshes }) => {
      const { service, http, refresh, fetchText } = await atIntake(configMissing);
      fetchText.mockImplementation(configFound);
      const run = service.submitIntake(FORM);
      (await nextPost(http, INTAKE_URL)).flush({ error }, { status, statusText: 'Error' });
      await run;
      expect(service.step()).toBe(step);
      expect(service.failure()).toBe(failure);
      expect(refresh).toHaveBeenCalledTimes(refreshes);
    });
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
