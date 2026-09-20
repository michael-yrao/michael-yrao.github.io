import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';

import { ProgressData, PROGRESS_SCHEMA_VERSION } from '../models/progress.model';

// The dashboard renders any repo that follows the cse-coach schema. This is the default
// when no ?repo= is given; ?repo=owner/name overrides it for any PUBLIC repo.
export const DEFAULT_REPO = 'michael-yrao/cse-progress';
export const DEFAULT_BRANCH = 'main';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

/**
 * Fetches progress.json from a public GitHub repo.
 *
 * Primary source is the GitHub Contents API with `Accept: application/vnd.github.raw`
 * (Cache-Control max-age=60), NOT raw.githubusercontent (max-age=300). The reason is the
 * Refresh button: a user-initiated refresh has to return current data, and a click against
 * raw's 5-minute CDN copy would do nothing. On a 403 (the API's 60/hr anonymous limit) we
 * fall back to raw so the page still renders. Phase 2 (GitHub login) lifts the limit to
 * 5000/hr. All state is signals so the page stays declarative.
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<ProgressData | null>(null);
  readonly source = signal<RepoRef | null>(null);
  // A forced refresh keeps the current dashboard on screen (no blanking) and just spins the
  // button; refreshError surfaces a failed refresh inline without tearing down good data.
  readonly refreshing = signal(false);
  readonly refreshError = signal<string | null>(null);

  // Monotonic request id: a slow earlier fetch must not overwrite a newer one (the ?repo
  // param can change, and there is no HttpClient cancellation on a bare subscribe).
  private seq = 0;

  readonly repoSlug = computed(() => {
    const s = this.source();
    return s ? `${s.owner}/${s.repo}` : null;
  });

  constructor(private readonly http: HttpClient) {}

  /** Parse "owner/name" or "owner/name@branch"; falls back to the default repo. */
  parseRepo(raw: string | null | undefined): RepoRef {
    if (!raw) return this.split(DEFAULT_REPO, DEFAULT_BRANCH);
    const [slug, branch] = raw.split('@');
    const parts = slug.split('/').filter(Boolean);
    if (parts.length !== 2) return this.split(DEFAULT_REPO, DEFAULT_BRANCH);
    return { owner: parts[0], repo: parts[1], branch: branch || DEFAULT_BRANCH };
  }

  private split(slug: string, branch: string): RepoRef {
    const [owner, repo] = slug.split('/');
    return { owner, repo, branch };
  }

  private apiUrl(ref: RepoRef, bust: boolean): string {
    const base = `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/progress.json?ref=${encodeURIComponent(ref.branch)}`;
    return bust ? `${base}&_=${Date.now()}` : base;
  }

  private rawUrl(ref: RepoRef): string {
    return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}/progress.json`;
  }

  /** GET the contract, API-first with a raw fallback on the API's rate-limit (403). */
  private fetch$(ref: RepoRef, bust: boolean): Observable<ProgressData> {
    const apiHeaders = new HttpHeaders({ Accept: 'application/vnd.github.raw' });
    return this.http
      .get<ProgressData>(this.apiUrl(ref, bust), { headers: apiHeaders, responseType: 'json' })
      .pipe(
        catchError((err) =>
          err?.status === 403
            ? this.http.get<ProgressData>(this.rawUrl(ref), { responseType: 'json' })
            : throwError(() => err),
        ),
      );
  }

  /** Re-fetch the repo currently shown, bypassing caches. Used by the Refresh button. */
  refresh(): void {
    const cur = this.source();
    if (cur) this.load(`${cur.owner}/${cur.repo}@${cur.branch}`, true);
  }

  load(raw: string | null | undefined, force = false): void {
    const ref = this.parseRepo(raw);
    // Skip a redundant reload of the repo already shown (the effect can fire twice with the
    // same value). A forced refresh always proceeds; a retry (not ready) always proceeds.
    const cur = this.source();
    if (
      !force &&
      cur &&
      cur.owner === ref.owner &&
      cur.repo === ref.repo &&
      cur.branch === ref.branch &&
      this.status() === 'ready'
    ) {
      return;
    }

    const mine = ++this.seq;
    this.source.set(ref);
    if (force) {
      // Keep the current dashboard visible; just spin the button.
      this.refreshing.set(true);
      this.refreshError.set(null);
    } else {
      this.status.set('loading');
      this.error.set(null);
    }

    this.fetch$(ref, force)
      .pipe(catchError((err) => of(this.toError(err))))
      .subscribe((result) => {
        if (mine !== this.seq) return; // a newer load() superseded this response
        this.refreshing.set(false);

        if (result instanceof Error) {
          if (force) {
            // A failed refresh must not tear down good data already on screen.
            this.refreshError.set(result.message);
          } else {
            this.status.set('error');
            this.error.set(result.message);
            this.data.set(null);
          }
          return;
        }
        const invalid = this.invalidReason(result, ref);
        if (invalid) {
          if (force) {
            this.refreshError.set(invalid);
          } else {
            this.status.set('error');
            this.error.set(invalid);
            this.data.set(null);
          }
          return;
        }
        this.data.set(result);
        this.status.set('ready');
      });
  }

  /** null when the payload is a usable, compatible contract; else a human reason. */
  private invalidReason(result: ProgressData | null, ref: RepoRef): string | null {
    if (!result || typeof result.schemaVersion !== 'number') {
      return `${ref.owner}/${ref.repo} has no valid progress.json — is it a cse-coach repo?`;
    }
    if (result.schemaVersion > PROGRESS_SCHEMA_VERSION) {
      return `That repo's progress.json is schema v${result.schemaVersion}; this viewer speaks v${PROGRESS_SCHEMA_VERSION}. Update the site.`;
    }
    return null;
  }

  /** Turn an HttpErrorResponse into a human message (rate-limit / missing / offline). */
  private toError(err: { status?: number }): Error {
    if (err?.status === 404) {
      return new Error(
        'No progress.json found on that repo/branch. It must be a public cse-coach repo that has generated one.',
      );
    }
    if (err?.status === 403) {
      return new Error(
        'GitHub rate limit reached for anonymous requests. Sign in (coming soon) or try again shortly.',
      );
    }
    if (err?.status === 0) {
      return new Error('Could not reach GitHub — check your connection.');
    }
    return new Error(`Could not load progress (HTTP ${err?.status ?? '?'}).`);
  }
}
