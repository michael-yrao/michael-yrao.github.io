// Walkthrough pending — grounded code only. Variant 'three-pass' joins cse-progress 57:three-pass
// (symbol insertInterval_20260828); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const insertIntervalMeta: AlgorithmMeta = {
  id: 'insert-interval',
  lcNumber: 57,
  title: 'Insert Interval',
  difficulty: 'Medium',
  category: 'greedy',
  tags: ['Intervals', 'Array'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given a list of non-overlapping intervals sorted by start and a new interval, insert the new interval into the list so the result stays sorted and non-overlapping, merging where needed, and return the resulting list.',
  examples: [
    {
      input: 'intervals = [[1,3],[6,9]], newInterval = [2,5]',
      output: '[[1,5],[6,9]]',
    },
    {
      input: 'intervals = [[1,2],[3,5],[6,7],[8,10],[12,16]], newInterval = [4,8]',
      output: '[[1,2],[3,10],[12,16]]',
    },
  ],
  constraints: ['intervals sorted by start, non-overlapping', '0 <= n <= 10^4.'],
  hint: "Two intervals overlap exactly when one's end reaches into the other's start — so scan in three passes: intervals strictly before the new one, intervals that overlap and merge into it, then intervals strictly after.",
  solutions: [
    {
      label: 'Three-Pass Scan',
      variant: 'three-pass',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
    },
  ],
};
