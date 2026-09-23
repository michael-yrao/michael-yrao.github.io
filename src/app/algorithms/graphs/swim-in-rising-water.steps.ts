// Walkthrough pending — grounded code only. Variant 'dijkstra-heap' joins cse-progress 778:dijkstra-heap
// (symbol swimInWater_20260822); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: 'Dijkstra (Min-Heap)',
  variant: 'dijkstra-heap',
  generateSteps: () => [],
  timeComplexity: 'O(n² log n)',
  spaceComplexity: 'O(n²)',
};

export const swimInRisingWaterMeta: AlgorithmMeta = {
  id: 'swim-in-rising-water',
  lcNumber: 778,
  title: 'Swim in Rising Water',
  difficulty: 'Hard',
  category: 'graphs',
  tags: ['Graph', 'Dijkstra', 'Heap', 'Grid'],
  timeComplexity: 'O(n² log n)',
  spaceComplexity: 'O(n²)',
  description:
    'Given an n x n grid of elevations, find the minimum time t such that a path of 4-directionally adjacent cells, each with elevation at most t, connects the top-left cell to the bottom-right cell.',
  examples: [
    {
      input: 'grid = [[0,2],[1,3]]',
      output: '3',
      explanation:
        'At time 0 you are at (0,0). You cannot move since the four adjacent cells all have higher elevation than t=0. You cannot reach (1,1) until t=3, when the path (0,0)->(0,1)->(1,1) (elevations 0,2,3) all have elevation <= 3.',
    },
    {
      input: 'grid = [[0,1,2,3,4],[24,23,22,21,5],[12,13,14,15,16],[11,17,18,19,20],[10,9,8,7,6]]',
      output: '16',
    },
  ] as ProblemExample[],
  constraints: [
    'n == grid.length == grid[i].length',
    '1 ≤ n ≤ 50',
    '0 ≤ grid[i][j] < n²',
    'Each value grid[i][j] is unique.',
  ],
  hint: 'Fixed start and end cells where you must always expand to the lowest-elevation reachable cell next is the Dijkstra shape — pull neighbors through a min-heap.',
  solutions: [solution],
};
