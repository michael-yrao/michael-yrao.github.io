import { Technique, TechniqueTier } from '../../../core/models/progress.model';
import { RoadmapLevelRow, RoadmapTile, groupRoadmapLevels } from './roadmap-levels';

function tech(tier: TechniqueTier, started: boolean, name = `${tier}-${started}`): Technique {
  return { name, tier, started } as Technique;
}

function level(
  key: RoadmapLevelRow['key'],
  label: string,
  started: number,
  tiles: RoadmapTile[],
): RoadmapLevelRow {
  return { key, label, started, total: tiles.length, tiles };
}

function rows(core: RoadmapTile[] = [], intermediate: RoadmapTile[] = [], advanced: RoadmapTile[] = []): RoadmapLevelRow[] {
  const startedOf = (tiles: RoadmapTile[]) => tiles.filter((t) => t.started).length;
  return [
    level('core', 'Core', startedOf(core), core),
    level('intermediate', 'Intermediate', startedOf(intermediate), intermediate),
    level('advanced', 'Advanced', startedOf(advanced), advanced),
  ];
}

describe('groupRoadmapLevels', () => {
  const cases: { name: string; input: Technique[]; expected: RoadmapLevelRow[] }[] = [
    {
      name: 'a not-started core counts in Core, not Advanced',
      input: [tech('core', false)],
      expected: rows([{ name: 'core-false', started: false }]),
    },
    {
      name: 'dp and tier1 both land in Intermediate',
      input: [tech('dp', false), tech('tier1', false)],
      expected: rows([], [
        { name: 'dp-false', started: false },
        { name: 'tier1-false', started: false },
      ]),
    },
    {
      name: 'tier2 and tier3 both land in Advanced',
      input: [tech('tier2', false), tech('tier3', false)],
      expected: rows([], [], [
        { name: 'tier2-false', started: false },
        { name: 'tier3-false', started: false },
      ]),
    },
    {
      name: 'a started technique raises its level started and total',
      input: [tech('core', true), tech('core', false)],
      expected: rows([
        { name: 'core-true', started: true },
        { name: 'core-false', started: false },
      ]),
    },
    {
      name: 'started tiles come before not-started within a level, original order kept in each group',
      input: [tech('core', false, 'A'), tech('core', true, 'B'), tech('core', false, 'C'), tech('core', true, 'D')],
      expected: rows([
        { name: 'B', started: true },
        { name: 'D', started: true },
        { name: 'A', started: false },
        { name: 'C', started: false },
      ]),
    },
    { name: 'an empty list yields no rows', input: [], expected: [] },
  ];

  it.each(cases)('$name', ({ input, expected }) => {
    expect(groupRoadmapLevels(input)).toEqual(expected);
  });
});
