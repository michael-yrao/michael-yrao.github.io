import { GitHubFileService, type RepoRef } from '../../core/services/github-file.service';
import { PracticeService } from '../../core/services/practice.service';
import { ProgressService } from '../../core/services/progress.service';
import type { CoachRefreshDeps } from './coach-refresh';

const PRACTICE_CONTRACT_FILE = 'dashboard/practice.json';

/** Wires `refreshAfterTurn` to the real services: the board, the practice contract and the manifest hash. */
export function buildRefreshDeps(
  progress: ProgressService,
  practice: PracticeService,
  github: GitHubFileService,
): CoachRefreshDeps {
  const loadedPracticeRef = (): RepoRef | null => (practice.status() === 'ready' ? practice.ref() : null);
  return {
    refreshProgress: () => progress.refresh(),
    loadedPracticeRef,
    loadPractice: (ref, bust) => practice.load(ref, bust),
    manifestHash: async () => {
      const ref = loadedPracticeRef() ?? progress.repoRef();
      if (ref === null) return null;
      return github.manifestHashFor(ref, PRACTICE_CONTRACT_FILE);
    },
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}
