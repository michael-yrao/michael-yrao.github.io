// Walkthrough pending — grounded code only. Variant 'max-reach' joins cse-progress 55:max-reach
// (symbol jumpGame); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const jumpGameMeta: AlgorithmMeta = {
  id: 'jump-game',
  lcNumber: 55,
  title: 'Jump Game',
  difficulty: 'Medium',
  category: 'greedy',
  tags: ['Greedy', 'Array'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array nums where nums[i] is the maximum jump length from index i, determine whether you can reach the last index starting from index 0.',
  examples: [
    {
      input: 'nums = [2,3,1,1,4]',
      output: 'True',
      explanation: '0->1->4, or 0->2->3->4',
    },
    {
      input: 'nums = [3,2,1,0,4]',
      output: 'False',
      explanation: 'every path stalls at the 0 at index 3',
    },
  ],
  constraints: ['1 <= len(nums) <= 10^4', '0 <= nums[i] <= 10^5.'],
  hint: "It doesn't matter which path you take to the end, only whether each index stays within reach — so track the furthest index (i + nums[i]) reachable so far as you scan forward.",
  solutions: [
    {
      label: 'Greedy Max Reach',
      variant: 'max-reach',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
    },
  ],
};
