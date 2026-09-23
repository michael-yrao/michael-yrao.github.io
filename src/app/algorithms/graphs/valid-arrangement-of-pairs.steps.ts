// Walkthrough pending — grounded code only. Variant 'hierholzer-stack' joins cse-progress 2097:hierholzer-stack
// (symbol validArrangementOfPairs_20260907); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: 'Hierholzer (Iterative Stack)',
  variant: 'hierholzer-stack',
  generateSteps: () => [],
  timeComplexity: 'O(E)',
  spaceComplexity: 'O(E)',
};

export const validArrangementOfPairsMeta: AlgorithmMeta = {
  id: 'valid-arrangement-of-pairs',
  lcNumber: 2097,
  title: 'Valid Arrangement of Pairs',
  difficulty: 'Hard',
  category: 'graphs',
  tags: ['Graph', 'Eulerian Path', 'Hash Map'],
  timeComplexity: 'O(E)',
  spaceComplexity: 'O(E)',
  description:
    'Given pairs[i] = [start_i, end_i], return any arrangement using every pair exactly once such that each pair\'s start equals the previous pair\'s end.',
  examples: [
    {
      input: 'pairs = [[5,1],[4,5],[11,9],[9,4]]',
      output: '[[11,9],[9,4],[4,5],[5,1]]',
      explanation: '9==9, 4==4, 5==5',
    },
  ] as ProblemExample[],
  constraints: ['1 ≤ pairs.length ≤ 10⁵', 'A valid arrangement exists.', 'No duplicate pairs.'],
  hint: "The numbers are graph nodes and the pairs are directed edges — using every edge exactly once to build a valid ordering is the Eulerian path shape, walked with Hierholzer's algorithm.",
  solutions: [solution],
};
