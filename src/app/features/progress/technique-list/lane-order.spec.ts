import { Technique } from '../../../core/models/progress.model';
import { EXPANSION_FAMILY, orderLanes } from './technique-map-layout';

function tech(name: string, family: string, order?: number): Technique {
  return {
    name,
    family,
    tier: 'core',
    started: true,
    minProblems: 3,
    problemCount: 1,
    problems: [1],
    bestComfort: '🟡',
    hasGreen: false,
    thin: true,
    hasVariantGap: false,
    ...(order === undefined ? {} : { order }),
  };
}

describe('orderLanes', () => {
  const cases: {
    label: string;
    techniques: Technique[];
    hidden?: string[];
    expected: string[];
  }[] = [
    {
      label: 'familyOrder ascending (a family sorts by its smallest technique order)',
      techniques: [tech('H', 'heap', 9), tech('A', 'arrays', 5), tech('A2', 'heap', 2), tech('T', 'trees', 3)],
      expected: ['heap', 'trees', 'arrays'],
    },
    {
      label: 'a null-order family goes after the ordered ones, alphabetically',
      techniques: [tech('Z', 'zeta'), tech('B', 'beta'), tech('H', 'heap', 4)],
      expected: ['heap', 'beta', 'zeta'],
    },
    {
      label: 'expansion is last even with the smallest order',
      techniques: [tech('E', EXPANSION_FAMILY, 0), tech('Z', 'zeta'), tech('H', 'heap', 4)],
      expected: ['heap', 'zeta', EXPANSION_FAMILY],
    },
    {
      label: 'a hidden family is excluded',
      techniques: [tech('H', 'heap', 1), tech('T', 'trees', 2), tech('E', EXPANSION_FAMILY)],
      hidden: ['heap', EXPANSION_FAMILY],
      expected: ['trees'],
    },
  ];

  it.each(cases)('$label', ({ techniques, hidden, expected }) => {
    expect(orderLanes(techniques, new Set(hidden ?? []))).toEqual(expected);
  });
});
