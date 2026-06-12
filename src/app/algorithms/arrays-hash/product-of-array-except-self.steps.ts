import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import List


class Solution:
    def productExceptSelf(self, nums: List[int]) -> List[int]:
        # prefix and suffix product arrays
        # then loop through and just do result[i] = prefix[i] * suffix[i]
        # [1,2,3,4]
        # prefix: [1,1,2,6]
        # suffix: [24,12,4,1]
        # result = [24,12,8,6]

        prefix = [1] * len(nums)
        suffix = [1] * len(nums)
        result = [1] * len(nums)

        for i in range(1, len(nums)):
            prefix[i] = prefix[i - 1] * nums[i - 1]

        for i in range(len(nums) - 2, -1, -1):
            suffix[i] = suffix[i + 1] * nums[i + 1]

        for i in range(len(nums)):
            result[i] = prefix[i] * suffix[i]

        return result`;

function generateSteps(): Step[] {
  const nums = [1, 2, 3, 4];
  const n = nums.length;
  const prefix = Array(n).fill(1);
  const suffix = Array(n).fill(1);
  const result = Array(n).fill(1);
  const steps: Step[] = [];

  // ── Intro ──────────────────────────────────────────────────────
  steps.push({
    explanation:
      'No division allowed. Key insight: result[i] = (product of everything to the left of i) × (product of everything to the right of i). Build a prefix-product array and a suffix-product array, then multiply them.',
    highlightLine: 6,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'prefix', value: '[1, 1, 1, 1]' },
        { label: 'suffix', value: '[1, 1, 1, 1]' },
      ],
    },
    variables: [
      { name: 'nums', value: `[${nums.join(', ')}]` },
    ],
  });

  // ── Build prefix ───────────────────────────────────────────────
  for (let i = 1; i < n; i++) {
    prefix[i] = prefix[i - 1] * nums[i - 1];
    steps.push({
      explanation: `prefix[${i}] = prefix[${i - 1}] × nums[${i - 1}] = ${prefix[i - 1]} × ${nums[i - 1]} = ${prefix[i]}. This is the product of all elements strictly to the LEFT of index ${i}.`,
      highlightLine: 11,
      state: {
        type: 'array',
        cells: prefix.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'nums', value: `[${nums.join(', ')}]` },
          { label: 'suffix', value: '[1, 1, 1, 1]' },
        ],
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: `prefix[${i}]`, value: prefix[i], highlight: true },
      ],
    });
  }

  // ── Build suffix ───────────────────────────────────────────────
  for (let i = n - 2; i >= 0; i--) {
    suffix[i] = suffix[i + 1] * nums[i + 1];
    steps.push({
      explanation: `suffix[${i}] = suffix[${i + 1}] × nums[${i + 1}] = ${suffix[i + 1]} × ${nums[i + 1]} = ${suffix[i]}. This is the product of all elements strictly to the RIGHT of index ${i}.`,
      highlightLine: 14,
      state: {
        type: 'array',
        cells: suffix.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j > i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'nums', value: `[${nums.join(', ')}]` },
          { label: 'prefix', value: `[${prefix.join(', ')}]` },
        ],
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: `suffix[${i}]`, value: suffix[i], highlight: true },
      ],
    });
  }

  // ── Build result ───────────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    result[i] = prefix[i] * suffix[i];
    steps.push({
      explanation: `result[${i}] = prefix[${i}] × suffix[${i}] = ${prefix[i]} × ${suffix[i]} = ${result[i]}.`,
      highlightLine: 17,
      state: {
        type: 'array',
        cells: result.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('found' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'prefix', value: `[${prefix.join(', ')}]` },
          { label: 'suffix', value: `[${suffix.join(', ')}]` },
        ],
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: `prefix[${i}]`, value: prefix[i] },
        { name: `suffix[${i}]`, value: suffix[i] },
        { name: `result[${i}]`, value: result[i], highlight: true },
      ],
    });
  }

  // ── Final ──────────────────────────────────────────────────────
  steps.push({
    explanation: `Result: [${result.join(', ')}]. Each value is the product of every other element, computed in O(n) time with no division.`,
    highlightLine: 26,
    state: {
      type: 'array',
      cells: result.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'prefix', value: `[${prefix.join(', ')}]` },
        { label: 'suffix', value: `[${suffix.join(', ')}]` },
      ],
    },
    variables: [
      { name: 'result', value: `[${result.join(', ')}]`, highlight: true },
    ],
  });

  return steps;
}

const prefixSuffixSolution: SolutionVariant = {
  label: 'Prefix & Suffix',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const productOfArrayExceptSelfMeta: AlgorithmMeta = {
  id: 'product-of-array-except-self',
  lcNumber: 238,
  title: 'Product of Array Except Self',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Prefix Sum'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer. You must write an algorithm that runs in O(n) time and without using the division operation.',
  examples: [
    {
      input: 'nums = [1, 2, 3, 4]',
      output: '[24, 12, 8, 6]',
    },
    {
      input: 'nums = [-1, 1, 0, -3, 3]',
      output: '[0, 0, 9, 0, 0]',
    },
  ] as ProblemExample[],
  constraints: [
    '2 ≤ nums.length ≤ 10⁵',
    '-30 ≤ nums[i] ≤ 30',
    'The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.',
  ],
  hint: 'result[i] needs everything except nums[i]. Split that into "everything to the left" and "everything to the right." Each half can be computed in a single pass.',
  solutions: [prefixSuffixSolution],
};
