import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, from, map, of, shareReplay, switchMap, tap, throwError } from 'rxjs';

import { AuthService } from '../auth/auth.service';
import { CONTENT_REPO_SLUG, DEMO_REPO_SLUG } from '../data/site-links';
import { contractCache, contractKey, contractKeyPrefix } from './contract-cache';
import { ContractManifest, MANIFEST_FILE, manifestHash, parseManifest } from './contract-manifest';

export interface RepoRef {
  owner: string;
  repo: string;
  branch: string;
}

export const DEFAULT_BRANCH = 'main';

function refOfSlug(slug: string): RepoRef {
  const [owner, repo] = slug.split('/');
  return { owner, repo, branch: DEFAULT_BRANCH };
}

/** The public content repo every signed-out content surface reads (solutions, practice, showcase, big-o,
 *  cheat sheets, pattern-sense deck). Its slug is spelled once, in `CONTENT_REPO_SLUG`. */
export const CONTENT_REPO: RepoRef = refOfSlug(CONTENT_REPO_SLUG);

/** The public demo repo the signed-out board (progress summary, progress, schedule history) reads. Its slug is
 *  spelled once, in `DEMO_REPO_SLUG`. */
export const DEMO_REPO: RepoRef = refOfSlug(DEMO_REPO_SLUG);

/** `owner/repo`, no branch — the "grounded in …" slug shown on the problem page badge and the groundedness meter. */
export const CONTENT_SLUG = `${CONTENT_REPO.owner}/${CONTENT_REPO.repo}`;
/** `owner/repo` of the board's default repo: what the progress dashboard reads with no `?repo=`. */
export const DEFAULT_REPO = `${DEMO_REPO.owner}/${DEMO_REPO.repo}`;

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

// A repo slug is "owner/name" or "owner/name@branch" — exactly one '@' at most, and exactly
// two non-empty '/'-parts either side of it.
const MAX_SLUG_AT_PARTS = 2;
const SLUG_PART_COUNT = 2;

export const NOT_FOUND_STATUS = 404;
const RATE_LIMIT_STATUS = 403;
const TOO_MANY_REQUESTS_STATUS = 429;
const SERVER_ERROR_STATUS = 500;
const OFFLINE_STATUS = 0;
// A stale or revoked user token must not hide public content; a private repo still 404s anonymously.
const TOKEN_REJECTED_STATUSES: readonly number[] = [401, 403];

/** One entry of a directory listing: its file name and `file` / `dir` kind. */
export interface DirEntry {
  readonly name: string;
  readonly type: string;
}

function isDirEntry(entry: unknown): entry is DirEntry {
  const candidate = entry as { name?: unknown; type?: unknown } | null;
  return typeof candidate?.name === 'string' && typeof candidate?.type === 'string';
}

/** Encodes each `/`-separated branch segment, keeping the slashes literal for the raw host. */
function encodeBranchPath(branch: string): string {
  return branch.split('/').map(encodeURIComponent).join('/');
}

/** Parse "owner/name" or "owner/name@branch"; empty/missing input returns `fallback` (the content repo unless
 *  the caller is the board, which passes `DEMO_REPO`), but a malformed slug (not exactly owner/name[@branch],
 *  every part non-empty) returns `null` instead of silently substituting the fallback — the caller decides how
 *  to surface that. */
export function parseRepoSlug(raw: string | null | undefined, fallback: RepoRef = CONTENT_REPO): RepoRef | null {
  if (!raw) return fallback;
  const atParts = raw.split('@');
  if (atParts.length > MAX_SLUG_AT_PARTS) return null;
  const [slug, branch] = atParts;
  if (atParts.length === MAX_SLUG_AT_PARTS && !branch) return null;
  const parts = slug.split('/');
  if (parts.length !== SLUG_PART_COUNT || parts.some((p) => !p)) return null;
  return { owner: parts[0], repo: parts[1], branch: branch || DEFAULT_BRANCH };
}

/** The message for a `?repo=` value `parseRepoSlug` rejected — shared by the Progress and
 *  Practice pages so a malformed slug reads the same on both. */
export function invalidSlugMessage(raw: string | null | undefined): string {
  return `'${raw}' isn't a repo slug — use owner/name or owner/name@branch.`;
}

