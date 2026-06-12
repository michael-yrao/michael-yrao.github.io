import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import List


class Solution:
    def moveZeroes(self, nums: List[int]) -> None:
        # two pointers both start at the left to preserve relative order of non-zeros
        # left = next write slot for a non-zero value; right = current element being examined
        # (opposite-end pointers would not preserve order)
        def swap(l, r):
            temp = nums[l]
            nums[l] = nums[r]
            nums[r] = temp

        left = right = 0
        while right < len(nums):
            if nums[right] != 0:
                swap(left, right)
                left += 1
            right += 1`;

function generateSteps(): Step[] {
  const arr = [0, 1, 0, 3, 12];
  const steps: Step[] = [];

  const snap = (left: number, right: number) =>
    arr.map((v, i) => ({
      value: v,
      state:
        i < left
          ? ('found' as const)
          : i === left && i === right
          ? ('active' as const)
          : i === left
          ? ('min-ptr' as const)
          : i === right
          ? ('active' as const)
          : ('default' as const),
    }));

  const ptrs = (left: number, right: number) =>
    left === right
      ? [{ index: left, label: 'l=r' }]
      : [{ index: left, label: 'l' }, { index: right, label: 'r' }];

  steps.push({
    explanation:
      'Move all 0s to the end while preserving the order of non-zeros. Two pointers: left is the next write slot for a non-zero; right scans every element.',
    highlightLine: 6,
    state: { type: 'array', cells: snap(0, 0), pointers: ptrs(0, 0) },
    variables: [
      { name: 'left', value: 0 },
      { name: 'right', value: 0 },
    ],
  });

  let left = 0;
  for (let right = 0; right < arr.length; right++) {
    if (arr[right] !== 0) {
      steps.push({
        explanation: `nums[${right}] = ${arr[right]} is non-zero. Swap it into position left=${left}.`,
        highlightLine: 9,
        state: { type: 'array', cells: snap(left, right), pointers: ptrs(left, right) },
        variables: [
          { name: 'left', value: left },
          { name: 'right', value: right, highlight: true },
          { name: 'nums[right]', value: arr[right], highlight: true },
        ],
      });

      [arr[left], arr[right]] = [arr[right], arr[left]];
      left++;

      steps.push({
        explanation: `Swapped. ${arr[left - 1]} is now locked at index ${left - 1}. left advances to ${left}.`,
        highlightLine: 10,
        state: { type: 'array', cells: snap(left, right), pointers: ptrs(left, right) },
        variables: [
          { name: 'left', value: left, highlight: true },
          { name: 'right', value: right },
        ],
      });
    } else {
      steps.push({
        explanation: `nums[${right}] = 0. Nothing to write — left stays at ${left}, right advances.`,
        highlightLine: 8,
        state: { type: 'array', cells: snap(left, right), pointers: ptrs(left, right) },
        variables: [
          { name: 'left', value: left },
          { name: 'right', value: right, highlight: true },
          { name: 'nums[right]', value: 0 },
        ],
      });
    }
  }

  steps.push({
    explanation: `Done. [${arr.join(', ')}] — all non-zeros in original order, zeros at the end. O(n) time, O(1) space.`,
    highlightLine: 11,
    state: {
      type: 'array',
      cells: arr.map(v => ({ value: v, state: v === 0 ? ('eliminated' as const) : ('found' as const) })),
      pointers: [],
    },
    variables: [
      { name: 'left', value: left },
      { name: 'right', value: arr.length },
    ],
  });

  return steps;
}

const twoPointerSolution: SolutionVariant = {
  label: 'Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const moveZerosMeta: AlgorithmMeta = {
  id: 'move-zeros',
  lcNumber: 283,
  title: 'Move Zeroes',
  difficulty: 'Easy',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array nums, move all 0s to the end of it while maintaining the relative order of the non-zero elements. You must do this in-place without making a copy of the array.',
  examples: [
    {
      input: 'nums = [0, 1, 0, 3, 12]',
      output: '[1, 3, 12, 0, 0]',
    },
    {
      input: 'nums = [0]',
      output: '[0]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 10⁴',
    '-2³¹ ≤ nums[i] ≤ 2³¹ − 1',
  ],
  hint: 'Two pointers: left tracks the next slot where a non-zero should go. right scans forward. When right finds a non-zero, swap it to left and advance both.',
  solutions: [twoPointerSolution],
};
