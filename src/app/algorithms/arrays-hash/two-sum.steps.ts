import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import List


class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # for each number, the complement we need is target - number
        # if that complement is already in the map, we found our pair
        # otherwise store this number's index so a future number can find it

        map = {}

        for index, number in enumerate(nums):
            diff = target - number
            if diff in map:
                return [map[diff], index]
            # complement not found yet — store index for future lookups
            map[number] = index

        return`;

function generateSteps(): Step[] {
  const nums = [2, 7, 11, 15];
  const target = 9;
  const steps: Step[] = [];

  const baseState = () =>
    nums.map((v) => ({ value: v, state: 'default' as const }));

  steps.push({
    explanation:
      'We need to find two indices where nums[i] + nums[j] = 9. A brute-force nested loop would be O(n²). Instead, we use a hash map so each lookup is O(1) — one pass, O(n) total.',
    highlightLine: 13,
    state: {
      type: 'array',
      cells: baseState(),
      pointers: [],
      hashmap: {},
    },
    variables: [
      { name: 'target', value: target },
      { name: 'map', value: '{}' },
    ],
  });

  const seen: Record<number, number> = {};

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    const diff = target - num;

    const activeCells = baseState().map((c, idx) => ({
      ...c,
      state: idx === i ? ('active' as const) : idx < i ? ('visited' as const) : ('default' as const),
    }));

    steps.push({
      explanation: `Index ${i}, value ${num}. Complement = ${target} − ${num} = ${diff}. Is ${diff} already in our map? ${diff in seen ? `YES — at index ${seen[diff]}!` : 'No — not yet.'}`,
      highlightLine: 16,
      state: {
        type: 'array',
        cells: activeCells,
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...seen },
      },
      variables: [
        { name: 'index', value: i, highlight: true },
        { name: 'number', value: num },
        { name: 'diff', value: diff, highlight: true },
        { name: 'diff in map', value: diff in seen ? `yes → idx ${seen[diff]}` : 'no' },
      ],
    });

    if (diff in seen) {
      const foundCells = baseState().map((c, idx) => ({
        ...c,
        state: idx === seen[diff] || idx === i ? ('found' as const) : ('visited' as const),
      }));

      steps.push({
        explanation: `Found it! map[${diff}] = ${seen[diff]}. We return [${seen[diff]}, ${i}]. The hash map made this O(1) lookup — no second scan needed.`,
        highlightLine: 15,
        state: {
          type: 'array',
          cells: foundCells,
          pointers: [
            { index: seen[diff], label: 'j' },
            { index: i, label: 'i' },
          ],
          hashmap: { ...seen },
        },
        variables: [
          { name: 'index', value: i },
          { name: 'number', value: num },
          { name: 'diff', value: diff },
          { name: 'result', value: `[${seen[diff]}, ${i}]`, highlight: true },
        ],
      });
      break;
    }

    seen[num] = i;

    steps.push({
      explanation: `${diff} wasn't in the map. We store {${num}: ${i}} — "value ${num} is at index ${i}." Next time we need ${num} as someone's complement, we know exactly where it is.`,
      highlightLine: 17,
      state: {
        type: 'array',
        cells: activeCells,
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...seen },
      },
      variables: [
        { name: 'index', value: i },
        { name: 'number', value: num, highlight: true },
        { name: 'diff', value: diff },
        { name: 'map[number]', value: i, highlight: true },
      ],
    });
  }

  return steps;
}

const hashMapSolution: SolutionVariant = {
  label: 'Hash Map',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const twoSumMeta: AlgorithmMeta = {
  id: 'two-sum',
  lcNumber: 1,
  title: 'Two Sum',
  difficulty: 'Easy',
  category: 'arrays-hash',
  tags: ['Hash Map', 'Array'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. Each input has exactly one solution, and you may not use the same element twice. You can return the answer in any order.',
  examples: [
    {
      input: 'nums = [2, 7, 11, 15],  target = 9',
      output: '[0, 1]',
      explanation: 'nums[0] + nums[1] = 2 + 7 = 9',
    },
    {
      input: 'nums = [3, 2, 4],  target = 6',
      output: '[1, 2]',
    },
  ] as ProblemExample[],
  constraints: [
    '2 ≤ nums.length ≤ 10⁴',
    '-10⁹ ≤ nums[i] ≤ 10⁹',
    '-10⁹ ≤ target ≤ 10⁹',
    'Only one valid answer exists.',
  ],
  hint: 'For each number, ask: "what value would I need to add to this to reach the target?" Can you store that information so you don\'t have to scan the array a second time?',
  solutions: [hashMapSolution],
};
