import { vi } from 'vitest';

import { ProblemProgress, Technique } from '../../../core/models/progress.model';
import {
  comfortClass,
  comfortRank,
  deriveTechniqueStats,
  parseStoredView,
  readStoredView,
  shortName,
  TECHNIQUE_VIEW_STORAGE_KEY,
  writeStoredView,
} from './technique-map';

function makeTechnique(overrides: Partial<Technique> = {}): Technique {
  return {
    name: 'Two Pointers',
    family: 'Arrays',
    tier: 'core',
    started: true,
    minProblems: 3,
    problemCount: 1,
    problems: [11],
    bestComfort: '🟡',
    hasGreen: false,
    thin: true,
    hasVariantGap: false,
    ...overrides,
  };
}

function makeProblem(overrides: Partial<ProblemProgress> = {}): ProblemProgress {
  return {
    lcNumber: 11,
    title: 'Container With Most Water',
    url: 'https://leetcode.com/problems/container-with-most-water/',
    difficulty: 'Medium',
    comfort: '🟡',
    level: 2,
    streak: 1,
    repDates: [],
    timeline: [],
    ...overrides,
  };
}

describe('parseStoredView', () => {
  it("returns 'map' only for the literal string 'map'", () => {
    expect(parseStoredView('map')).toBe('map');
  });

  it("falls back to 'list' for null, an unrelated string, or garbage", () => {
    expect(parseStoredView(null)).toBe('list');
    expect(parseStoredView('grid')).toBe('list');
    expect(parseStoredView('MAP')).toBe('list');
    expect(parseStoredView('')).toBe('list');
  });
});

describe('readStoredView / writeStoredView', () => {
  afterEach(() => localStorage.clear());

  it("defaults to 'list' when nothing is persisted", () => {
    expect(readStoredView()).toBe('list');
  });

  it('round-trips a written view', () => {
    writeStoredView('map');
    expect(localStorage.getItem(TECHNIQUE_VIEW_STORAGE_KEY)).toBe('map');
    expect(readStoredView()).toBe('map');
  });

  it('reading survives a localStorage getItem throw (private mode / blocked)', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredView()).toBe('list');
    spy.mockRestore();
  });

  it('writing survives a localStorage setItem throw (private mode / blocked)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => writeStoredView('map')).not.toThrow();
    spy.mockRestore();
  });
});

describe('comfortRank', () => {
  it('orders weakest to strongest', () => {
    expect(comfortRank('🔴')).toBe(0);
    expect(comfortRank('🟡')).toBe(1);
    expect(comfortRank('🟢')).toBe(2);
    expect(comfortRank('🎓')).toBe(3);
    expect(comfortRank('🏆')).toBe(4);
  });

  it('returns -1 for null', () => {
    expect(comfortRank(null)).toBe(-1);
  });
});

describe('comfortClass', () => {
  it('maps every comfort to the pipeline .seg-* vocabulary', () => {
    expect(comfortClass('🔴')).toBe('blank');
    expect(comfortClass('🟡')).toBe('shaky');
    expect(comfortClass('🟢')).toBe('clean');
    expect(comfortClass('🎓')).toBe('grad');
    expect(comfortClass('🏆')).toBe('retired');
  });

  it("maps null (not-started technique) to 'none'", () => {
    expect(comfortClass(null)).toBe('none');
  });
});

describe('deriveTechniqueStats', () => {
  it('returns empty stats when no problem in the technique matches byNumber', () => {
    const t = makeTechnique({ problems: [11] });
    expect(deriveTechniqueStats(t, new Map())).toEqual({
      lastTouched: null,
      greenCount: 0,
      weakestComfort: null,
    });
  });

  it('returns empty stats for a not-started technique with no problems', () => {
    const t = makeTechnique({ problems: [] });
    const byNumber = new Map([[11, makeProblem({ lcNumber: 11 })]]);
    expect(deriveTechniqueStats(t, byNumber)).toEqual({
      lastTouched: null,
      greenCount: 0,
      weakestComfort: null,
    });
  });

  it('counts only matched problems at 🟢 or better toward greenCount', () => {
    const t = makeTechnique({ problems: [1, 2, 3] });
    const byNumber = new Map([
      [1, makeProblem({ lcNumber: 1, comfort: '🔴' })],
      [2, makeProblem({ lcNumber: 2, comfort: '🟢' })],
      [3, makeProblem({ lcNumber: 3, comfort: '🎓' })],
    ]);
    expect(deriveTechniqueStats(t, byNumber).greenCount).toBe(2);
  });

  it('lastTouched is the max repDate across all matched problems, by ISO string compare', () => {
    const t = makeTechnique({ problems: [1, 2] });
    const byNumber = new Map([
      [1, makeProblem({ lcNumber: 1, repDates: ['2026-01-01', '2026-03-15'] })],
      [2, makeProblem({ lcNumber: 2, repDates: ['2026-02-10'] })],
    ]);
    expect(deriveTechniqueStats(t, byNumber).lastTouched).toBe('2026-03-15');
  });

  it('lastTouched is null when matched problems carry no repDates', () => {
    const t = makeTechnique({ problems: [1] });
    const byNumber = new Map([[1, makeProblem({ lcNumber: 1, repDates: [] })]]);
    expect(deriveTechniqueStats(t, byNumber).lastTouched).toBeNull();
  });

  it('weakestComfort is the least-mastered comfort among matched problems', () => {
    const t = makeTechnique({ problems: [1, 2, 3] });
    const byNumber = new Map([
      [1, makeProblem({ lcNumber: 1, comfort: '🎓' })],
      [2, makeProblem({ lcNumber: 2, comfort: '🟡' })],
      [3, makeProblem({ lcNumber: 3, comfort: '🟢' })],
    ]);
    expect(deriveTechniqueStats(t, byNumber).weakestComfort).toBe('🟡');
  });

  it('never mutates the technique or the byNumber map', () => {
    const t = makeTechnique({ problems: [1] });
    const problem = makeProblem({ lcNumber: 1, repDates: ['2026-01-01'] });
    const byNumber = new Map([[1, problem]]);
    const frozenProblems = [...t.problems];

    deriveTechniqueStats(t, byNumber);

    expect(t.problems).toEqual(frozenProblems);
    expect(byNumber.get(1)).toBe(problem);
  });
});

describe('shortName', () => {
  it('strips a trailing parenthetical qualifier', () => {
    expect(shortName('Two Pointers (opposite ends)')).toBe('Two Pointers');
  });

  it('leaves a name with no trailing parenthetical unchanged', () => {
    expect(shortName('Binary Search')).toBe('Binary Search');
  });

  it('trims stray whitespace left after stripping', () => {
    expect(shortName('Sliding Window   (fixed size)')).toBe('Sliding Window');
  });

  it('does not touch a parenthetical that is not at the end', () => {
    expect(shortName('DP (1D) over intervals')).toBe('DP (1D) over intervals');
  });
});
