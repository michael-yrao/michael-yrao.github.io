import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def findMin(self, nums: List[int]) -> int:
        # similar to searching for an element in a rotated array
        # we use l < r instead of l <= r like in normal binary search
        # when we did find an element in rotated array, we found where the array was rotated then binary searched on the 2 halves
        # this problem is just the first part of that
        # index l will be start of original array and that's our answer
        l, r = 0, len(nums) - 1

        while l < r:
            mid = (l + r) // 2
            # if mid > r, then l = m + 1
            if nums[mid] > nums[r]:
                l = mid + 1
            else:
                r = mid
        return nums[l]`;

function generateSteps(): Step[] {
  const nums = [3, 4, 5, 1, 2];
  const steps: Step[] = [];

  const snap = (l: number, r: number, mid: number | null, found: number | null) =>
    nums.map((v, i) => ({
      value: v,
      state:
        found !== null && i === found
          ? ('min-ptr' as const)
          : found !== null
          ? ('eliminated' as const)
          : i === mid
          ? ('active' as const)
          : i >= l && i <= r
          ? ('window' as const)
          : ('eliminated' as const),
    }));

  steps.push({
    explanation:
      'Find the minimum in a rotated sorted array [3,4,5,1,2] in O(log n). Key insight: compare nums[mid] vs nums[r]. If nums[mid] > nums[r], the minimum must be to the right of mid (left half is ascending and larger). Otherwise the minimum is at mid or to the left.',
    highlightLine: 8,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'nums', value: '[3,4,5,1,2]' }],
  });

  let l = 0;
  let r = nums.length - 1;

  steps.push({
    explanation: `Initialize l=${l}, r=${r}. We use l < r (not l ≤ r) because we want to converge on the minimum without overshooting — when l === r, that index is the answer.`,
    highlightLine: 9,
    state: {
      type: 'array',
      cells: snap(l, r, null, null),
      pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
    },
    variables: [{ name: 'l', value: l }, { name: 'r', value: r }],
  });

  while (l < r) {
    const mid = Math.floor((l + r) / 2);
    const goRight = nums[mid] > nums[r];

    steps.push({
      explanation: `l=${l}, r=${r}, mid=${mid}: nums[mid]=${nums[mid]} ${goRight ? '>' : '≤'} nums[r]=${nums[r]}. ${goRight ? 'The left half [l..mid] is ascending and all > nums[r], so the minimum is right of mid → l = mid+1.' : 'The minimum could be at mid or to the left → r = mid (keep mid as candidate).'}`,
      highlightLine: goRight ? 13 : 15,
      state: {
        type: 'array',
        cells: snap(l, r, mid, null),
        pointers: [
          { index: l, label: 'l' },
          { index: mid, label: 'mid' },
          { index: r, label: 'r' },
        ],
      },
      variables: [
        { name: 'mid', value: mid },
        { name: 'nums[mid]', value: nums[mid] },
        { name: 'nums[r]', value: nums[r] },
        { name: goRight ? 'l →' : 'r →', value: goRight ? mid + 1 : mid, highlight: true },
      ],
    });

    if (goRight) l = mid + 1;
    else r = mid;
  }

  // l === r, found the minimum
  steps.push({
    explanation: `l === r === ${l}. Converged! nums[${l}] = ${nums[l]} is the minimum. It's the start of the original sorted array before rotation. O(log n) time, O(1) space.`,
    highlightLine: 16,
    state: {
      type: 'array',
      cells: snap(l, r, null, l),
      pointers: [{ index: l, label: 'min' }],
    },
    variables: [
      { name: 'l', value: l },
      { name: 'return', value: nums[l], highlight: true },
    ],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Binary Search on Minimum',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const findMinimumInRotatedSortedArrayMeta: AlgorithmMeta = {
  id: 'find-minimum-in-rotated-sorted-array',
  lcNumber: 153,
  title: 'Find Minimum in Rotated Sorted Array',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Array', 'Binary Search'],
  timeComplexity: 'O(log n)',
  spaceComplexity: 'O(1)',
  description:
    'Suppose an array of length n sorted in ascending order is rotated between 1 and n times. Given the sorted rotated array nums of unique elements, return the minimum element of this array. You must write an algorithm that runs in O(log n) time.',
  examples: [
    {
      input: 'nums = [3,4,5,1,2]',
      output: '1',
      explanation: 'The original array was [1,2,3,4,5] rotated 3 times.',
    },
    {
      input: 'nums = [4,5,6,7,0,1,2]',
      output: '0',
      explanation: 'The original array was [0,1,2,4,5,6,7] rotated 4 times.',
    },
    {
      input: 'nums = [11,13,15,17]',
      output: '11',
      explanation: 'The array is rotated 4 times (full rotation), minimum is at index 0.',
    },
  ] as ProblemExample[],
  constraints: [
    'n == nums.length',
    '1 ≤ n ≤ 5000',
    '-5000 ≤ nums[i] ≤ 5000',
    'All the integers of nums are unique.',
    'nums is sorted and rotated between 1 and n times.',
  ],
  hint: 'Compare nums[mid] with nums[r]: if nums[mid] > nums[r] the minimum is strictly in the right half (l = mid+1); otherwise the minimum is at mid or left (r = mid). Use l < r so you converge without overshooting.',
  solutions: [solution],
};
