import { PatternSenseData } from '../models/pattern-sense.model';
import {
  advance,
  chooseFamily,
  chooseTechnique,
  encodeResults,
  restoreCode,
  startWeekRun,
} from './week-run';

const WEEK = '2026-11-30';
const HASH = '7e41b9';

function problem(lcNumber: number, family: string, technique: string) {
  return { lcNumber, prompt: 'p', constraints: ['c'], family, technique, cue: 'cue' };
}

/** The cross-repo shared example: families in chip order, problems 1004 / 55 / 76. */
const SHARED: PatternSenseData = {
  schemaVersion: 1,
  generatedAt: '2026-10-18',
  week: WEEK,
  vocabHash: HASH,
  families: [
    { id: 'arrays_and_hash', techniques: ['Hash Map Lookup', 'Frequency Counting'] },
    { id: 'greedy', techniques: ['Greedy (single pass)'] },
    { id: 'sliding_window', techniques: ['Variable Window', 'Window with Counts'] },
    { id: 'two_pointers', techniques: ['Opposite Ends', 'Fast and Slow'] },
  ],
  problems: [
    problem(1004, 'sliding_window', 'Variable Window'),
    problem(55, 'greedy', 'Greedy (single pass)'),
    problem(76, 'sliding_window', 'Window with Counts'),
  ],
};

/** 11 families and a 10-technique family, to reach two-digit chip indices. */
const WIDE: PatternSenseData = {
  ...SHARED,
  families: [
    {
      id: 'f1',
      techniques: Array.from({ length: 10 }, (_, i) => `t${i + 1}`),
    },
    ...Array.from({ length: 10 }, (_, i) => ({ id: `f${i + 2}`, techniques: ['x', 'y'] })),
  ],
  problems: [problem(7, 'f1', 't1')],
};

type Picks = readonly (readonly [number, number?])[];

/** Plays a whole deck: per problem a family chip, plus a technique chip when step 2 is asked. */
function play(data: PatternSenseData, picks: Picks): string {
  let state = startWeekRun();
  for (const [family, technique] of picks) {
    state = chooseFamily(state, data, family);
    if (state.phase === 'technique') state = chooseTechnique(state, data, technique ?? 0);
    state = advance(state, data);
  }
  expect(state.phase).toBe('done');
  return encodeResults(data, state.answers);
}

describe('week run + encodeResults', () => {
  const cases: readonly [string, PatternSenseData, Picks, string][] = [
    [
      'shared example (right/right, single-technique skip, wrong family then technique)',
      SHARED,
      [[3, 1], [2], [4, 1]],
      `PS1 ${WEEK} ${HASH} 1004:+/+ 55:+/. 76:4/1`,
    ],
    [
      'wrong family, then step 2 is judged against the correct family’s techniques',
      SHARED,
      [[3, 1], [2], [4, 2]],
      `PS1 ${WEEK} ${HASH} 1004:+/+ 55:+/. 76:4/+`,
    ],
    [
      'wrong family on a single-technique family still skips step 2',
      SHARED,
      [[3, 2], [1], [3, 2]],
      `PS1 ${WEEK} ${HASH} 1004:+/2 55:1/. 76:+/+`,
    ],
    [
      'two-digit indices',
      WIDE,
      [[11, 10]],
      `PS1 ${WEEK} ${HASH} 7:11/10`,
    ],
  ];

  it.each(cases)('%s', (_name, data, picks, expected) => {
    expect(play(data, picks)).toBe(expected);
  });
});

describe('restoreCode', () => {
  const GOOD = `PS1 ${WEEK} ${HASH} 1004:+/+ 55:+/. 76:4/1`;
  const cases: readonly [string, string | null, string | null][] = [
    ['the deck’s own finished code', GOOD, GOOD],
    ['nothing stored', null, null],
    ['another week', GOOD.replace(WEEK, '2026-12-07'), null],
    ['another vocabulary hash', GOOD.replace(HASH, '000000'), null],
    ['wrong problem order', `PS1 ${WEEK} ${HASH} 55:+/. 1004:+/+ 76:4/1`, null],
    ['missing a problem', `PS1 ${WEEK} ${HASH} 1004:+/+ 55:+/.`, null],
    ['malformed token', `PS1 ${WEEK} ${HASH} 1004:+/+ 55:+/. 76:4`, null],
  ];

  it.each(cases)('%s', (_name, stored, expected) => {
    expect(restoreCode(SHARED, stored)).toBe(expected);
  });
});
