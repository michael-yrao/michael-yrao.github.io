import { Technique } from '../../../core/models/progress.model';
import { groupByTier } from './technique-groups';

function makeTechnique(name: string, family: string, order?: number): Technique {
  return {
    name,
    family,
    tier: 'core',
    started: true,
    minProblems: 1,
    problemCount: 1,
    problems: [],
    bestComfort: '🟡',
    hasGreen: false,
    thin: false,
    hasVariantGap: false,
    ...(order === undefined ? {} : { order }),
  };
}

describe('groupByTier ordering', () => {
  const cases: { name: string; input: Technique[]; expected: string[][] }[] = [
    {
      name: 'ordered input comes out in study order, families by their smallest order',
      input: [
        makeTechnique('Alpha', 'Zeta', 5),
        makeTechnique('Beta', 'Alpha', 1),
        makeTechnique('Gamma', 'Zeta', 0),
        makeTechnique('Unordered', 'Alpha'),
      ],
      // Zeta holds order 0 and 5, Alpha holds 1 and an unordered one: Zeta first.
      expected: [['Gamma', 'Alpha'], ['Beta', 'Unordered']],
    },
    {
      name: 'input with no orders comes out A-Z',
      input: [
        makeTechnique('Beta', 'Zeta'),
        makeTechnique('Alpha', 'Zeta'),
        makeTechnique('Gamma', 'Alpha'),
      ],
      expected: [['Gamma'], ['Alpha', 'Beta']],
    },
  ];

  it.each(cases)('$name', ({ input, expected }) => {
    const [core] = groupByTier(input);

    expect(core.families.map((f) => f.items.map((t) => t.name))).toEqual(expected);
  });
});
