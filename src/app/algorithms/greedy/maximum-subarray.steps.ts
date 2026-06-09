import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import List


class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        maxSum = nums[0]
        curMax = 0

        for n in nums:
            if curMax < 0:
                curMax = 0
            curMax += n
            maxSum = max(maxSum, curMax)

        return maxSum`;

function generateSteps(): Step[] {
  const nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
  const steps: Step[] = [];

  // Track which indices make up the best subarray found so far
  let maxSum = nums[0];
  let curMax = 0;
  let windowStart = 0;   // start of current window
  let bestStart = 0;
  let bestEnd = 0;

  const snap = (activeIdx: number, windowStart: number, bStart: number, bEnd: number) =>
    nums.map((v, i) => ({
      value: v,
      state:
        i === activeIdx
          ? ('active' as const)
          : i >= windowStart && i < activeIdx
          ? ('window' as const)
          : i >= bStart && i <= bEnd && i < windowStart
          ? ('found' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation:
      "Kadane's algorithm: greedily extend the current subarray. If curMax ever goes negative, discard it — a negative prefix only drags down future sums. maxSum tracks the best seen so far.",
    highlightLine: 6,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'maxSum', value: maxSum },
        { label: 'curMax', value: curMax },
      ],
    },
    variables: [
      { name: 'maxSum', value: maxSum },
      { name: 'curMax', value: curMax },
    ],
  });

  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    const reset = curMax < 0;

    if (reset) {
      windowStart = i;
      curMax = 0;
    }

    curMax += n;
    const improved = curMax > maxSum;
    if (improved) {
      maxSum = curMax;
      bestStart = windowStart;
      bestEnd = i;
    } else {
      maxSum = Math.max(maxSum, curMax);
    }

    steps.push({
      explanation: reset
        ? `curMax was negative → reset to 0. Now add n=${n}: curMax = ${curMax}. ${improved ? `New best: maxSum = ${maxSum} (subarray ends at index ${i}).` : `maxSum stays ${maxSum}.`}`
        : `Add n=${n} to curMax: ${curMax - n < 0 ? '0' : curMax - n} + ${n} = ${curMax}. ${improved ? `New best! maxSum = ${maxSum}.` : `maxSum stays ${maxSum}.`}`,
      highlightLine: reset ? 11 : 12,
      state: {
        type: 'array',
        cells: snap(i, windowStart, bestStart, bestEnd),
        pointers: [{ index: i, label: 'n' }],
        counters: [
          { label: 'maxSum', value: maxSum },
          { label: 'curMax', value: curMax },
        ],
      },
      variables: [
        { name: 'n', value: n, highlight: true },
        { name: 'curMax', value: curMax, highlight: true },
        { name: 'maxSum', value: maxSum, highlight: improved },
      ],
    });
  }

  steps.push({
    explanation: `Maximum subarray sum is ${maxSum}, from index ${bestStart} to ${bestEnd}: [${nums.slice(bestStart, bestEnd + 1).join(', ')}].`,
    highlightLine: 15,
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i >= bestStart && i <= bestEnd ? ('found' as const) : ('default' as const),
      })),
      pointers: [],
      counters: [
        { label: 'maxSum', value: maxSum },
        { label: 'curMax', value: curMax },
      ],
    },
    variables: [
      { name: 'maxSum', value: maxSum, highlight: true },
    ],
  });

  return steps;
}

const kadaneSolution: SolutionVariant = {
  label: "Kadane's",
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const maximumSubarrayMeta: AlgorithmMeta = {
  id: 'maximum-subarray',
  lcNumber: 53,
  title: 'Maximum Subarray',
  difficulty: 'Medium',
  category: 'greedy',
  tags: ['Array', "Kadane's Algorithm", 'Dynamic Programming'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
  examples: [
    {
      input: 'nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]',
      output: '6',
      explanation: 'The subarray [4, -1, 2, 1] has the largest sum = 6.',
    },
    {
      input: 'nums = [1]',
      output: '1',
    },
    {
      input: 'nums = [5, 4, -1, 7, 8]',
      output: '23',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 10⁵',
    '-10⁴ ≤ nums[i] ≤ 10⁴',
  ],
  hint: 'If the current running sum ever goes negative, discard it and start fresh at the next element — a negative prefix can only hurt any subarray that extends it.',
  solutions: [kadaneSolution],
};
