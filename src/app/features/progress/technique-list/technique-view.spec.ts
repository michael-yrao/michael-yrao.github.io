import { vi } from 'vitest';

import { ProblemProgress, Technique } from '../../../core/models/progress.model';
import {
  columnFor,
  comfortRank,
  compareTechniques,
  CoverageBox,
  coverageBoxes,
  coverageState,
  coverageTitle,
  deriveTechniqueStats,
  doneOf,
  isMastered,
  isThresholdBeyondPlan,
  parseStoredView,
  plannedTotalOf,
  ratioDenominatorOf,
  ratioTitle,
  readStoredView,
  remainingToCover,
  shortName,
  TechniqueStats,
  TECHNIQUE_VIEW_STORAGE_KEY,
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
  const cases: [string, string | null, 'list' | 'board'][] = [
    ["'board' returns 'board'", 'board', 'board'],
    ["the retired Map view's 'map' falls back to 'list'", 'map', 'list'],
    ["the retired skill tree's 'tree' falls back to 'list'", 'tree', 'list'],
    ['null falls back to list', null, 'list'],
    ['an unrelated string falls back to list', 'grid', 'list'],
    ["an uppercase variant ('BOARD') falls back to list", 'BOARD', 'list'],
    ['an empty string falls back to list', '', 'list'],
  ];

  it.each(cases)('%s', (_label, raw, expected) => {
    expect(parseStoredView(raw)).toBe(expected);
  });
});

