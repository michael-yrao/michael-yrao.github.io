// Walkthrough pending — grounded code only. Variant 'greedy-range' joins cse-progress 45:greedy-range
// (symbol jump); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const jumpGameIiMeta: AlgorithmMeta = {
  id: 'jump-game-ii',
  lcNumber: 45,
  title: 'Jump Game II',
  difficulty: 'Medium',
  category: 'greedy',
  tags: ['Greedy', 'Array'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given a 0-indexed array nums where nums[i] is the maximum jump length forward from index i, return the minimum number of jumps needed to reach the last index (reaching it is guaranteed).',
  examples: [
    {
      input: 'nums = [2,3,1,1,4]',
      output: '2',
      explanation: 'jump 1 step 0->1, then 3 steps 1->4',
    },
    {
      input: 'nums = [2,3,0,1,4]',
      output: '2',
    },
  ],
  constraints: ['1 <= n <= 1e4', '0 <= nums[i] <= 1000', 'reaching n-1 is guaranteed.'],
  hint: 'Among every index reachable within the current jump, move to whichever one maximizes i + nums[i] — that furthest reach is what minimizes the total jump count.',
  solutions: [
    {
      label: 'Greedy Reach Window',
      variant: 'greedy-range',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
    },
  ],
};
