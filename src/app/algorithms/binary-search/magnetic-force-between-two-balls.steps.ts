// Walkthrough pending — grounded code only. Variant 'binary-search-answer' joins cse-progress 1552:binary-search-answer
// (symbol maxDistance_20260922); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const magneticForceBetweenTwoBallsMeta: AlgorithmMeta = {
  id: 'magnetic-force-between-two-balls',
  lcNumber: 1552,
  title: 'Magnetic Force Between Two Balls',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Binary Search', 'Sorting', 'Greedy'],
  timeComplexity: 'O(n log n + n log R)',
  spaceComplexity: 'O(1)',
  description:
    'Given basket positions and m balls, place the balls into baskets to maximize the minimum distance between any two balls, and return that maximum possible minimum distance.',
  examples: [
    {
      input: 'position=[1,2,3,4,7], m=3',
      output: '3',
      explanation: 'place at 1, 4, 7 -> gaps 3,3 -> min 3.',
    },
    { input: 'position=[5,4,3,2,1,1000000000], m=2', output: '999999999' },
  ],
  constraints: ['1 <= position[i] <= 1e9', '2 <= m <= len(position) <= 1e5'],
  hint: 'Sort the positions, then binary search on the candidate minimum-distance answer itself, checking with a greedy feasibility pass whether that distance lets you place all m balls.',
  solutions: [
    {
      label: 'Binary Search on the Answer',
      variant: 'binary-search-answer',
      generateSteps: () => [],
      timeComplexity: 'O(n log n + n log R)',
      spaceComplexity: 'O(1)',
    },
  ],
};
