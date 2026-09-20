import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import {
  ProgressData,
  PROGRESS_SCHEMA_VERSION,
} from '../models/progress.model';

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
 * Fetches progress.json from a public GitHub repo's raw content. No auth is needed for a
 * public repo (Phase 1); GitHub login (Phase 2) will only add auto-discovery, higher rate
 * limits and private-repo access on top of this. All state is exposed as signals so the
 * page stays declarative.
 */
@Injectable({ providedIn: 'root' })
export class ProgressService {
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<ProgressData | null>(null);
  readonly source = signal<RepoRef | null>(null);

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

  load(raw: string | null | undefined): void {
    const ref = this.parseRepo(raw);
    // Skip a redundant reload of the repo already shown (the effect can fire twice with the
    // same value). Only skip when we actually have data for it — never skip a retry.
    const cur = this.source();
    if (
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
    this.status.set('loading');
    this.error.set(null);

    const url = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}/progress.json`;

    this.http
      .get<ProgressData>(url, { responseType: 'json' })
      .pipe(catchError((err) => of(this.toError(err))))
      .subscribe((result) => {
        if (mine !== this.seq) return; // a newer load() superseded this response
        if (result instanceof Error) {
          this.status.set('error');
          this.error.set(result.message);
          this.data.set(null);
          return;
        }
        if (!result || typeof result.schemaVersion !== 'number') {
          this.status.set('error');
          this.error.set(
            `${ref.owner}/${ref.repo} has no valid progress.json — is it a cse-coach repo?`,
          );
          this.data.set(null);
          return;
        }
        if (result.schemaVersion > PROGRESS_SCHEMA_VERSION) {
          this.status.set('error');
          this.error.set(
            `That repo's progress.json is schema v${result.schemaVersion}; this viewer speaks v${PROGRESS_SCHEMA_VERSION}. Update the site.`,
          );
          this.data.set(null);
          return;
        }
        this.data.set(result);
        this.status.set('ready');
      });
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
