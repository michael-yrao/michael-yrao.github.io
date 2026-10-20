import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, InjectionToken, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';

export type OnboardingStep =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'checking-install'
  | 'needs-install'
  | 'done'
  | 'failed';

export type OnboardingFailure =
  | 'still-copying'
  | 'needs-reauthorize'
  | 'invite-only'
  | 'name-taken'
  | 'rate-limited'
  | 'other';

export const READY_RETRIES = 5;
export const READY_RETRY_DELAY_MS = 3000;
export const TRACK_KEY = 'po-study-track';
export const DSA_TRACK = 'dsa';

/** Waits `ms` milliseconds; specs provide a no-op. */
export const ONBOARDING_DELAY = new InjectionToken<(ms: number) => Promise<void>>(
  'ONBOARDING_DELAY',
  {
    providedIn: 'root',
    factory: () => (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  },
);

const ONBOARD_ROUTE = 'onboard/dsa';
const LEARNER_REPO = 'cse-progress';
const HTTP_FORBIDDEN = 403;
const HTTP_CONFLICT = 409;
const HTTP_RATE_LIMITED = 429;
const HTTP_BAD_GATEWAY = 502;

interface OnboardReply {
  readonly status: 'created' | 'adopted';
  readonly owner: string;
  readonly repo: string;
  readonly ready: boolean;
}

type PostResult =
  | { readonly isOk: true; readonly reply: OnboardReply }
  | { readonly isOk: false; readonly failure: OnboardingFailure | 'refused' };

function bearer(token: string): HttpHeaders {
  return new HttpHeaders({ Authorization: `Bearer ${token}` });
}

function errorCode(err: unknown): string | null {
  if (!(err instanceof HttpErrorResponse)) return null;
  const body = err.error as { error?: unknown } | null;
  return typeof body?.error === 'string' ? body.error : null;
}

/** Maps a Worker error to a failure; 'refused' means the App is not installed or not authorised. */
function failureFor(err: unknown): OnboardingFailure | 'refused' {
  const code = errorCode(err);
  const status = err instanceof HttpErrorResponse ? err.status : 0;
  if (status === HTTP_FORBIDDEN && code === 'integration-refused') return 'refused';
  if (status === HTTP_BAD_GATEWAY && code === 'template-unavailable') return 'invite-only';
  if (status === HTTP_CONFLICT && code === 'name-taken') return 'name-taken';
  if (status === HTTP_RATE_LIMITED && code === 'rate-limited') return 'rate-limited';
  return 'other';
}

function isOnboardReply(value: unknown): value is OnboardReply {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v['status'] === 'created' || v['status'] === 'adopted') &&
    typeof v['owner'] === 'string' &&
    typeof v['repo'] === 'string' &&
    typeof v['ready'] === 'boolean'
  );
}

function rememberTrack(): void {
  try {
    localStorage.setItem(TRACK_KEY, DSA_TRACK);
  } catch {
    // storage blocked: the choice will not survive this visit
  }
}

/** Creates (or adopts) the learner's cse-progress repo through the Worker and confirms the App can see it. */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly delay = inject(ONBOARDING_DELAY);

  private readonly stepState = signal<OnboardingStep>('idle');
  private readonly failureState = signal<OnboardingFailure | null>(null);
  private readonly repoSlugState = signal<string | null>(null);
  private readonly isAdoptedState = signal(false);
  /** Set only on a Worker 200; unlike `repoSlug`, never a display-only guess. */
  private confirmedSlug: string | null = null;

  readonly step = this.stepState.asReadonly();
  readonly failure = this.failureState.asReadonly();
  readonly repoSlug = this.repoSlugState.asReadonly();
  readonly isAdopted = this.isAdoptedState.asReadonly();

  async startDsa(): Promise<void> {
    rememberTrack();
    this.failureState.set(null);
    this.stepState.set('creating');
    const token = await this.auth.getToken();
    if (token === null) return this.fail('other');

    let result = await this.post(token);
    if (result.isOk) this.adopt(result.reply);
    for (let attempt = 0; result.isOk && !result.reply.ready; attempt++) {
      if (attempt === READY_RETRIES) return this.fail('still-copying');
      this.stepState.set('waiting');
      await this.delay(READY_RETRY_DELAY_MS);
      result = await this.post(token);
    }
    if (!result.isOk) return this.handleRefusal(result.failure);

    await this.checkInstall();
  }

  async checkInstall(): Promise<void> {
    this.stepState.set('checking-install');
    const slug = this.knownSlug();
    if (slug === null) return this.startDsa();
    const slugs = await this.auth.repos();
    const isVisible = slugs.some((s) => s.toLowerCase() === slug.toLowerCase());
    this.stepState.set(isVisible ? 'done' : 'needs-install');
  }

  private async post(token: string): Promise<PostResult> {
    try {
      const reply = await firstValueFrom(
        this.http.post<unknown>(`${WORKER_API_URL}${ONBOARD_ROUTE}`, {}, { headers: bearer(token) }),
      );
      return isOnboardReply(reply) ? { isOk: true, reply } : { isOk: false, failure: 'other' };
    } catch (err) {
      return { isOk: false, failure: failureFor(err) };
    }
  }

  private adopt(reply: OnboardReply): void {
    const slug = `${reply.owner}/${reply.repo}`;
    this.repoSlugState.set(slug);
    this.confirmedSlug = slug;
    this.isAdoptedState.set(reply.status === 'adopted');
    this.auth.selectRepo(slug);
  }

  private async handleRefusal(failure: OnboardingFailure | 'refused'): Promise<void> {
    if (failure !== 'refused') return this.fail(failure);
    const slugs = await this.auth.repos();
    if (slugs.length > 0) return this.fail('needs-reauthorize');
    this.repoSlugState.set(`${this.auth.login()}/${LEARNER_REPO}`);
    this.stepState.set('needs-install');
  }

  /** A repo the Worker confirmed this visit, else a stored selection that is the viewer's own cse-progress. */
  private knownSlug(): string | null {
    if (this.confirmedSlug !== null) return this.confirmedSlug;
    const selected = this.auth.selectedRepo();
    const own = `${this.auth.login()}/${LEARNER_REPO}`;
    if (selected === null || selected.toLowerCase() !== own.toLowerCase()) return null;
    this.repoSlugState.set(selected);
    return selected;
  }

  private fail(failure: OnboardingFailure): void {
    this.failureState.set(failure);
    this.stepState.set('failed');
  }
}
