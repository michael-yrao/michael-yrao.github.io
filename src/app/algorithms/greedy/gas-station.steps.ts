// Walkthrough pending — grounded code only. Variant 'greedy-reset' joins cse-progress 134:greedy-reset
// (symbol gasStation_20260921); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const gasStationMeta: AlgorithmMeta = {
  id: 'gas-station',
  lcNumber: 134,
  title: 'Gas Station',
  difficulty: 'Medium',
  category: 'greedy',
  tags: ['Greedy', 'Array'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given circular arrays gas and cost for n gas stations, return the starting station index that lets a car with an unlimited tank complete the circuit once, or -1 if no such start exists (guaranteed unique when one does).',
  examples: [
    {
      input: 'gas = [1,2,3,4,5], cost = [3,4,5,1,2]',
      output: '3',
    },
    {
      input: 'gas = [2,3,4], cost = [3,4,3]',
      output: '-1',
    },
  ],
  constraints: ['n == gas.length == cost.length', '1 <= n <= 10^5', '0 <= gas[i], cost[i] <= 10^4'],
  hint: "If total gas is at least total cost a valid start exists; scan the net gain gas[i] − cost[i], and whenever the running total dips below zero, reset it and try starting from the next station — a Kadane's-style greedy reset.",
  solutions: [
    {
      label: 'Greedy Reset',
      variant: 'greedy-reset',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
    },
  ],
};
