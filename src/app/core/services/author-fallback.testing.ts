import { HttpTestingController } from '@angular/common/http/testing';

import { GOLD_STANDARD_REPO, RepoRef } from './github-file.service';
import { ContractSource } from './author-fallback';

const NOT_FOUND = { status: 404, statusText: 'Not Found' };
const REPO_IN_URL = /repos\/([^/]+\/[^/]+)\//;

const VIEWER_REPO: RepoRef = { owner: 'someone', repo: 'their-repo', branch: 'dev' };
const VIEWER_SLUG = 'someone/their-repo';
const GOLD_SLUG = `${GOLD_STANDARD_REPO.owner}/${GOLD_STANDARD_REPO.repo}`;

/** One case of the author-fallback table both contract services share. */
export interface FallbackRow {
  readonly name: string;
  readonly ref: RepoRef;
  /** Does the viewer's repo have the contract file (a 404 when not)? */
  readonly viewerHasFile: boolean;
  /** The `owner/repo` of each contract-file request, in order. */
  readonly fileRequests: readonly string[];
  readonly source: ContractSource;
  readonly sourceRef: RepoRef;
  readonly isAuthorFallback: boolean;
}

export const FALLBACK_ROWS: readonly FallbackRow[] = [
  {
    name: "viewer's repo has the file: one request, source viewer",
    ref: VIEWER_REPO,
    viewerHasFile: true,
    fileRequests: [VIEWER_SLUG],
    source: 'viewer',
    sourceRef: VIEWER_REPO,
    isAuthorFallback: false,
  },
  {
    name: "viewer's repo 404s: second request to the author's, marked as fallback",
    ref: VIEWER_REPO,
    viewerHasFile: false,
    fileRequests: [VIEWER_SLUG, GOLD_SLUG],
    source: 'gold-standard',
    sourceRef: GOLD_STANDARD_REPO,
    isAuthorFallback: true,
  },
  {
    name: 'viewer is the author: exactly one request, not a fallback',
    ref: GOLD_STANDARD_REPO,
    viewerHasFile: true,
    fileRequests: [GOLD_SLUG],
    source: 'gold-standard',
    sourceRef: GOLD_STANDARD_REPO,
    isAuthorFallback: false,
  },
];

/**
 * Answers every open request: manifests 404 (so the file is fetched by name), the contract file
 * 404s for the viewer's repo when `viewerHasFile` is false and returns `payload` otherwise.
 * Returns the `owner/repo` of each contract-file request, in order.
 */
export function settleRequests(
  http: HttpTestingController,
  payload: object,
  viewerHasFile: boolean,
): string[] {
  const fileRequests: string[] = [];
  for (let open = http.match(() => true); open.length > 0; open = http.match(() => true)) {
    for (const request of open) {
      const url = request.request.url;
      const slug = REPO_IN_URL.exec(url)?.[1] ?? '';
      if (url.includes('manifest.json')) {
        request.flush(null, NOT_FOUND);
        continue;
      }
      fileRequests.push(slug);
      if (slug === VIEWER_SLUG && !viewerHasFile) request.flush(null, NOT_FOUND);
      else request.flush(payload);
    }
  }
  return fileRequests;
}
