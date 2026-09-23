// Walkthrough pending — grounded code only. Variant 'monotonic-deque' joins cse-progress 239:monotonic-deque
// (symbol maxSlidingWindow_20260822); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const slidingWindowMaximumMeta: AlgorithmMeta = {
  id: 'sliding-window-maximum',
  lcNumber: 239,
  title: 'Sliding Window Maximum',
  difficulty: 'Hard',
  category: 'stack',
  tags: ['Deque', 'Monotonic Queue', 'Sliding Window'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(k)',
  description:
    'Given an array nums and a sliding window of size k moving from left to right one position at a time, return an array of the maximum value in the window at each position.',
  examples: [
    {
      input: 'nums = [1,3,-1,-3,5,3,6,7], k = 3',
      output: '[3,3,5,5,6,7]',
    },
  ],
  constraints: ['1 <= nums.length <= 1e5', '-1e4 <= nums[i] <= 1e4', '1 <= k <= nums.length'],
  hint: 'Simulate the sliding window with a deque you can pop from both ends — monotonically decreasing so the front always holds the window\'s max.',
  solutions: [
    {
      label: 'Monotonic Deque',
      variant: 'monotonic-deque',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(k)',
    },
  ],
};