export function sameRef(a: RepoRef | null, b: RepoRef | null): boolean {
  if (!a || !b) return a === b;
  return a.owner === b.owner && a.repo === b.repo && a.branch === b.branch;
}

/** The GitHub blob URL of a whole file — the Progress page's `src` link to the learner's own
 *  solution (progress.json's `file`, honouring `?repo=`). The one spelling of `blob/<branch>/`;
 *  `blobUrl` narrows it to a line range. */
export function fileUrl(ref: RepoRef, file: string): string {
  return `https://github.com/${ref.owner}/${ref.repo}/blob/${ref.branch}/${file}`;
}

/** The GitHub blob URL for a line range, e.g. for the "Grounded" badge's link. */
export function blobUrl(ref: RepoRef, file: string, startLine: number, endLine: number): string {
  return `${fileUrl(ref, file)}#L${startLine}-L${endLine}`;
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
    return `No ${what} data found on that repo/branch. It must be a cse-coach repo that has generated one, and either public or installed on the site's GitHub App.`;
  }
  if (status === RATE_LIMIT_STATUS || status === TOO_MANY_REQUESTS_STATUS) {
    return 'GitHub rate limit reached. Sign in with GitHub or try again shortly.';
  }
  if (status === OFFLINE_STATUS) {
    return 'Could not reach GitHub — check your connection.';
  }
  if (status !== undefined && status >= SERVER_ERROR_STATUS) {
    return `GitHub is having trouble serving ${what}; try again in a minute.`;
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
  private readonly auth = inject(AuthService);

  constructor(private readonly http: HttpClient) {}

  // Per `owner/repo@branch`, replaced (never mutated) when a bust re-fetches the manifest.
  private manifests: ReadonlyMap<string, Observable<ContractManifest | null>> = new Map();

  /** The content hash (`v`) is the cache key; with none, a bust falls back to a timestamp. */
  private apiUrl(ref: RepoRef, file: string, hash: string | null, bust: boolean): string {
    const base = `https://api.github.com/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/contents/${file}?ref=${encodeURIComponent(ref.branch)}`;
    if (hash) return `${base}&v=${hash}`;
    return bust ? `${base}&_=${Date.now()}` : base;
  }

  private rawUrl(ref: RepoRef, file: string): string {
    return `https://raw.githubusercontent.com/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/${encodeBranchPath(ref.branch)}/${file}`;
  }

  // Refs whose memoized manifest request has finished; a bust reuses one still in flight, so a
  // Refresh that re-loads summary + details + history asks for the manifest once.
  private settledManifests: ReadonlySet<string> = new Set();

  /** The repo's manifest, memoized per ref; null on a 404, any error or an invalid body. */
  private manifest$(ref: RepoRef, bust: boolean): Observable<ContractManifest | null> {
    const refKey = `${ref.owner}/${ref.repo}@${ref.branch}`;
    const memo = this.manifests.get(refKey);
    if (memo && (!bust || !this.settledManifests.has(refKey))) return memo;
    const fresh: Observable<ContractManifest | null> = this.network$<unknown>(
      ref,
      MANIFEST_FILE,
      null,
      bust,
    ).pipe(
      map(parseManifest),
      catchError(() => of(null)),
      tap(() => this.markSettled(refKey, fresh)),
      shareReplay(1),
    );
    this.manifests = new Map(this.manifests).set(refKey, fresh);
    this.settledManifests = new Set([...this.settledManifests].filter((key) => key !== refKey));
    return fresh;
  }

  private markSettled(refKey: string, request: Observable<ContractManifest | null>): void {
    if (this.manifests.get(refKey) !== request) return; // a newer bust replaced this request
    this.settledManifests = new Set(this.settledManifests).add(refKey);
  }

  /** The Contents-API headers; a token adds `Authorization: Bearer`. */
  private apiHeaders(token: string | null): HttpHeaders {
    const headers = new HttpHeaders({ Accept: 'application/vnd.github.raw' });
    return token ? headers.set('Authorization', `Bearer ${token}`) : headers;
  }

  /** Signed out: `anonymous$` exactly as before, issued synchronously on subscribe. Signed in: the
   *  token is resolved once and `authed$` runs with it (no raw fallback); a null token is signed out. */
  private withAuth$<T>(
    anonymous$: () => Observable<T>,
    authed$: (token: string) => Observable<T>,
  ): Observable<T> {
    if (!this.auth.isSignedIn()) return anonymous$();
    return from(this.auth.getToken()).pipe(
      switchMap((token) =>
        token
          ? authed$(token).pipe(
              catchError((err) =>
                TOKEN_REJECTED_STATUSES.includes(err?.status) ? anonymous$() : throwError(() => err),
              ),
            )
          : anonymous$(),
      ),
    );
  }

  /** API-first with a raw fallback on the API's rate-limit (403); signed in, authenticated with no fallback. */
  private network$<T>(
    ref: RepoRef,
    file: string,
    hash: string | null,
    bust: boolean,
  ): Observable<T> {
    const url = this.apiUrl(ref, file, hash, bust);
    return this.withAuth$<T>(
      () =>
        this.http
          .get<T>(url, { headers: this.apiHeaders(null), responseType: 'json' })
          .pipe(
            catchError((err) =>
              err?.status === RATE_LIMIT_STATUS
                ? this.http.get<T>(this.rawUrl(ref, file), { responseType: 'json' })
                : throwError(() => err),
            ),
          ),
      (token) => this.http.get<T>(url, { headers: this.apiHeaders(token), responseType: 'json' }),
    );
  }

  /** A body already cached under its hash is served with no request; a miss fetches, then caches. */
  private cached$<T>(ref: RepoRef, file: string, hash: string): Observable<T> {
    const prefix = contractKeyPrefix(ref, file);
    const key = contractKey(prefix, hash);
    return from(contractCache.read<T>(key)).pipe(
      switchMap((hit) =>
        hit !== null
          ? of(hit)
          : this.network$<T>(ref, file, hash, false).pipe(
              tap((body) => void contractCache.write(key, body).then(() => contractCache.prune(prefix, key))),
            ),
      ),
    );
  }

  /** The hash the repo's already-loaded manifest lists for `file`, awaiting a bust still in flight.
   *  Null when no manifest was loaded for the ref or the file is unlisted; never starts a request. */
  async manifestHashFor(ref: RepoRef, file: string): Promise<string | null> {
    const memo = this.manifests.get(`${ref.owner}/${ref.repo}@${ref.branch}`);
    if (!memo) return null;
    return manifestHash(await firstValueFrom(memo), file);
  }

  // Both reads below always bust: an attempt file can be overwritten, and a 60 s cached copy
  // would hide a just-completed rep.
  /** The entries of a repo directory; `[]` on a 404 or a body that is not a listing. No raw
   *  fallback (raw.githubusercontent cannot list a directory) and no manifest path. */
  listDir$(ref: RepoRef, dir: string): Observable<readonly DirEntry[]> {
    const url = this.apiUrl(ref, dir, null, true);
    const list$ = (token: string | null): Observable<readonly DirEntry[]> =>
      this.http.get<unknown>(url, { headers: this.apiHeaders(token), responseType: 'json' }).pipe(
        map((body) => (Array.isArray(body) ? body.filter(isDirEntry) : [])),
        catchError((err) => (err?.status === NOT_FOUND_STATUS ? of([]) : throwError(() => err))),
      );
    return this.withAuth$(() => list$(null), list$);
  }

  /** A text file's body (not JSON), API-first with a raw fallback on a 403 (signed out only). */
  fetchText$(ref: RepoRef, file: string): Observable<string> {
    const url = this.apiUrl(ref, file, null, true);
    return this.withAuth$<string>(
      () =>
        this.http.get(url, { headers: this.apiHeaders(null), responseType: 'text' }).pipe(
          catchError((err) =>
            err?.status === RATE_LIMIT_STATUS
              ? this.http.get(this.rawUrl(ref, file), { responseType: 'text' })
              : throwError(() => err),
          ),
        ),
      (token) => this.http.get(url, { headers: this.apiHeaders(token), responseType: 'text' }),
    );
  }

  /** GET a named file from the repo; keyed by the manifest's hash when it lists the file. */
  fetch$<T>(ref: RepoRef, file: string, bust: boolean): Observable<T> {
    return this.manifest$(ref, bust).pipe(
      switchMap((manifest) => {
        const hash = manifestHash(manifest, file);
        return hash ? this.cached$<T>(ref, file, hash) : this.network$<T>(ref, file, null, bust);
      }),
    );
  }
}
