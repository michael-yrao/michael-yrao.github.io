import { AttemptRecognition } from './practice-attempt';
import { gateState, recognitionChoices } from './recognition-gate';
import type { TechniqueTier } from '../models/progress.model';

const PICK: AttemptRecognition = { picked: 'Two Pointers', at: '2026-10-20T10:00:00.000Z' };
const NUMBER = 15;

describe('gateState', () => {
  const cases = [
    { name: 'non-owner', canSave: false, done: new Set<number>(), pick: null, expected: 'open' },
    { name: 'done problem', canSave: true, done: new Set([NUMBER]), pick: null, expected: 'open' },
    { name: 'not done, no pick', canSave: true, done: new Set([1]), pick: null, expected: 'locked' },
    { name: 'not done, with pick', canSave: true, done: new Set([1]), pick: PICK, expected: 'open' },
    { name: 'details unknown', canSave: true, done: null, pick: null, expected: 'locked' },
  ];

  for (const { name, canSave, done, pick, expected } of cases) {
    it(name, () => {
      expect(gateState({ canSave, number: NUMBER, doneNumbers: done, pick })).toBe(expected);
    });
  }
});

describe('recognitionChoices', () => {
  const tech = (name: string, family: string, tier: TechniqueTier) => ({ name, family, tier });
  const cases = [
    { name: 'empty', input: [], expected: [] },
    {
      name: 'groups by family, ordered by label',
      input: [tech('Prefix Sum', 'prefix_sum', 'core'), tech('Hash Map', 'arrays_and_hash', 'core')],
      expected: [
        { family: 'arrays_and_hash', label: 'Arrays & Hashing', names: ['Hash Map'] },
        { family: 'prefix_sum', label: 'Prefix Sum', names: ['Prefix Sum'] },
      ],
    },
    {
      name: 'tier order, then name, inside a group',
      input: [
        tech('Zeta', 'graphs', 'core'),
        tech('Alpha', 'graphs', 'tier2'),
        tech('Beta', 'graphs', 'core'),
        tech('Gamma', 'graphs', 'dp'),
      ],
      expected: [{ family: 'graphs', label: 'Graphs', names: ['Beta', 'Zeta', 'Gamma', 'Alpha'] }],
    },
    {
      name: 'duplicate name appears once, first wins',
      input: [tech('Dup', 'graphs', 'core'), tech('Dup', 'trees', 'core')],
      expected: [{ family: 'graphs', label: 'Graphs', names: ['Dup'] }],
    },
  ];

  for (const { name, input, expected } of cases) {
    it(name, () => {
      expect(recognitionChoices(input)).toEqual(expected);
    });
  }
});
