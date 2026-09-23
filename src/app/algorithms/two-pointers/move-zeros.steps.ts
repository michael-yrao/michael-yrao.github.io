import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's moveZeroes_20260919 verbatim: both pointers start at 0, left is the
// next write slot for a non-zero, right scans every element. No helper function — the swap is
// inlined via a tmp variable (tmp = nums[left]; nums[left] = nums[right]; nums[right] = tmp).
// There is no else branch for a zero — the if simply doesn't fire, and right+=1 always runs.

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
    anchor: { match: 'left = right = 0' },
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
        anchor: { match: 'if nums[right] != 0:' },
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
        explanation: `Swapped via tmp (tmp = nums[left]; nums[left] = nums[right]; nums[right] = tmp). ${arr[left - 1]} is now locked at index ${left - 1}. left advances to ${left}.`,
        anchor: { match: 'tmp = nums[left]', to: { match: 'left+=1' } },
        state: { type: 'array', cells: snap(left, right), pointers: ptrs(left, right) },
        variables: [
          { name: 'left', value: left, highlight: true },
          { name: 'right', value: right },
        ],
      });
    } else {
      steps.push({
        explanation: `nums[${right}] = 0. The if doesn't fire — left stays at ${left}, right advances.`,
        anchor: { match: 'if nums[right] != 0:' },
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
    anchor: { match: 'while right < len(nums):' },
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
  variant: 'two-pointers',
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
