import { ProblemProgress } from '../../../core/models/progress.model';
import { ListFacet, filterProblems } from './progress-derivations';

function problem(lcNumber: number, title: string, comfort: string): ProblemProgress {
  return { lcNumber, title, comfort, difficulty: 'Easy' } as ProblemProgress;
}

const LIST = [
  problem(1, 'Two Sum', '🟢'),
  problem(15, 'Three Sum', '🔴'),
  problem(121, 'Best Time to Buy', '🟢'),
];
const GREEN: ListFacet = { kind: 'comfort', value: '🟢' };

describe('filterProblems', () => {
  const cases: [string, ListFacet | null, string, number[]][] = [
    ['facet and needle combine', GREEN, 'sum', [1]],
    ['needle alone', null, '12', [121]],
    ['blank needle leaves the facet result', GREEN, '', [1, 121]],
  ];

  it.each(cases)('%s', (_label, facet, needle, expected) => {
    expect(filterProblems(LIST, facet, needle).map((p) => p.lcNumber)).toEqual(expected);
  });
});
