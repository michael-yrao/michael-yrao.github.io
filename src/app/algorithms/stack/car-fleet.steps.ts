// Walkthrough pending — grounded code only. Variant 'sort-stack' joins cse-progress 853:sort-stack
// (symbol carFleet_20260829); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const carFleetMeta: AlgorithmMeta = {
  id: 'car-fleet',
  lcNumber: 853,
  title: 'Car Fleet',
  difficulty: 'Medium',
  category: 'stack',
  tags: ['Stack', 'Sorting', 'Array'],
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(n)',
  description:
    'Given target, and arrays position and speed for n cars travelling toward target where a car cannot pass another but can catch up and travel alongside it, return the number of car fleets that will arrive at target.',
  examples: [
    {
      input: 'target = 12, position = [10,8,0,5,3], speed = [2,4,1,1,3]',
      output: '3',
      explanation:
        'The cars starting at 10 (speed 2) and 8 (speed 4) become a fleet, meeting each other at 12. The fleet forms at target. The car starting at 0 (speed 1) does not catch up to any other car, so it is a fleet by itself. The cars starting at 5 (speed 1) and 3 (speed 3) become a fleet, meeting each other at 6. The fleet moves at speed 1 until it reaches target.',
    },
    { input: 'target = 10, position = [3], speed = [3]', output: '1' },
    { input: 'target = 100, position = [0,2,4], speed = [4,2,1]', output: '1' },
  ],
  constraints: [
    'n == position.length == speed.length',
    '1 <= n <= 10^5',
    '0 < target <= 10^6',
    '0 <= position[i] < target',
    'All the values of position are unique.',
    '0 < speed[i] <= 10^6',
  ],
  hint: 'A car in front can never be passed, so sort cars by starting position (closest to target first) and track finish times with a stack — cars that catch up merge into the same fleet.',
  solutions: [
    {
      label: 'Sort + Stack of Arrival Times',
      variant: 'sort-stack',
      generateSteps: () => [],
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(n)',
    },
  ],
};
