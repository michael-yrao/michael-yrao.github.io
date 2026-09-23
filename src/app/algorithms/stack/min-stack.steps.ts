// Walkthrough pending — grounded code only. Variant 'pair-min' joins cse-progress 155:pair-min
// (symbol MinStack); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const minStackMeta: AlgorithmMeta = {
  id: 'min-stack',
  lcNumber: 155,
  title: 'Min Stack',
  difficulty: 'Medium',
  category: 'stack',
  tags: ['Stack', 'Design'],
  timeComplexity: 'O(1) per operation',
  spaceComplexity: 'O(n)',
  description:
    'Design a stack supporting push, pop, top, and getMin — each operation must run in O(1) time.',
  examples: [
    {
      input: 'push(-2); push(0); push(-3)',
      output: 'getMin() -> -3',
      explanation: 'pop(); top() -> 0; getMin() -> -2',
    },
  ],
  constraints: [
    '-2^31 <= val <= 2^31 - 1',
    'pop, top and getMin are always called on a non-empty stack.',
    'At most 3 * 10^4 calls will be made to push, pop, top, and getMin.',
  ],
  hint: 'Store each value together with the running minimum-so-far as a pair in the same stack slot, so top and min are both O(1).',
  solutions: [
    {
      label: 'Pair with Min-So-Far',
      variant: 'pair-min',
      generateSteps: () => [],
      timeComplexity: 'O(1) per operation',
      spaceComplexity: 'O(n)',
    },
  ],
};
