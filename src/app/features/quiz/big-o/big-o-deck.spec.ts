import {
  BIG_O_FILTER_STORAGE_KEY,
  DEFAULT_FILTER,
  RUN_CAP,
  dealDeck,
  filterDeck,
  parseStoredFilter,
  readStoredFilter,
  writeStoredFilter,
} from './big-o-deck';
import { BigOEntry } from '../../../core/models/big-o.model';
import { Difficulty } from '../../../core/models/algorithm.model';

function makeEntry(overrides: Partial<BigOEntry> = {}): BigOEntry {
  return {
    key: '1:two-sum',
    lcNumber: 1,
    variant: 'two-sum',
    title: 'Two Sum',
    url: null,
    file: 'dsa/leetcode/arrays_and_hash/1_two_sum.py',
    symbol: 'twoSum',
    attemptDate: '2026-01-01',
    difficulty: 'Easy',
    category: 'arrays_and_hash',
    isMiss: false,
    note: null,
    time: 'O(n)',
    space: 'O(n)',
    whyTime: null,
    whySpace: null,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    segments: [],
    ...overrides,
  };
}

function makePool(count: number, difficulties: readonly Difficulty[] = ['Easy', 'Medium', 'Hard']): BigOEntry[] {
  return Array.from({ length: count }, (_, i) =>
    makeEntry({
      key: `${i}:v`,
      lcNumber: i,
      difficulty: difficulties[i % difficulties.length],
      isMiss: i % 3 === 0,
    }),
  );
}

describe('filterDeck', () => {
  it('returns every entry for the default (All / not misses-only) filter', () => {
    const pool = makePool(6);
    expect(filterDeck(pool, DEFAULT_FILTER).length).toBe(6);
  });

  it('narrows by difficulty', () => {
    const pool = makePool(6);
    const result = filterDeck(pool, { difficulty: 'Hard', missesOnly: false });
    expect(result.every((e) => e.difficulty === 'Hard')).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('narrows to misses-only', () => {
    const pool = makePool(6);
    const result = filterDeck(pool, { difficulty: 'All', missesOnly: true });
    expect(result.every((e) => e.isMiss)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('combines difficulty and misses-only (may empty out)', () => {
    const pool = [
      makeEntry({ key: 'a', difficulty: 'Easy', isMiss: true }),
      makeEntry({ key: 'b', difficulty: 'Hard', isMiss: false }),
    ];
    expect(filterDeck(pool, { difficulty: 'Hard', missesOnly: true })).toEqual([]);
  });

  it('never mutates the input array', () => {
    const pool = makePool(4);
    const copy = [...pool];
    filterDeck(pool, { difficulty: 'Easy', missesOnly: false });
    expect(pool).toEqual(copy);
  });
});

describe('dealDeck', () => {
  it('caps the dealt deck at `cap`', () => {
    const pool = makePool(30);
    const dealt = dealDeck(pool, Math.random, RUN_CAP);
    expect(dealt.length).toBe(RUN_CAP);
  });

  it('deals every entry (in some order) when the pool is smaller than the cap', () => {
    const pool = makePool(5);
    const dealt = dealDeck(pool, Math.random, RUN_CAP);
    expect(dealt.length).toBe(5);
    expect(new Set(dealt.map((e) => e.key))).toEqual(new Set(pool.map((e) => e.key)));
  });

  it('never mutates the input pool', () => {
    const pool = makePool(8);
    const copy = [...pool];
    dealDeck(pool, Math.random, RUN_CAP);
    expect(pool).toEqual(copy);
  });

  it('is deterministic for a fixed rng sequence', () => {
    const pool = makePool(5);
    const fixedRng = () => 0; // always swaps with index 0 — deterministic reversal-ish order
    const first = dealDeck(pool, fixedRng, RUN_CAP);
    const second = dealDeck(pool, fixedRng, RUN_CAP);
    expect(first.map((e) => e.key)).toEqual(second.map((e) => e.key));
  });
});

describe('parseStoredFilter', () => {
  it('returns DEFAULT_FILTER for null', () => {
    expect(parseStoredFilter(null)).toEqual(DEFAULT_FILTER);
  });

  it('returns DEFAULT_FILTER for corrupted JSON', () => {
    expect(parseStoredFilter('not json')).toEqual(DEFAULT_FILTER);
  });

  it('returns DEFAULT_FILTER when difficulty is not a valid filter value', () => {
    expect(parseStoredFilter(JSON.stringify({ difficulty: 'Expert', missesOnly: false }))).toEqual(
      DEFAULT_FILTER,
    );
  });

  it('returns DEFAULT_FILTER when missesOnly is not a boolean', () => {
    expect(parseStoredFilter(JSON.stringify({ difficulty: 'Hard', missesOnly: 'yes' }))).toEqual(
      DEFAULT_FILTER,
    );
  });

  it('round-trips a valid stored filter', () => {
    const filter = { difficulty: 'Medium' as const, missesOnly: true };
    expect(parseStoredFilter(JSON.stringify(filter))).toEqual(filter);
  });
});

describe('readStoredFilter / writeStoredFilter', () => {
  afterEach(() => {
    try {
      localStorage.clear();
    } catch {
      // ignore — not every test environment exposes localStorage
    }
  });

  it('reads back exactly what was written', () => {
    const filter = { difficulty: 'Hard' as const, missesOnly: true };
    writeStoredFilter(filter);
    expect(readStoredFilter()).toEqual(filter);
    expect(localStorage.getItem(BIG_O_FILTER_STORAGE_KEY)).toBe(JSON.stringify(filter));
  });

  it('returns DEFAULT_FILTER when nothing has been written', () => {
    expect(readStoredFilter()).toEqual(DEFAULT_FILTER);
  });
});
