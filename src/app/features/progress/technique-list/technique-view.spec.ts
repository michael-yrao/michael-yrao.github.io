import { vi } from 'vitest';

import { ProblemProgress, Technique } from '../../../core/models/progress.model';
import {
  barFillPercent,
  comfortRank,
  coverageState,
  coverageTitle,
  deriveTechniqueStats,
  doneOf,
  isMastered,
  isThresholdBeyondPlan,
  parseStoredView,
  plannedTotalOf,
  ratioTitle,
  readStoredView,
  remainingToCover,
  shortName,
  TECHNIQUE_VIEW_STORAGE_KEY,
  thresholdPercent,
  writeStoredView,
} from './technique-view';

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
  it("returns 'map' for the literal string 'map'", () => {
    expect(parseStoredView('map')).toBe('map');
  });

  it("reads the legacy 'tree' (the retired skill tree) as 'map'", () => {
    expect(parseStoredView('tree')).toBe('map');
  });

  it("falls back to 'list' for null, an unrelated string, an uppercase variant, or garbage", () => {
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

describe('deriveTechniqueStats', () => {
  it('returns empty stats when no problem in the technique matches byNumber', () => {
    const t = makeTechnique({ problems: [11] });
    expect(deriveTechniqueStats(t, new Map())).toEqual({
      lastTouched: null,
      greenCount: 0,
      graduatedCount: 0,
      weakestComfort: null,
    });
  });

  it('returns empty stats for a not-started technique with no problems', () => {
    const t = makeTechnique({ problems: [] });
    const byNumber = new Map([[11, makeProblem({ lcNumber: 11 })]]);
    expect(deriveTechniqueStats(t, byNumber)).toEqual({
      lastTouched: null,
      greenCount: 0,
      graduatedCount: 0,
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

  it('counts only matched problems at 🎓 or better toward graduatedCount', () => {
    const t = makeTechnique({ problems: [1, 2, 3] });
    const byNumber = new Map([
      [1, makeProblem({ lcNumber: 1, comfort: '🟢' })],
      [2, makeProblem({ lcNumber: 2, comfort: '🎓' })],
      [3, makeProblem({ lcNumber: 3, comfort: '🏆' })],
    ]);
    expect(deriveTechniqueStats(t, byNumber).graduatedCount).toBe(2);
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

describe('isMastered', () => {
  it('is true once the technique\'s own graduatedCount reaches minProblems', () => {
    const t = makeTechnique({ minProblems: 2, graduatedCount: 2 });
    expect(isMastered(t, undefined)).toBe(true);
  });

  it("is false below minProblems, using the technique's own graduatedCount", () => {
    const t = makeTechnique({ minProblems: 3, graduatedCount: 1 });
    expect(isMastered(t, undefined)).toBe(false);
  });

  it('falls back to stats.graduatedCount when the technique carries no graduatedCount (older contract)', () => {
    const t = makeTechnique({ minProblems: 2, graduatedCount: undefined });
    expect(isMastered(t, { lastTouched: null, greenCount: 2, graduatedCount: 2, weakestComfort: '🎓' })).toBe(true);
    expect(isMastered(t, { lastTouched: null, greenCount: 1, graduatedCount: 1, weakestComfort: '🎓' })).toBe(false);
  });

  it('is false when neither graduatedCount nor stats is available', () => {
    const t = makeTechnique({ minProblems: 1, graduatedCount: undefined });
    expect(isMastered(t, undefined)).toBe(false);
  });
});

describe('plannedTotalOf', () => {
  it('prefers the exported plannedTotal when present', () => {
    const t = makeTechnique({ problemCount: 1, plannedTotal: 5, planned: [] });
    expect(plannedTotalOf(t)).toBe(5);
  });

  it('falls back to problemCount + planned.length when plannedTotal is absent', () => {
    const t = makeTechnique({
      problemCount: 1,
      plannedTotal: undefined,
      planned: [
        { lcNumber: 1, title: null, url: null, difficulty: null, trigger: null },
        { lcNumber: 2, title: null, url: null, difficulty: null, trigger: null },
      ],
    });
    expect(plannedTotalOf(t)).toBe(3);
  });

  it('falls back to problemCount alone when both plannedTotal and planned are absent (older contract)', () => {
    const t = makeTechnique({ problemCount: 4, plannedTotal: undefined, planned: undefined });
    expect(plannedTotalOf(t)).toBe(4);
  });
});

describe('doneOf', () => {
  it('is the technique\'s problemCount', () => {
    expect(doneOf(makeTechnique({ problemCount: 7 }))).toBe(7);
  });
});

describe('remainingToCover', () => {
  it('is minProblems minus problemCount when positive', () => {
    expect(remainingToCover(makeTechnique({ minProblems: 3, problemCount: 1 }))).toBe(2);
  });

  it('never goes negative once problemCount exceeds minProblems', () => {
    expect(remainingToCover(makeTechnique({ minProblems: 2, problemCount: 5 }))).toBe(0);
  });
});

describe('coverageState', () => {
  it('is "covered" once done reaches the threshold', () => {
    expect(coverageState(makeTechnique({ minProblems: 2, problemCount: 2 }))).toBe('covered');
  });

  it('is "inProgress" once at least one is done but the threshold is not yet reached', () => {
    expect(coverageState(makeTechnique({ minProblems: 3, problemCount: 1 }))).toBe('inProgress');
  });

  it('is "notBegun" before any problem is done', () => {
    expect(coverageState(makeTechnique({ minProblems: 3, problemCount: 0 }))).toBe('notBegun');
  });

  it('is "inProgress" when the threshold sits beyond what is planned (x > y) but done has not reached it', () => {
    const t = makeTechnique({ minProblems: 3, problemCount: 2, plannedTotal: 2, planned: [] });
    expect(coverageState(t)).toBe('inProgress');
  });

  it('is "covered" once done reaches the threshold even when the threshold sits beyond what is planned (y < x)', () => {
    const t = makeTechnique({ minProblems: 2, problemCount: 3, plannedTotal: 1, planned: [] });
    expect(coverageState(t)).toBe('covered');
  });
});

describe('coverageTitle', () => {
  it('covered: names the threshold it reached', () => {
    const t = makeTechnique({ problemCount: 3, plannedTotal: 7, minProblems: 3, planned: [] });
    expect(coverageTitle(t)).toBe('3 of 7 planned problems done · covered (3 needed)');
  });

  it('not covered: names how many more and the threshold', () => {
    const t = makeTechnique({ problemCount: 1, plannedTotal: 3, minProblems: 3, planned: [] });
    expect(coverageTitle(t)).toBe('1 of 3 planned problems done · 2 more to be covered (3 needed)');
  });

  it('threshold beyond the plan (x > y): adds the honest "only N planned" clause', () => {
    const t = makeTechnique({ problemCount: 2, plannedTotal: 2, minProblems: 3, planned: [] });
    expect(coverageTitle(t)).toBe(
      '2 of 2 planned problems done · 1 more to be covered (3 needed) · only 2 planned',
    );
  });

  it('nothing planned (y = 0): a bare admission, no ratio clause', () => {
    const t = makeTechnique({ problemCount: 0, plannedTotal: 0, minProblems: 2, planned: [] });
    expect(coverageTitle(t)).toBe('nothing planned yet');
  });

  it('singularizes "problem" (from ratioTitle) when exactly one is planned', () => {
    const t = makeTechnique({ problemCount: 1, plannedTotal: 1, minProblems: 1, planned: [] });
    expect(coverageTitle(t)).toBe('1 of 1 planned problem done · covered (1 needed)');
  });

  it('"needs 1 more" stays singular-friendly (no plural suffix on "more")', () => {
    const t = makeTechnique({ problemCount: 0, plannedTotal: 1, minProblems: 1, planned: [] });
    expect(coverageTitle(t)).toBe('0 of 1 planned problem done · 1 more to be covered (1 needed)');
  });
});

describe('barFillPercent', () => {
  it('is problemCount / plannedTotal as a percent', () => {
    const t = makeTechnique({ problemCount: 1, plannedTotal: 3, planned: [] });
    expect(barFillPercent(t)).toBeCloseTo(33.33, 1);
  });

  it('is 0 when plannedTotal is 0 (nothing declared)', () => {
    const t = makeTechnique({ problemCount: 0, plannedTotal: 0, planned: [] });
    expect(barFillPercent(t)).toBe(0);
  });

  it('clamps to 100 rather than overflowing when problemCount exceeds plannedTotal', () => {
    const t = makeTechnique({ problemCount: 5, plannedTotal: 2, planned: [] });
    expect(barFillPercent(t)).toBe(100);
  });
});

describe('thresholdPercent', () => {
  it('is minProblems / plannedTotal as a percent (a non-clamped case, distinct from the clamp value)', () => {
    const t = makeTechnique({ minProblems: 2, problemCount: 0, plannedTotal: 4, planned: [] });
    expect(thresholdPercent(t)).toBe(50);
  });

  it('clamps to 100 when the threshold is beyond what is planned (x > y)', () => {
    const t = makeTechnique({ minProblems: 3, problemCount: 0, plannedTotal: 2, planned: [] });
    expect(thresholdPercent(t)).toBe(100);
  });

  it('is 0 when plannedTotal is 0 (nothing declared)', () => {
    const t = makeTechnique({ minProblems: 2, problemCount: 0, plannedTotal: 0, planned: [] });
    expect(thresholdPercent(t)).toBe(0);
  });
});

describe('isThresholdBeyondPlan', () => {
  it('is true once minProblems exceeds plannedTotal', () => {
    const t = makeTechnique({ minProblems: 3, problemCount: 0, plannedTotal: 2, planned: [] });
    expect(isThresholdBeyondPlan(t)).toBe(true);
  });

  it('is false when the threshold fits within what is planned', () => {
    const t = makeTechnique({ minProblems: 3, problemCount: 1, plannedTotal: 3, planned: [] });
    expect(isThresholdBeyondPlan(t)).toBe(false);
  });
});

describe('ratioTitle', () => {
  it('reads "X of Y planned problems done" (plural) when more than one is planned', () => {
    const t = makeTechnique({ problemCount: 1, plannedTotal: 3, planned: [] });
    expect(ratioTitle(t)).toBe('1 of 3 planned problems done');
  });

  it('singularizes "problem" when exactly one is planned', () => {
    const t = makeTechnique({ problemCount: 0, plannedTotal: 1, planned: [] });
    expect(ratioTitle(t)).toBe('0 of 1 planned problem done');
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
