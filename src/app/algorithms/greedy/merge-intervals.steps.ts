// Walkthrough pending — grounded code only. Variant 'sort-merge' joins cse-progress 56:sort-merge
// (symbol merge_20260903); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const mergeIntervalsMeta: AlgorithmMeta = {
  id: 'merge-intervals',
  lcNumber: 56,
  title: 'Merge Intervals',
  difficulty: 'Medium',
  category: 'greedy',
  tags: ['Intervals', 'Sorting', 'Array'],
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an array of intervals, merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input.',
  examples: [
    {
      input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]',
      output: '[[1,6],[8,10],[15,18]]',
      explanation: '[1,3] & [2,6] overlap',
    },
    {
      input: 'intervals = [[1,4],[4,5]]',
      output: '[[1,5]]',
      explanation: 'touching counts as overlap',
    },
  ],
  constraints: ['1 <= intervals.length <= 10^4', '0 <= start_i <= end_i <= 10^4.'],
  hint: 'Sort intervals by start so each start is settled in place — then an interval merges into the previous one exactly when the prior end reaches its start, and only the end needs updating.',
  solutions: [
    {
      label: 'Sort + Merge',
      variant: 'sort-merge',
      generateSteps: () => [],
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(n)',
    },
  ],
};
