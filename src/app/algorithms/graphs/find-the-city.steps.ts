// Walkthrough pending — grounded code only. Variant 'floyd-warshall' joins cse-progress 1334:floyd-warshall
// (symbol findTheCity_20260825); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: 'Floyd-Warshall',
  variant: 'floyd-warshall',
  generateSteps: () => [],
  timeComplexity: 'O(n³)',
  spaceComplexity: 'O(n²)',
};

export const findTheCityMeta: AlgorithmMeta = {
  id: 'find-the-city',
  lcNumber: 1334,
  title: 'Find the City With the Smallest Number of Neighbors at a Threshold Distance',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Graph', 'Floyd-Warshall', 'Shortest Path'],
  timeComplexity: 'O(n³)',
  spaceComplexity: 'O(n²)',
  description:
    'Given a weighted, bidirectional graph of n cities and a distance threshold, return the city reachable from the fewest other cities within that threshold, breaking ties by returning the city with the greatest number.',
  examples: [
    {
      input: 'n = 4, edges = [[0,1,3],[1,2,1],[1,3,4],[2,3,1]], distanceThreshold = 4',
      output: '3',
      explanation:
        'The neighboring cities at a distanceThreshold = 4 for each city are: City 0 -> [City 1, City 2]; City 1 -> [City 0, City 2, City 3]; City 2 -> [City 0, City 1, City 3]; City 3 -> [City 1, City 2]. Cities 0 and 3 have 2 neighboring cities at a distanceThreshold = 4, but we have to return city 3 since it has the greatest number.',
    },
    {
      input: 'n = 5, edges = [[0,1,2],[0,4,8],[1,2,3],[1,4,2],[2,3,1],[3,4,1]], distanceThreshold = 2',
      output: '0',
      explanation:
        'The neighboring cities at a distanceThreshold = 2 for each city are: City 0 -> [City 1]; City 1 -> [City 0, City 4]; City 2 -> [City 3, City 4]; City 3 -> [City 2, City 4]; City 4 -> [City 1, City 2, City 3].',
    },
  ] as ProblemExample[],
  constraints: [
    '2 ≤ n ≤ 100',
    '1 ≤ edges.length ≤ n * (n - 1) / 2',
    'edges[i].length == 3',
    '0 ≤ from_i < to_i < n',
    '1 ≤ weight_i, distanceThreshold ≤ 10⁴',
    'All pairs (from_i, to_i) are distinct.',
  ],
  hint: 'Needing shortest distances between every pair of cities, with n small enough for an O(n³) pass, is the Floyd-Warshall shape — relax all-pairs distances through each possible midpoint city.',
  solutions: [solution],
};
