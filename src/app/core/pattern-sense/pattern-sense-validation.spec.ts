import { PatternSenseData } from '../models/pattern-sense.model';
import { isPatternSenseData } from './pattern-sense-validation';

function validData(): PatternSenseData {
  return {
    schemaVersion: 1,
    generatedAt: '2026-10-18',
    week: '2026-11-30',
    vocabHash: 'a3f9c2',
    families: [
      { id: 'greedy', techniques: ['Greedy (single pass)'] },
      { id: 'sliding_window', techniques: ['Fixed Window', 'Variable Window'] },
    ],
    problems: [
      {
        lcNumber: 1004,
        prompt: 'Flip at most k zeros to get the longest run of ones.',
        constraints: ['1 <= n <= 10^5'],
        family: 'sliding_window',
        technique: 'Variable Window',
        cue: 'Longest contiguous run under a budget.',
      },
    ],
  };
}

const NO_DECK: PatternSenseData = { ...validData(), week: null, problems: [] };

type Mutation = (data: PatternSenseData) => unknown;

describe('isPatternSenseData', () => {
  it('accepts a full deck and the no-deck shape', () => {
    expect(isPatternSenseData(validData())).toBe(true);
    expect(isPatternSenseData(NO_DECK)).toBe(true);
  });

  const rejected: readonly [string, Mutation][] = [
    ['bad schemaVersion', (d) => ({ ...d, schemaVersion: 2 })],
    ['missing week', ({ week: _week, ...rest }) => rest],
    ['invalid week', (d) => ({ ...d, week: '30-11-2026' })],
    ['bad vocabHash (uppercase)', (d) => ({ ...d, vocabHash: 'A3F9C2' })],
    ['bad vocabHash (length)', (d) => ({ ...d, vocabHash: 'a3f9c' })],
    ['families not an array', (d) => ({ ...d, families: 'greedy' })],
    ['family with no techniques', (d) => ({ ...d, families: [{ id: 'greedy', techniques: [] }] })],
    [
      'problem missing a field',
      ({ problems, ...rest }) => ({
        ...rest,
        problems: [{ ...problems[0], cue: undefined }],
      }),
    ],
    [
      'problem family not in families',
      ({ problems, ...rest }) => ({ ...rest, problems: [{ ...problems[0], family: 'trees' }] }),
    ],
    [
      'technique not in its family',
      ({ problems, ...rest }) => ({
        ...rest,
        problems: [{ ...problems[0], technique: 'Greedy (single pass)' }],
      }),
    ],
    ['week null with problems', (d) => ({ ...d, week: null })],
  ];

  it.each(rejected)('rejects %s', (_name, mutate) => {
    expect(isPatternSenseData(mutate(validData()))).toBe(false);
  });
});
