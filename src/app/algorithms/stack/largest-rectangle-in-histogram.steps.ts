// Walkthrough pending — grounded code only. Variant 'monotonic-stack' joins cse-progress 84:monotonic-stack
// (symbol largestRectangleArea); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const largestRectangleInHistogramMeta: AlgorithmMeta = {
  id: 'largest-rectangle-in-histogram',
  lcNumber: 84,
  title: 'Largest Rectangle in Histogram',
  difficulty: 'Hard',
  category: 'stack',
  tags: ['Stack', 'Monotonic Stack', 'Array'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an array heights where heights[i] is the height of a histogram bar of width 1, return the area of the largest rectangle that fits entirely within the histogram.',
  examples: [
    {
      input: 'heights = [2,1,5,6,2,3]',
      output: '10',
      explanation: 'bars at index 2,3 → height 5 × width 2.',
    },
  ],
  constraints: ['1 <= len(heights) <= 1e5', '0 <= heights[i] <= 1e4'],
  hint: "A bar's rectangle is capped by the next smaller bar — so when a smaller height arrives, close out the areas of the taller bars before it using a monotonic increasing stack.",
  solutions: [
    {
      label: 'Monotonic Increasing Stack',
      variant: 'monotonic-stack',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
    },
  ],
};
