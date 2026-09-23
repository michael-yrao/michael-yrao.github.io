// Walkthrough pending — grounded code only. Variant 'stack' joins cse-progress 150:stack
// (symbol evalRPN_20260821); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const evaluateReversePolishNotationMeta: AlgorithmMeta = {
  id: 'evaluate-reverse-polish-notation',
  lcNumber: 150,
  title: 'Evaluate Reverse Polish Notation',
  difficulty: 'Medium',
  category: 'stack',
  tags: ['Stack', 'Array', 'Math'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an array of strings tokens representing an arithmetic expression in Reverse Polish Notation, evaluate the expression and return its integer value.',
  examples: [
    {
      input: 'tokens = ["2","1","+","3","*"]',
      output: '9',
      explanation: '((2 + 1) * 3) = 9',
    },
  ],
  constraints: [
    '1 <= tokens.length <= 10^4',
    'tokens[i] is either an operator ("+", "-", "*", "/") or an integer in the range [-200, 200]',
  ],
  hint: 'Recognize you need a stack of values, not indices — operands push on, and each operator pops the last two to push back a result.',
  solutions: [
    {
      label: 'Stack',
      variant: 'stack',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
    },
  ],
};
