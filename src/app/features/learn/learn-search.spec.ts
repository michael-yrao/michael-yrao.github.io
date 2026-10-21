import { Technique } from '../../core/models/cheat-sheet.model';
import { FamilyGroup } from '../../core/services/cheat-sheet.service';
import { filterTechniques, matchesTechnique } from './learn-search';

function technique(overrides: Partial<Technique>): Technique {
  return {
    id: 't',
    name: 'Technique',
    family: 'misc',
    whenToUse: 'when to use text',
    signals: [],
    ...overrides,
  } as Technique;
}

const twoPointers = technique({
  id: 'two_pointers',
  name: 'Two pointers',
  family: 'arrays_and_hash',
  whenToUse: 'Pair search over a sorted array',
  signals: ['sorted input', 'find a pair'],
});
const dp = technique({
  id: 'dp',
  name: 'Dynamic programming',
  family: 'dp',
  whenToUse: 'Overlapping subproblems',
  signals: ['count the ways'],
});

describe('matchesTechnique', () => {
  const cases: [string, string, boolean][] = [
    ['name', 'two pointers', true],
    ['humanised family', 'arrays and hash', true],
    ['signal phrase', 'find a pair', true],
    ['when-to-use', 'pair search', true],
    ['miss', 'graph', false],
  ];

  it.each(cases)('by %s', (_label, needle, expected) => {
    expect(matchesTechnique(twoPointers, needle)).toBe(expected);
  });
});

describe('filterTechniques', () => {
  const byFamily: FamilyGroup[] = [
    { family: 'arrays_and_hash', techniques: [twoPointers] },
    { family: 'dp', techniques: [dp] },
  ];

  it('drops a family with no matching technique', () => {
    expect(filterTechniques(byFamily, 'count the ways').map((g) => g.family)).toEqual(['dp']);
  });

  it('returns the input itself for a blank needle', () => {
    expect(filterTechniques(byFamily, '')).toBe(byFamily);
  });
});
