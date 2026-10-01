import { Technique, TechniqueTier } from '../../../core/models/progress.model';
import { RoadmapLevelRow, countRoadmapLevels } from './roadmap-levels';

function tech(tier: TechniqueTier, started: boolean): Technique {
  return { name: `${tier}-${started}`, tier, started } as Technique;
}

function rows(
  core: [number, number],
  intermediate: [number, number],
  advanced: [number, number],
): RoadmapLevelRow[] {
  return [
    { key: 'core', label: 'Core', started: core[0], total: core[1] },
    { key: 'intermediate', label: 'Intermediate', started: intermediate[0], total: intermediate[1] },
    { key: 'advanced', label: 'Advanced', started: advanced[0], total: advanced[1] },
  ];
}

describe('countRoadmapLevels', () => {
  const cases: { name: string; input: Technique[]; expected: RoadmapLevelRow[] }[] = [
    {
      name: 'a not-started core counts in Core, not Advanced',
      input: [tech('core', false)],
      expected: rows([0, 1], [0, 0], [0, 0]),
    },
    {
      name: 'dp and tier1 both land in Intermediate',
      input: [tech('dp', false), tech('tier1', false)],
      expected: rows([0, 0], [0, 2], [0, 0]),
    },
    {
      name: 'tier2 and tier3 both land in Advanced',
      input: [tech('tier2', false), tech('tier3', false)],
      expected: rows([0, 0], [0, 0], [0, 2]),
    },
    {
      name: 'a started technique raises its level started and total',
      input: [tech('core', true), tech('core', false)],
      expected: rows([1, 2], [0, 0], [0, 0]),
    },
    { name: 'an empty list yields no rows', input: [], expected: [] },
  ];

  it.each(cases)('$name', ({ input, expected }) => {
    expect(countRoadmapLevels(input)).toEqual(expected);
  });
});