describe('readStoredView / writeStoredView', () => {
  afterEach(() => localStorage.clear());

  it("defaults to 'list' when nothing is persisted", () => {
    expect(readStoredView()).toBe('list');
  });

  it('round-trips a written view', () => {
    writeStoredView('board');
    expect(localStorage.getItem(TECHNIQUE_VIEW_STORAGE_KEY)).toBe('board');
    expect(readStoredView()).toBe('board');
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
    expect(() => writeStoredView('board')).not.toThrow();
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

describe('ratioDenominatorOf', () => {
  const cases: [string, Technique, number][] = [
    [
      'planned exceeds the threshold: the denominator is what is planned',
      makeTechnique({ minProblems: 2, plannedTotal: 5, planned: [] }),
      5,
    ],
    [
      'planned falls short of the threshold: the denominator is raised to the threshold',
      makeTechnique({ minProblems: 3, plannedTotal: 1, planned: [] }),
      3,
    ],
    [
      'nothing planned (y = 0): the denominator is the threshold itself',
      makeTechnique({ minProblems: 1, problemCount: 0, plannedTotal: 0, planned: [] }),
      1,
    ],
  ];

  it.each(cases)('%s', (_label, t, expected) => {
    expect(ratioDenominatorOf(t)).toBe(expected);
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
  const cases: [string, Technique, string][] = [
    [
      'covered: names the threshold it reached',
      makeTechnique({ problemCount: 3, plannedTotal: 7, minProblems: 3, planned: [] }),
      '3 of 7 planned problems done · covered (3 needed)',
    ],
    [
      'not covered: names how many more and the threshold',
      makeTechnique({ problemCount: 1, plannedTotal: 3, minProblems: 3, planned: [] }),
      '1 of 3 planned problems done · 2 more to be covered (3 needed)',
    ],
    [
      'threshold beyond the plan (x > y): adds the honest "only N planned" clause',
      makeTechnique({ problemCount: 2, plannedTotal: 2, minProblems: 3, planned: [] }),
      '2 of 2 planned problems done · 1 more to be covered (3 needed) · only 2 planned',
    ],
    [
      'nothing planned (y = 0): a bare admission, no ratio clause',
      makeTechnique({ problemCount: 0, plannedTotal: 0, minProblems: 2, planned: [] }),
      'nothing planned yet',
    ],
    [
      'singularizes "problem" (from ratioTitle) when exactly one is planned',
      makeTechnique({ problemCount: 1, plannedTotal: 1, minProblems: 1, planned: [] }),
      '1 of 1 planned problem done · covered (1 needed)',
    ],
    [
      '"needs 1 more" stays singular-friendly (no plural suffix on "more")',
      makeTechnique({ problemCount: 0, plannedTotal: 1, minProblems: 1, planned: [] }),
      '0 of 1 planned problem done · 1 more to be covered (1 needed)',
    ],
    [
      'coverageFloor + uncleanCount (both present, uncleanCount > 0): explains the threshold in plain words',
      makeTechnique({
        problemCount: 4, plannedTotal: 8, minProblems: 8, planned: [], coverageFloor: 4, uncleanCount: 4,
      }),
      '4 of 8 planned problems done · 4 more to be covered '
        + '(8 needed: 4, plus 4 while 4 problems are still shaky)',
    ],
  ];

  it.each(cases)('%s', (_label, t, expected) => {
    expect(coverageTitle(t)).toBe(expected);
  });
});

describe('coverageBoxes', () => {
  const cases: [string, Technique, CoverageBox[]][] = [
    [
      'done 1 / threshold 2 / planned 3: one filled, one needed, one extra',
      makeTechnique({ problemCount: 1, minProblems: 2, plannedTotal: 3, planned: [] }),
      ['done', 'needed', 'extra'],
    ],
    [
      'done 2 / threshold 1 / planned 2: covered, no needed box',
      makeTechnique({ problemCount: 2, minProblems: 1, plannedTotal: 2, planned: [] }),
      ['done', 'done'],
    ],
    [
      'done 0 / threshold 1 / planned 0: nothing planned, one needed box',
      makeTechnique({ problemCount: 0, minProblems: 1, plannedTotal: 0, planned: [] }),
      ['needed'],
    ],
    [
      'done 6 / threshold 8 / planned 8: no extra box',
      makeTechnique({ problemCount: 6, minProblems: 8, plannedTotal: 8, planned: [] }),
      ['done', 'done', 'done', 'done', 'done', 'done', 'needed', 'needed'],
    ],
    [
      'done exceeds the denominator: clamped to the denominator, no negative counts',
      makeTechnique({ problemCount: 10, minProblems: 2, plannedTotal: 3, planned: [] }),
      ['done', 'done', 'done'],
    ],
  ];

  it.each(cases)('%s', (_label, t, expected) => {
    expect(coverageBoxes(t)).toEqual(expected);
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

describe('columnFor', () => {
  const cases: [string, Technique, TechniqueStats | undefined, string][] = [
    [
      'mastered (own graduatedCount reaches minProblems) wins outright over coverageState',
      makeTechnique({ minProblems: 2, problemCount: 2, graduatedCount: 2 }),
      undefined,
      'mastered',
    ],
    [
      "mastered via stats.graduatedCount fallback (older contract, no Technique.graduatedCount)",
      makeTechnique({ minProblems: 2, problemCount: 2, graduatedCount: undefined }),
      { lastTouched: null, greenCount: 2, graduatedCount: 2, weakestComfort: '🎓' },
      'mastered',
    ],
    [
      'covered (threshold reached) but not mastered',
      makeTechnique({ minProblems: 2, problemCount: 2, graduatedCount: 0 }),
      undefined,
      'covered',
    ],
    [
      'in progress: started but below the threshold',
      makeTechnique({ minProblems: 3, problemCount: 1, graduatedCount: 0 }),
      undefined,
      'inProgress',
    ],
    [
      'not started: no problem done yet',
      makeTechnique({ minProblems: 3, problemCount: 0, graduatedCount: 0 }),
      undefined,
      'notStarted',
    ],
  ];

  it.each(cases)('%s', (_label, t, stats, expected) => {
    expect(columnFor(t, stats)).toBe(expected);
  });
});

describe('compareTechniques', () => {
  const statsFor = (overrides: Partial<TechniqueStats>): TechniqueStats => ({
    lastTouched: null,
    greenCount: 0,
    graduatedCount: 0,
    weakestComfort: null,
    ...overrides,
  });

  function sortedNames(
    techniques: Technique[],
    key: 'name' | 'coverage' | 'lastPracticed',
    statsByName: ReadonlyMap<string, TechniqueStats> = new Map(),
  ): string[] {
    return [...techniques]
      .sort((a, b) => compareTechniques(a, b, key, statsByName))
      .map((t) => t.name);
  }

  type SortKey = 'name' | 'coverage' | 'lastPracticed';
  const cases: [string, Technique[], SortKey, ReadonlyMap<string, TechniqueStats>, string[]][] = [
    [
      "'name': plain alphabetical order",
      [makeTechnique({ name: 'Zeta' }), makeTechnique({ name: 'Alpha' })],
      'name',
      new Map(),
      ['Alpha', 'Zeta'],
    ],
    [
      "'coverage': highest done/ratioDenominatorOf ratio first",
      [
        makeTechnique({ name: 'Half', problemCount: 1, plannedTotal: 2, minProblems: 2, planned: [] }),
        makeTechnique({ name: 'Full', problemCount: 2, plannedTotal: 2, minProblems: 2, planned: [] }),
      ],
      'coverage',
      new Map(),
      ['Full', 'Half'],
    ],
    [
      "'coverage': equal ratios break the tie on name",
      [
        makeTechnique({ name: 'Zeta', problemCount: 1, plannedTotal: 2, minProblems: 2, planned: [] }),
        makeTechnique({ name: 'Alpha', problemCount: 1, plannedTotal: 2, minProblems: 2, planned: [] }),
      ],
      'coverage',
      new Map(),
      ['Alpha', 'Zeta'],
    ],
    [
      "'lastPracticed': most recent first; untouched or missing-stats last, tiebreak on name",
      [
        makeTechnique({ name: 'Old' }),
        makeTechnique({ name: 'New' }),
        makeTechnique({ name: 'NeverTouched' }),
        makeTechnique({ name: 'NoStatsEntry' }),
      ],
      'lastPracticed',
      new Map([
        ['Old', statsFor({ lastTouched: '2026-01-01' })],
        ['New', statsFor({ lastTouched: '2026-06-01' })],
        ['NeverTouched', statsFor({ lastTouched: null })],
        // 'NoStatsEntry' deliberately carries no map entry — falls back the same as null.
      ]),
      ['New', 'Old', 'NeverTouched', 'NoStatsEntry'],
    ],
  ];

  it.each(cases)('%s', (_label, techniques, key, statsByName, expected) => {
    expect(sortedNames(techniques, key, statsByName)).toEqual(expected);
  });
});
