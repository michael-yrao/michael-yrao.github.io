import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

/** The one place `michael-yrao/cse-progress@main` is spelled out. Both the progress
 *  dashboard's default repo and the showcase's hardcoded gold standard derive from this. */
export const GOLD_STANDARD_REPO: RepoRef = {
  owner: 'michael-yrao',
  repo: 'cse-progress',
  branch: 'main',
};

export const DEFAULT_BRANCH = GOLD_STANDARD_REPO.branch;
/** `owner/repo`, no branch — the "grounded in …" slug shown on the problem page badge, the
 *  groundedness meter, and (via `DEFAULT_REPO`) the progress dashboard's default. One spelling
 *  so the three never drift from each other or from `GOLD_STANDARD_REPO`. */
export const GOLD_STANDARD_SLUG = `${GOLD_STANDARD_REPO.owner}/${GOLD_STANDARD_REPO.repo}`;
export const DEFAULT_REPO = GOLD_STANDARD_SLUG;

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

// A repo slug is "owner/name" or "owner/name@branch" — exactly one '@' at most, and exactly
// two non-empty '/'-parts either side of it.
const MAX_SLUG_AT_PARTS = 2;
const SLUG_PART_COUNT = 2;

const NOT_FOUND_STATUS = 404;
const RATE_LIMIT_STATUS = 403;
const OFFLINE_STATUS = 0;

function splitSlug(slug: string, branch: string): RepoRef {
  const [owner, repo] = slug.split('/');
  return { owner, repo, branch };
}

/** Parse "owner/name" or "owner/name@branch"; empty/missing input falls back to the default
 *  repo, but a malformed slug (not exactly owner/name[@branch], every part non-empty) returns
 *  `null` instead of silently substituting the default — the caller decides how to surface that. */
export function parseRepoSlug(raw: string | null | undefined): RepoRef | null {
  if (!raw) return splitSlug(DEFAULT_REPO, DEFAULT_BRANCH);
  const atParts = raw.split('@');
  if (atParts.length > MAX_SLUG_AT_PARTS) return null;
  const [slug, branch] = atParts;
  if (atParts.length === MAX_SLUG_AT_PARTS && !branch) return null;
  const parts = slug.split('/');
  if (parts.length !== SLUG_PART_COUNT || parts.some((p) => !p)) return null;
  return { owner: parts[0], repo: parts[1], branch: branch || DEFAULT_BRANCH };
}

export function sameRef(a: RepoRef | null, b: RepoRef | null): boolean {
  if (!a || !b) return a === b;
  return a.owner === b.owner && a.repo === b.repo && a.branch === b.branch;
}

/** The GitHub blob URL for a line range, e.g. for the "Grounded" badge's link. */
export function blobUrl(ref: RepoRef, file: string, startLine: number, endLine: number): string {
  return `https://github.com/${ref.owner}/${ref.repo}/blob/${ref.branch}/${file}#L${startLine}-L${endLine}`;
}

/** Turns an HttpErrorResponse into a human message (rate-limit / missing / offline). `what`
 *  names the resource being fetched (e.g. 'progress' or 'solution code') and slots into the
 *  same wording the progress dashboard has always shown. */
export function httpErrorMessage(
  err: { status?: number } | null | undefined,
  what: string,
): string {
  const status = err?.status;
  if (status === NOT_FOUND_STATUS) {
    return `No ${what} data found on that repo/branch. It must be a public cse-coach repo that has generated one.`;
  }
  if (status === RATE_LIMIT_STATUS) {
    return 'GitHub rate limit reached for anonymous requests. Sign in (coming soon) or try again shortly.';
  }
  if (status === OFFLINE_STATUS) {
    return 'Could not reach GitHub — check your connection.';
  }
  return `Could not load ${what} (HTTP ${status ?? '?'}).`;
}

/**
 * Fetches a named file from a public GitHub repo.
 *
 * Primary source is the GitHub Contents API with `Accept: application/vnd.github.raw`
 * (Cache-Control max-age=60), NOT raw.githubusercontent (max-age=300) — a user-initiated
 * refresh has to return current data, and a click against raw's 5-minute CDN copy would do
 * nothing. On a 403 (the API's 60/hr anonymous limit) we fall back to raw so the page still
 * renders.
 */
@Injectable({ providedIn: 'root' })
export class GitHubFileService {
  constructor(private readonly http: HttpClient) {}

  private apiUrl(ref: RepoRef, file: string, bust: boolean): string {
    const base = `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${file}?ref=${encodeURIComponent(ref.branch)}`;
    return bust ? `${base}&_=${Date.now()}` : base;
  }

  private rawUrl(ref: RepoRef, file: string): string {
    return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}/${file}`;
  }

  /** GET a named file from the repo, API-first with a raw fallback on the API's rate-limit (403). */
  fetch$<T>(ref: RepoRef, file: string, bust: boolean): Observable<T> {
    const apiHeaders = new HttpHeaders({ Accept: 'application/vnd.github.raw' });
    return this.http
      .get<T>(this.apiUrl(ref, file, bust), { headers: apiHeaders, responseType: 'json' })
      .pipe(
        catchError((err) =>
          err?.status === RATE_LIMIT_STATUS
            ? this.http.get<T>(this.rawUrl(ref, file), { responseType: 'json' })
            : throwError(() => err),
        ),
      );
  }
}
