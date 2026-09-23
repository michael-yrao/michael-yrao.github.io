// Walkthrough pending — grounded code only. Variant 'backtracking' joins cse-progress 22:backtracking
// (symbol generateParenthesis); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: 'Backtracking',
  variant: 'backtracking',
  generateSteps: () => [],
  timeComplexity: 'O(4ⁿ / √n)',
  spaceComplexity: 'O(n)',
};

export const generateParenthesesMeta: AlgorithmMeta = {
  id: 'generate-parentheses',
  lcNumber: 22,
  title: 'Generate Parentheses',
  difficulty: 'Medium',
  category: 'backtracking',
  tags: ['Backtracking', 'String', 'Recursion'],
  timeComplexity: 'O(4ⁿ / √n)',
  spaceComplexity: 'O(n)',
  description:
    'Given n pairs of parentheses, generate all combinations of well-formed (valid) parentheses.',
  examples: [
    { input: 'n = 3', output: '["((()))","(()())","(())()","()(())","()()()"]' },
    { input: 'n = 1', output: '["()"]' },
  ] as ProblemExample[],
  constraints: ['1 ≤ n ≤ 8'],
  hint: 'At each position you choose to add an open paren or a closed paren, tracked by an open-count and close-count state — a closed paren is only legal once the close count trails the open count.',
  solutions: [solution],
};
