import type { RepoRef } from '../../core/services/github-file.service';

/** GitHub's contents API can lag a push, so an unchanged manifest after a `repoChanged` turn gets one retry. */
export const COACH_REFRESH_RETRY_MS = 5_000;

export interface CoachRefreshDeps {
  readonly refreshProgress: () => void;
  readonly loadedPracticeRef: () => RepoRef | null;
  readonly loadPractice: (ref: RepoRef, bust: true) => void;
  readonly manifestHash: () => Promise<string | null>;
  readonly delay: (ms: number) => Promise<void>;
}

function refreshOnce(deps: CoachRefreshDeps): void {
  deps.refreshProgress();
  const ref = deps.loadedPracticeRef();
  if (ref) deps.loadPractice(ref, true);
}

/** After a turn: when the repo moved, re-read the board and the practice contract past their caches. */
export async function refreshAfterTurn(e: { readonly repoChanged: boolean }, deps: CoachRefreshDeps): Promise<void> {
  if (!e.repoChanged) return;
  const before = await deps.manifestHash();
  refreshOnce(deps);
  const after = await deps.manifestHash();
  if (after !== before) return;
  await deps.delay(COACH_REFRESH_RETRY_MS);
  refreshOnce(deps);
}
