// Walkthrough pending — grounded code only. Variant 'kahn-bfs' joins cse-progress 269:kahn-bfs
// (symbol alienOrder_20260906); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: "Topological Sort (Kahn's BFS)",
  variant: 'kahn-bfs',
  generateSteps: () => [],
  timeComplexity: 'O(C)',
  spaceComplexity: 'O(1)',
};

export const alienDictionaryMeta: AlgorithmMeta = {
  id: 'alien-dictionary',
  lcNumber: 269,
  title: 'Alien Dictionary',
  difficulty: 'Hard',
  category: 'graphs',
  tags: ['Graph', 'Topological Sort', 'BFS'],
  timeComplexity: 'O(C)',
  spaceComplexity: 'O(1)',
  description:
    "Given a list of words from an alien language sorted lexicographically by that language's unknown letter order, return a string of the unique letters in that order — any valid order if several exist, or an empty string if none exists.",
  examples: [
    { input: 'words = ["wrt","wrf","er","ett","rftt"]', output: '"wertf"' },
    { input: 'words = ["z","x"]', output: '"zx"' },
    {
      input: 'words = ["z","x","z"]',
      output: '""',
      explanation: 'The ordering is invalid — no valid alien order exists.',
    },
    {
      input: 'words = ["ca","cb"]',
      output: '"cab"',
      explanation:
        'The only constraint is a < b (they differ at index 1); \'c\' is never ordered against a or b, so it may go anywhere. Any of "cab", "acb", "abc" (any order with a before b) is correct.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ words.length ≤ 100',
    '1 ≤ words[i].length ≤ 100',
    'words[i] consists of only lowercase English letters.',
  ],
  hint: 'The first character where two adjacent words differ is the only ordering signal between them — that char-to-char dependency is a topological sort.',
  solutions: [solution],
};
