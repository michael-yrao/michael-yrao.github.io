// Walkthrough pending — grounded code only. Variant 'sort-by-end' joins cse-progress 435:sort-by-end
// (symbol nonOverlappingIntervals); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const nonOverlappingIntervalsMeta: AlgorithmMeta = {
  id: 'non-overlapping-intervals',
  lcNumber: 435,
  title: 'Non-overlapping Intervals',
  difficulty: 'Medium',
  category: 'greedy',
  tags: ['Intervals', 'Greedy', 'Sorting'],
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an array of intervals, return the minimum number of intervals you must remove so that the rest are non-overlapping (intervals that only touch at an endpoint do not count as overlapping).',
  examples: [
    {
      input: 'intervals = [[1,2],[2,3],[3,4],[1,3]]',
      output: '1',
      explanation: 'remove [1,3]',
    },
    {
      input: 'intervals = [[1,2],[1,2],[1,2]]',
      output: '2',
    },
    {
      input: 'intervals = [[1,2],[2,3]]',
      output: '0',
    },
  ],
  constraints: ['1 <= n <= 10^5', '-5*10^4 <= start < end <= 5*10^4.'],
  hint: "To remove as few intervals as possible, keep as many as possible — sort by end time and greedily keep an interval only when its start is at or after the last kept interval's end.",
  solutions: [
    {
      label: 'Sort by End',
      variant: 'sort-by-end',
      generateSteps: () => [],
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(1)',
    },
  ],
};
