import { Observable, catchError, map, throwError } from 'rxjs';

import {
  GOLD_STANDARD_REPO,
  GitHubFileService,
  NOT_FOUND_STATUS,
  RepoRef,
  sameRef,
} from './github-file.service';

/** Whose repo a contract's body came from. */
export type ContractSource = 'viewer' | 'gold-standard';

/** A fetched body plus the repo it actually came from. */
export interface SourcedBody<T> {
  readonly body: T;
  readonly source: ContractSource;
  readonly sourceRef: RepoRef;
}

/** True when `sourceRef`'s code is the author's while the viewer asked for a different repo. */
export function isAuthorFallbackOf(source: ContractSource | null, requested: RepoRef): boolean {
  return source === 'gold-standard' && !sameRef(requested, GOLD_STANDARD_REPO);
}

/**
 * Fetches `file` from the viewer's repo; on an HTTP 404 only, from the gold-standard repo.
 * The gold-standard repo itself is fetched once, with no fallback. Any other error (rate
 * limit, 5xx, offline) is the viewer's error, never a silent fallback.
 */
export function fetchWithAuthorFallback$<T>(
  github: GitHubFileService,
  ref: RepoRef,
  file: string,
  bust: boolean,
): Observable<SourcedBody<T>> {
  const fromGold$ = (): Observable<SourcedBody<T>> =>
    github.fetch$<T>(GOLD_STANDARD_REPO, file, bust).pipe(
      map((body): SourcedBody<T> => ({
        body,
        source: 'gold-standard',
        sourceRef: GOLD_STANDARD_REPO,
      })),
    );
  if (sameRef(ref, GOLD_STANDARD_REPO)) return fromGold$();

  return github.fetch$<T>(ref, file, bust).pipe(
    map((body): SourcedBody<T> => ({ body, source: 'viewer', sourceRef: ref })),
    catchError((err) => (err?.status === NOT_FOUND_STATUS ? fromGold$() : throwError(() => err))),
  );
}
