import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Set iteration ────────────────────────────────────────────────

const SET_ITERATION_CODE = `from typing import List


class Solution:
    def containsDuplicate(self, nums: List[int]) -> bool:
        # since we only care about if it contains duplicates
        # what we can do is just iterate til we see a duplicate
        # question is how do we keep track of duplicates or if we need to
        numsSet = set()

        for integer in nums:
            if integer in numsSet:
                return True
            else:
                numsSet.add(integer)

        return False`;

function generateSetIterationSteps(): Step[] {
  const nums = [1, 2, 3, 1];
  const steps: Step[] = [];
  const seen = new Set<number>();

  steps.push({
    explanation:
      'We initialize an empty set. A set gives us O(1) membership checks — much faster than scanning the array each time. We\'ll walk through nums and ask "have I seen this before?"',
    highlightLine: 9,
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: 'default' })),
      pointers: [],
      hashmap: {},
    },
    variables: [
      { name: 'numsSet', value: '{}' },
    ],
  });

  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    const inSet = seen.has(n);

    const cells = nums.map((v, idx) => ({
      value: v,
      state:
        idx === i
          ? inSet
            ? ('found' as const)
            : ('active' as const)
          : idx < i
          ? ('visited' as const)
          : ('default' as const),
    }));

    if (inSet) {
      steps.push({
        explanation: `Index ${i}, value ${n}. Is ${n} in our set? YES! We've seen it before. Return true — duplicate found. The set caught this in O(1).`,
        highlightLine: 12,
        state: {
          type: 'array',
          cells,
          pointers: [{ index: i, label: 'i' }],
          hashmap: Object.fromEntries([...seen].map((v) => [v, '✓'])),
        },
        variables: [
          { name: 'integer', value: n, highlight: true },
          { name: 'integer in numsSet', value: 'yes', highlight: true },
          { name: 'result', value: 'true', highlight: true },
        ],
      });
      break;
    }

    steps.push({
      explanation: `Index ${i}, value ${n}. Not in the set yet — no duplicate so far. Add ${n} to the set so we can detect it if it appears again.`,
      highlightLine: 15,
      state: {
        type: 'array',
        cells,
        pointers: [{ index: i, label: 'i' }],
        hashmap: Object.fromEntries([...seen].map((v) => [v, '✓'])),
      },
      variables: [
        { name: 'integer', value: n, highlight: true },
        { name: 'integer in numsSet', value: 'no' },
        { name: 'numsSet', value: seen.size + 1 },
      ],
    });

    seen.add(n);
  }

  return steps;
}

// ── Solution 2: Length comparison ────────────────────────────────────────────

const LEN_COMPARISON_CODE = `from typing import List


class Solution:
    def containsDuplicateAlternative(self, nums: List[int]) -> bool:
        # since we only care about if it contains duplicates
        # we can check if when we convert this list to a set
        # whether or not the lengths are equal
        # this solution is still O(n) in both space and time
        # since python is still creating the set

        # returns true if len of the set is shorter than the length of the original list
        return len(set(nums)) < len(nums)`;

function generateLenComparisonSteps(): Step[] {
  return [];
}

// ── Export ───────────────────────────────────────────────────────────────────

export const containsDuplicateMeta: AlgorithmMeta = {
  id: 'contains-duplicate',
  lcNumber: 217,
  title: 'Contains Duplicate',
  difficulty: 'Easy',
  category: 'arrays-hash',
  tags: ['Hash Set', 'Array'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an integer array nums, return true if any value appears at least twice in the array, and false if every element is distinct.',
  examples: [
    { input: 'nums = [1, 2, 3, 1]', output: 'true', explanation: '1 appears at index 0 and index 3' },
    { input: 'nums = [1, 2, 3, 4]', output: 'false', explanation: 'All values are distinct' },
  ] as ProblemExample[],
  constraints: ['1 ≤ nums.length ≤ 10⁵', '-10⁹ ≤ nums[i] ≤ 10⁹'],
  hint: 'You need to know if you\'ve seen a value before. What data structure lets you check membership in O(1)?',
  solutions: [
    { label: 'Set Iteration', pythonCode: SET_ITERATION_CODE, generateSteps: generateSetIterationSteps },
    { label: 'Length Check', pythonCode: LEN_COMPARISON_CODE, generateSteps: generateLenComparisonSteps },
  ],
};
