// Walkthrough pending — grounded code only. Variant 'include-exclude' joins cse-progress 78:include-exclude
// (symbol subsets); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: 'Backtracking (Include / Exclude)',
  variant: 'include-exclude',
  generateSteps: () => [],
  timeComplexity: 'O(n · 2ⁿ)',
  spaceComplexity: 'O(n · 2ⁿ)',
};

export const subsetsMeta: AlgorithmMeta = {
  id: 'subsets',
  lcNumber: 78,
  title: 'Subsets',
  difficulty: 'Medium',
  category: 'backtracking',
  tags: ['Backtracking', 'Array', 'Recursion'],
  timeComplexity: 'O(n · 2ⁿ)',
  spaceComplexity: 'O(n · 2ⁿ)',
  description:
    'Given an array of unique integers, return all possible subsets (the power set); the result must not contain duplicate subsets.',
  examples: [
    { input: 'nums = [1,2,3]', output: '[[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]' },
    { input: 'nums = [0]', output: '[[],[0]]' },
  ] as ProblemExample[],
  constraints: ['1 ≤ nums.length ≤ 10', '-10 ≤ nums[i] ≤ 10', 'All elements of nums are unique.'],
  hint: 'At each index you make a binary choice — include this number in the running path or leave it out — recursing on both branches until every index has been decided.',
  solutions: [solution],
};
