import { metaDrift, MetaDrift } from './meta-drift';

const LC = 1;
const meta = { lcNumber: LC, title: 'Two Sum', difficulty: 'Easy' as const };
const owner = { number: LC, title: 'Two Sum', difficulty: 'Easy' as const };

describe('metaDrift', () => {
  const cases: readonly [string, Parameters<typeof metaDrift>, MetaDrift[]][] = [
    ['match', [[meta], [owner]], []],
    [
      'title diff',
      [[{ ...meta, title: 'Two Sum I' }], [owner]],
      [{ lcNumber: LC, field: 'title', site: 'Two Sum I', owner: 'Two Sum' }],
    ],
    [
      'difficulty diff',
      [[{ ...meta, difficulty: 'Hard' }], [owner]],
      [{ lcNumber: LC, field: 'difficulty', site: 'Hard', owner: 'Easy' }],
    ],
    [
      'lc missing from practice',
      [[meta], []],
      [{ lcNumber: LC, field: 'missing', site: 'Two Sum', owner: '(not in practice.json)' }],
    ],
  ];

  it.each(cases)('%s', (_name, args, expected) => {
    expect(metaDrift(...args)).toEqual(expected);
  });
});
