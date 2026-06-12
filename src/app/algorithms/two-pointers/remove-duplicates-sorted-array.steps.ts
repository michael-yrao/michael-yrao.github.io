import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def removeDuplicates(self, nums: List[int]) -> int:
        # left = write cursor, right = read cursor; index 0 is always valid so both start at 1
        # write nums[right] to nums[left] only when it differs from nums[left-1] (the last confirmed unique value)
        left = right = counter = 1
        while right < len(nums):
            if nums[right] != nums[left - 1]:
                nums[left] = nums[right]
                left += 1
                counter += 1
            right += 1
        return counter`;

function generateSteps(): Step[] {
  const nums = [1, 1, 2, 3, 3];
  const steps: Step[] = [];

  const snap = (l: number, r: number) =>
    nums.map((v, i) => ({
      value: v,
      state:
        i < l
          ? ('found' as const)
          : i === l
          ? ('active' as const)
          : i === r && r !== l
          ? ('min-ptr' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation:
      'Two-pointer in-place dedup: left marks the next write slot, right scans forward. Index 0 is always valid, so both start at 1. Write nums[right] to nums[left] only when it differs from nums[left−1].',
    highlightLine: 2,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'nums', value: `[${nums.join(', ')}]` }],
  });

  let left = 1;
  let right = 1;

  while (right < nums.length) {
    const differs = nums[right] !== nums[left - 1];

    steps.push({
      explanation: `right=${right}: nums[right]=${nums[right]} vs nums[left−1]=${nums[left - 1]} → ${differs ? 'different — write & advance left' : 'duplicate — skip'}.`,
      highlightLine: 4,
      state: {
        type: 'array',
        cells: snap(left, right),
        pointers: [{ index: left, label: 'left' }, { index: right, label: 'right' }],
      },
      variables: [
        { name: 'left', value: left },
        { name: 'right', value: right },
        { name: 'differs', value: String(differs), highlight: true },
      ],
    });

    if (differs) {
      nums[left] = nums[right];
      left++;
      steps.push({
        explanation: `Wrote ${nums[left - 1]} at left=${left - 1}. Advance left to ${left}.`,
        highlightLine: 6,
        state: {
          type: 'array',
          cells: snap(left, right),
          pointers: [{ index: left, label: 'left' }, { index: right, label: 'right' }],
        },
        variables: [
          { name: 'left', value: left, highlight: true },
          { name: 'right', value: right },
        ],
      });
    }

    right++;
  }

  steps.push({
    explanation: `Done. First ${left} elements are the unique sorted values. Return ${left}. O(n) time, O(1) space.`,
    highlightLine: 9,
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i < left ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
    },
    variables: [{ name: 'return', value: left, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const removeDuplicatesSortedArrayMeta: AlgorithmMeta = {
  id: 'remove-dup-from-sorted-array',
  lcNumber: 26,
  title: 'Remove Duplicates from Sorted Array',
  difficulty: 'Easy',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. Return k, the number of unique elements.',
  examples: [
    {
      input: 'nums = [1,1,2]',
      output: '2, nums = [1,2,_]',
      explanation: 'Two unique values; first two elements become [1,2].',
    },
    {
      input: 'nums = [0,0,1,1,1,2,2,3,3,4]',
      output: '5, nums = [0,1,2,3,4,_,_,_,_,_]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 3 × 10⁴',
    '-100 ≤ nums[i] ≤ 100',
    'nums is sorted in non-decreasing order.',
  ],
  hint: 'left is the write cursor; right is the read cursor. Both start at 1 (index 0 is always valid). Write nums[right] to nums[left] only when it differs from nums[left−1], then advance left. Always advance right.',
  solutions: [solution],
};
