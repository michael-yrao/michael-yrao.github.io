import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, catchError, firstValueFrom, map, of, tap } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { WORKER_API_URL } from '../data/site-links';
import { RepoRef } from '../services/github-file.service';
import { EngineStatus, NO_ENGINE_RUN, engineStatus } from './engine-status';
import { EngineUpdate, EngineVersions, engineUpdate, engineVersions } from './engine-update';

export type BuildResult = 'dispatched' | 'refused' | 'no-config' | 'failed';

export const ENGINE_STATUS_TTL_MS = 60_000;

/** Waits `ms` milliseconds; specs provide a no-op. */
export const ENGINE_DELAY = new InjectionToken<(ms: number) => Promise<void>>('ENGINE_DELAY', {
  providedIn: 'root',
  factory: () => (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
});

const RUNS_URL_BASE = 'https://api.github.com/repos/';
const RUNS_URL_TAIL = '/actions/runs?per_page=1';
const BUILD_ROUTE = 'engine/weekly-build';
const UPDATE_ROUTE = 'engine/update';
const APPROVE_ROUTE = 'engine/approve-week';
const HTTP_FORBIDDEN = 403;
const HTTP_CONFLICT = 409;
const REFUSED_CODE = 'integration-refused';
const NO_CONFIG_CODE = 'no-config';

interface CachedStatus {
  readonly at: number;
  readonly status: EngineStatus;
}

function slugOf(ref: RepoRef): string {
  return `${ref.owner}/${ref.repo}`.toLowerCase();
}

function buildFailure(err: unknown): BuildResult {
  if (!(err instanceof HttpErrorResponse)) return 'failed';
  const code = (err.error as { error?: unknown } | null)?.error;
  if (err.status === HTTP_FORBIDDEN && code === REFUSED_CODE) return 'refused';
  if (err.status === HTTP_CONFLICT && code === NO_CONFIG_CODE) return 'no-config';
  return 'failed';
}

/** Reads a repo's latest Actions run (public, unauthenticated) and asks the Worker to dispatch the weekly build. */
@Injectable({ providedIn: 'root' })
export class EngineService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private cache: ReadonlyMap<string, CachedStatus> = new Map();

  /** The newest run's status; a read inside the TTL is served from memory unless `bust`. */
  status$(ref: RepoRef, bust = false): Observable<EngineStatus> {
    const slug = slugOf(ref);
    const hit = this.cache.get(slug);
    if (!bust && hit !== undefined && Date.now() - hit.at < ENGINE_STATUS_TTL_MS) {
      return of(hit.status);
    }
    return this.http.get<unknown>(`${RUNS_URL_BASE}${ref.owner}/${ref.repo}${RUNS_URL_TAIL}`).pipe(
      map(engineStatus),
      tap((status) => {
        this.cache = new Map(this.cache).set(slug, { at: Date.now(), status });
      }),
      catchError(() => of(NO_ENGINE_RUN)),
    );
  }

  async buildNextWeek(ref: RepoRef): Promise<BuildResult> {
    const token = await this.auth.getToken();
    if (token === null) return 'failed';
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    try {
      await firstValueFrom(
        this.http.post<unknown>(
          `${WORKER_API_URL}${BUILD_ROUTE}`,
          { owner: ref.owner, repo: ref.repo },
          { headers },
        ),
      );
      return 'dispatched';
    } catch (err) {
      return buildFailure(err);
    }
  }

  /** Asks the Worker to remove the draft marker from the week starting `weekOf`; true on success. */
  async approveWeek(ref: RepoRef, weekOf: string): Promise<boolean> {
    const token = await this.auth.getToken();
    if (token === null) return false;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    try {
      await firstValueFrom(
        this.http.post<unknown>(
          `${WORKER_API_URL}${APPROVE_ROUTE}`,
          { owner: ref.owner, repo: ref.repo, weekOf },
          { headers },
        ),
      );
      return true;
    } catch {
      return false;
    }
  }

  /** Asks the Worker to update (or, on a dry run, to plan updating) the repo's engine files; null on any failure. */
  async update(ref: RepoRef, opts: { readonly dryRun: boolean }): Promise<EngineUpdate | null> {
    return this.postUpdate(ref, { dryRun: opts.dryRun }, engineUpdate);
  }

  /** The repo's and the template's engine versions only (a cheap Worker answer); null on any failure. */
  async versions(ref: RepoRef): Promise<EngineVersions | null> {
    return this.postUpdate(ref, { versionsOnly: true }, engineVersions);
  }

  private async postUpdate<T>(
    ref: RepoRef,
    extra: Readonly<Record<string, boolean>>,
    parse: (payload: unknown) => T | null,
  ): Promise<T | null> {
    const token = await this.auth.getToken();
    if (token === null) return null;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    try {
      const body = await firstValueFrom(
        this.http.post<unknown>(
          `${WORKER_API_URL}${UPDATE_ROUTE}`,
          { owner: ref.owner, repo: ref.repo, ...extra },
          { headers },
        ),
      );
      return parse(body);
    } catch {
      return null;
    }
  }
}
