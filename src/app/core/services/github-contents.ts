import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

// Shared between ProgressService and CheatSheetService: both fetch a cse-coach contract
// file from a public GitHub repo, resolved from an optional `?repo=owner/name[@branch]`
// query value, through the same Contents-API request shape.

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

// A repo slug is "owner/name" or "owner/name@branch" — exactly one '@' at most, and exactly
// two non-empty '/'-parts either side of it.
const MAX_SLUG_AT_PARTS = 2;
const SLUG_PART_COUNT = 2;

const GITHUB_RAW_ACCEPT_HEADER = 'application/vnd.github.raw';

/** Parse "owner/name" or "owner/name@branch"; empty/missing input falls back to
 *  `defaultRepo`/`defaultBranch`, but a malformed slug (not exactly owner/name[@branch],
 *  every part non-empty) returns `null` instead of silently substituting the default — the
 *  caller decides how to surface that. */
export function repoRefFromQuery(
  raw: string | null | undefined,
  defaultRepo: string,
  defaultBranch: string,
): RepoRef | null {
  if (!raw) return splitSlug(defaultRepo, defaultBranch);
  const atParts = raw.split('@');
  if (atParts.length > MAX_SLUG_AT_PARTS) return null;
  const [slug, branch] = atParts;
  if (atParts.length === MAX_SLUG_AT_PARTS && !branch) return null;
  const parts = slug.split('/');
  if (parts.length !== SLUG_PART_COUNT || parts.some((p) => !p)) return null;
  return { owner: parts[0], repo: parts[1], branch: branch || defaultBranch };
}

function splitSlug(slug: string, branch: string): RepoRef {
  const [owner, repo] = slug.split('/');
  return { owner, repo, branch };
}

function apiUrl(ref: RepoRef, file: string, bust: boolean): string {
  const base = `https://api.github.com/repos/${ref.owner}/${ref.repo}/contents/${file}?ref=${encodeURIComponent(ref.branch)}`;
  return bust ? `${base}&_=${Date.now()}` : base;
}

function rawUrl(ref: RepoRef, file: string): string {
  return `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${ref.branch}/${file}`;
}

/**
 * GET a named file from a public repo via the GitHub Contents API
 * (`Accept: application/vnd.github.raw`, cache max-age 60 — a user-initiated refresh has to
 * return current data, and raw.githubusercontent's 5-minute CDN copy would not), falling
 * back to raw.githubusercontent.com only on the API's anonymous rate limit (403).
 */
export function fetchRepoFile$<T>(
  http: HttpClient,
  ref: RepoRef,
  file: string,
  bust: boolean,
): Observable<T> {
  const apiHeaders = new HttpHeaders({ Accept: GITHUB_RAW_ACCEPT_HEADER });
  return http.get<T>(apiUrl(ref, file, bust), { headers: apiHeaders, responseType: 'json' }).pipe(
    catchError((err) =>
      err?.status === 403
        ? http.get<T>(rawUrl(ref, file), { responseType: 'json' })
        : throwError(() => err),
    ),
  );
}
