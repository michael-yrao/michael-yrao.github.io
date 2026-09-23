// Walkthrough pending — grounded code only. Variant 'seen-set' joins cse-progress 202:seen-set
// (symbol isHappy_20260902); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const happyNumberMeta: AlgorithmMeta = {
  id: 'happy-number',
  lcNumber: 202,
  title: 'Happy Number',
  difficulty: 'Easy',
  category: 'arrays-hash',
  tags: ['Hash Set', 'Math'],
  timeComplexity: 'O(log n)',
  spaceComplexity: 'O(log n)',
  description:
    'Determine whether a positive integer n is happy: repeatedly replace it with the sum of the squares of its digits until it reaches 1 (happy), or it enters a cycle that never includes 1 (not happy).',
  examples: [
    {
      input: 'n = 19',
      output: 'true',
      explanation: '1² + 9² = 82, 8² + 2² = 68, 6² + 8² = 100, 1² + 0² + 0² = 1',
    },
  ],
  constraints: ['1 <= n <= 2^31 - 1'],
  hint: "If a number ever reappears during the digit-square-sum process, you're in a cycle that will never reach 1 — track seen numbers in a set to detect that repeat.",
  solutions: [
    {
      label: 'Seen Set',
      variant: 'seen-set',
      generateSteps: () => [],
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(log n)',
    },
  ],
};
