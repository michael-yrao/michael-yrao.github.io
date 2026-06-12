import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def findPeakElement(self, nums: List[int]) -> int:
        # key is that a peak must exist
        # and a peak is only applicable to its immediate neighbors
        # so knowing peaks exist, we can be greedy and assume that if nums[mid] < nums[mid + 1], then there is a peak on the right
        # this is a boundary type search where we find the first position where the condition holds

        l, r = 0, len(nums) - 1
        # min boundary binary search (find first true position)
        # is_valid(mid) = nums[mid] >= nums[mid + 1] (peak at or left of mid)
        while l < r:
            mid = l + (r - l) // 2
            if nums[mid] < nums[mid + 1]:
                l = mid + 1  # peak on right
            else:
                r = mid  # peak on left or at mid

        return l`;

function generateSteps(): Step[] {
  const nums = [1, 2, 3, 1];
  const steps: Step[] = [];

  const snap = (l: number, r: number, mid: number | null, foundIdx: number | null) =>
    nums.map((v, i) => ({
      value: v,
      state:
        foundIdx !== null
          ? i === foundIdx
            ? ('found' as const)
            : ('eliminated' as const)
          : i === mid
          ? ('active' as const)
          : i >= l && i <= r
          ? ('window' as const)
          : ('eliminated' as const),
    }));

  steps.push({
    explanation:
      'Find a peak element in [1,2,3,1] in O(log n). Key insight: if nums[mid] < nums[mid+1], the slope is rising right — a peak must exist to the right of mid. Otherwise, nums[mid] ≥ nums[mid+1] means mid itself could be the peak, so we keep it.',
    highlightLine: 6,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'nums', value: '[1,2,3,1]' }],
  });

  let l = 0;
  let r = nums.length - 1;

  steps.push({
    explanation: `Initialize l=${l}, r=${r}. We use l < r to converge on the peak without overshooting.`,
    highlightLine: 8,
    state: {
      type: 'array',
      cells: snap(l, r, null, null),
      pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
    },
    variables: [{ name: 'l', value: l }, { name: 'r', value: r }],
  });

  while (l < r) {
    const mid = l + Math.floor((r - l) / 2);
    const risingRight = nums[mid] < nums[mid + 1];

    steps.push({
      explanation: `l=${l}, r=${r}, mid=${mid}: nums[${mid}]=${nums[mid]} ${risingRight ? '<' : '≥'} nums[${mid + 1}]=${nums[mid + 1]}. ${risingRight ? 'Slope rising right → peak is strictly right of mid → l = mid+1.' : 'nums[mid] ≥ nums[mid+1] → peak at mid or left → r = mid (keep mid as candidate).'}`,
      highlightLine: risingRight ? 12 : 14,
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
        { name: 'nums[mid+1]', value: nums[mid + 1] },
        { name: risingRight ? 'l →' : 'r →', value: risingRight ? mid + 1 : mid, highlight: true },
      ],
    });

    if (risingRight) l = mid + 1;
    else r = mid;
  }

  steps.push({
    explanation: `l === r === ${l}. Converged! nums[${l}] = ${nums[l]} is a peak element (greater than both neighbors). Return index ${l}.`,
    highlightLine: 16,
    state: {
      type: 'array',
      cells: snap(l, r, null, l),
      pointers: [{ index: l, label: 'peak' }],
    },
    variables: [
      { name: 'l', value: l },
      { name: 'return', value: l, highlight: true },
    ],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Binary Search (Min Boundary)',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const findPeakElementMeta: AlgorithmMeta = {
  id: 'find-peak-element',
  lcNumber: 162,
  title: 'Find Peak Element',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Array', 'Binary Search'],
  timeComplexity: 'O(log n)',
  spaceComplexity: 'O(1)',
  description:
    'A peak element is an element that is strictly greater than its neighbors. Given a 0-indexed integer array nums, find a peak element and return its index. If the array contains multiple peaks, return the index to any of the peaks. You may imagine that nums[-1] = nums[n] = -∞. You must write an algorithm that runs in O(log n) time.',
  examples: [
    {
      input: 'nums = [1,2,3,1]',
      output: '2',
      explanation: '3 is a peak element and the function should return index 2.',
    },
    {
      input: 'nums = [1,2,1,3,5,6,4]',
      output: '5',
      explanation: 'Either index 1 (value 2) or index 5 (value 6) is a valid answer.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 1000',
    '-2³¹ ≤ nums[i] ≤ 2³¹ − 1',
    'nums[i] != nums[i + 1] for all valid i.',
  ],
  hint: 'A peak always exists because the array is treated as -∞ at both ends. If nums[mid] < nums[mid+1], the ascending slope guarantees a peak lies strictly to the right (l = mid+1). Otherwise nums[mid] ≥ nums[mid+1] so mid is a valid peak candidate (r = mid). Use l < r to converge — when l === r you have found the peak.',
  solutions: [solution],
};
