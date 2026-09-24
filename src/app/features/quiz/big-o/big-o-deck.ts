import { Difficulty } from '../../../core/models/algorithm.model';
import { BigOEntry } from '../../../core/models/big-o.model';

export type DifficultyFilter = 'All' | Difficulty;

export const DIFFICULTY_FILTERS: readonly DifficultyFilter[] = ['All', 'Easy', 'Medium', 'Hard'];

/** A run deals at most this many questions, even when more problems match the filter. */
export const RUN_CAP = 20;

export const BIG_O_FILTER_STORAGE_KEY = 'po-big-o-filter';

export interface DeckFilter {
  readonly difficulty: DifficultyFilter;
  readonly missesOnly: boolean;
}

export const DEFAULT_FILTER: DeckFilter = { difficulty: 'All', missesOnly: false };

/** Narrows the full entry list to those matching the difficulty and misses-only filter.
 *  Pure — never mutates `entries`. */
export function filterDeck(
  entries: readonly BigOEntry[],
  filter: DeckFilter,
): readonly BigOEntry[] {
  return entries.filter((entry) => {
    if (filter.difficulty !== 'All' && entry.difficulty !== filter.difficulty) return false;
    if (filter.missesOnly && !entry.isMiss) return false;
    return true;
  });
}

/** Fisher–Yates shuffle of a COPY of `pool` (the input array is never mutated), capped to
 *  `cap` entries. `rng` returns a float in [0, 1) — pass `Math.random` in production and a
 *  deterministic function in tests. */
export function dealDeck(
  pool: readonly BigOEntry[],
  rng: () => number,
  cap: number = RUN_CAP,
): readonly BigOEntry[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, cap);
}

function isDifficultyFilter(value: unknown): value is DifficultyFilter {
  return DIFFICULTY_FILTERS.includes(value as DifficultyFilter);
}

/** Parses a persisted filter, falling back to `DEFAULT_FILTER` on anything malformed or
 *  absent — a corrupted or old-shape localStorage value must never crash the trainer. */
export function parseStoredFilter(raw: string | null): DeckFilter {
  if (raw === null) return DEFAULT_FILTER;
  try {
    const parsed = JSON.parse(raw) as Partial<DeckFilter>;
    if (!isDifficultyFilter(parsed.difficulty)) return DEFAULT_FILTER;
    if (typeof parsed.missesOnly !== 'boolean') return DEFAULT_FILTER;
    return { difficulty: parsed.difficulty, missesOnly: parsed.missesOnly };
  } catch {
    return DEFAULT_FILTER;
  }
}

/** Reads the persisted filter — try/catch as in `bisect-it.component.ts`'s best-streak
 *  read, since `localStorage` can throw (private mode, blocked) or simply be absent. */
export function readStoredFilter(): DeckFilter {
  try {
    return parseStoredFilter(localStorage.getItem(BIG_O_FILTER_STORAGE_KEY));
  } catch {
    return DEFAULT_FILTER;
  }
}

export function writeStoredFilter(filter: DeckFilter): void {
  try {
    localStorage.setItem(BIG_O_FILTER_STORAGE_KEY, JSON.stringify(filter));
  } catch {
    // localStorage unavailable (private mode, blocked) — filter stays in-memory only.
  }
}
