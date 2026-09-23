// Walkthrough pending — grounded code only. Variant 'boundary-binary-search' joins cse-progress 34:boundary-binary-search
// (symbol searchRange_20260916); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const findFirstAndLastPositionMeta: AlgorithmMeta = {
  id: 'find-first-and-last-position',
  lcNumber: 34,
  title: 'Find First and Last Position of Element in Sorted Array',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Binary Search', 'Array'],
  timeComplexity: 'O(log n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an array nums sorted in non-decreasing order, find the starting and ending position of a given target value, returning [-1, -1] if target is not found — in O(log n) time.',
  examples: [
    { input: 'nums = [5,7,7,8,8,10], target = 8', output: '[3, 4]' },
    { input: 'nums = [5,7,7,8,8,10], target = 6', output: '[-1, -1]' },
    { input: 'nums = [], target = 0', output: '[-1, -1]' },
  ],
  constraints: [
    '0 <= nums.length <= 10^5',
    '-10^9 <= nums[i] <= 10^9',
    'nums is a non-decreasing array.',
    '-10^9 <= target <= 10^9',
  ],
  hint: 'Recognize you need two separate boundary searches — one biased to find the leftmost match, one biased to find the rightmost.',
  solutions: [
    {
      label: 'Two Boundary Binary Searches',
      variant: 'boundary-binary-search',
      generateSteps: () => [],
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(1)',
    },
  ],
};
