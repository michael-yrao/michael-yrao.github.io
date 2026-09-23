// Walkthrough pending — grounded code only. Variant 'monotonic-stack' joins cse-progress 739:monotonic-stack
// (symbol dailyTemperatures_20260906); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const dailyTemperaturesMeta: AlgorithmMeta = {
  id: 'daily-temperatures',
  lcNumber: 739,
  title: 'Daily Temperatures',
  difficulty: 'Medium',
  category: 'stack',
  tags: ['Stack', 'Monotonic Stack', 'Array'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an array of daily temperatures, return an array answer where answer[i] is the number of days you must wait after day i to see a warmer temperature, or 0 if no such day exists.',
  examples: [
    { input: 'temperatures = [73,74,75,71,69,72,76,73]', output: '[1,1,4,2,1,1,0,0]' },
    { input: 'temperatures = [30,40,50,60]', output: '[1,1,1,0]' },
    { input: 'temperatures = [30,60,90]', output: '[1,1,0]' },
  ],
  constraints: ['1 <= temperatures.length <= 10^5', '30 <= temperatures[i] <= 100'],
  hint: "The answer needs index differences to the next higher value — that 'next greater' shape is the cue for a monotonically decreasing stack of indices.",
  solutions: [
    {
      label: 'Monotonic Decreasing Stack',
      variant: 'monotonic-stack',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
    },
  ],
};
