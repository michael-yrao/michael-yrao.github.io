import { vi } from 'vitest';

import { CONTENT_REPO } from '../../core/services/github-file.service';
import { COACH_REFRESH_RETRY_MS, refreshAfterTurn } from './coach-refresh';

interface Row {
  readonly name: string;
  readonly repoChanged: boolean;
  readonly hasPractice: boolean;
  readonly hashes: readonly (string | null)[];
  readonly refreshes: number;
  readonly practiceLoads: number;
  readonly delays: number;
}

const ROWS: readonly Row[] = [
  { name: 'repo unchanged: nothing runs', repoChanged: false, hasPractice: true, hashes: ['a', 'b'], refreshes: 0, practiceLoads: 0, delays: 0 },
  { name: 'changed, practice loaded, hash moved: one refresh', repoChanged: true, hasPractice: true, hashes: ['a', 'b'], refreshes: 1, practiceLoads: 1, delays: 0 },
  { name: 'changed, no practice loaded: progress only', repoChanged: true, hasPractice: false, hashes: ['a', 'b'], refreshes: 1, practiceLoads: 0, delays: 0 },
  { name: 'changed, hash unchanged: one retry after the delay, never two', repoChanged: true, hasPractice: true, hashes: ['a', 'a'], refreshes: 2, practiceLoads: 2, delays: 1 },
];

describe('refreshAfterTurn', () => {
  it.each(ROWS)('$name', async ({ repoChanged, hasPractice, hashes, refreshes, practiceLoads, delays }) => {
    const hashQueue = [...hashes];
    const deps = {
      refreshProgress: vi.fn(),
      loadedPracticeRef: vi.fn(() => (hasPractice ? CONTENT_REPO : null)),
      loadPractice: vi.fn(),
      manifestHash: vi.fn(async () => hashQueue.shift() ?? null),
      delay: vi.fn(async () => {}),
    };

    await refreshAfterTurn({ repoChanged }, deps);

    expect(deps.refreshProgress).toHaveBeenCalledTimes(refreshes);
    expect(deps.loadPractice).toHaveBeenCalledTimes(practiceLoads);
    if (practiceLoads > 0) expect(deps.loadPractice).toHaveBeenCalledWith(CONTENT_REPO, true);
    expect(deps.delay).toHaveBeenCalledTimes(delays);
    if (delays > 0) expect(deps.delay).toHaveBeenCalledWith(COACH_REFRESH_RETRY_MS);
  });
});
