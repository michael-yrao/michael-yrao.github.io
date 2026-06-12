import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import List


class Solution:
    def maxSubArrayKadane(self, nums: List[int]) -> int:
        # constant space dynamic sliding window algorithm
        # we can be greedy and not care for negative sums
        # e.g. if current sum is negative, discard it, start back at 0 at current index

        # start maxSum at first index
        # it should not be 0 since we have negatives
        # e.g. if result is negative and we start at 0, 0 will always be bigger and we will return 0 if we initialize to 0

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

// ── Solution 2: Prefix Sum ────────────────────────────────────────────────────

const PYTHON_CODE_PREFIX = `from typing import List
import math


class Solution:
    def maxSubArrayPrefixSum(self, nums: List[int]) -> int:
        # finding subarray with largest sum
        # sliding window problem with dynamic window size
        # one approach is prefix sum
        # create prefixSum array
        # prefixSum[j] - prefixSum[i] = sum of subarray between i and j, exclusive of i
        # so we can keep track of a maximum sum
        # keep track of the smallest prefixSum[i] we can find
        # this way we maximize prefixSum[j] and minimize prefixSum[i]
        prefixSum = []
        for i in range(len(nums)):
            if i == 0:
                prefixSum.append(nums[i])
            else:
                prefixSum.append(nums[i] + prefixSum[i - 1])

        # needs to be 0 to calc subarray of size 1, e.g. [1]
        minPrefixSum = 0
        maxSum = -math.inf

        # nums = [-2,1,-3,4,-1,2,1,-5,4]
        # prefixSum = [-2, -1, -4, 0, -1, 1, 2, -3, 1]

        for curSum in prefixSum:
            maxSum = max(maxSum, curSum - minPrefixSum)
            minPrefixSum = min(minPrefixSum, curSum)
        return maxSum`;

function generatePrefixSumSteps(): Step[] {
  const nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
  const n = nums.length;
  const steps: Step[] = [];

  // Pre-compute full array so every step can display all n cells
  const prefixSum: number[] = [];
  for (let i = 0; i < n; i++) {
    prefixSum.push(i === 0 ? nums[i] : nums[i] + prefixSum[i - 1]);
  }

  // ── Intro ──────────────────────────────────────────────────────
  steps.push({
    explanation:
      'Prefix sum approach: build prefixSum[i] = nums[0]+…+nums[i]. The best subarray ending at index i = prefixSum[i] − (min prefix seen before i). Track a running minimum to find this in one pass.',
    highlightLine: 6,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'minPrefixSum', value: 0 },
        { label: 'maxSum', value: '-∞' },
      ],
    },
    variables: [
      { name: 'nums', value: `[${nums.join(', ')}]` },
      { name: 'prefixSum', value: '[]' },
    ],
  });

  // ── Phase 1: Build prefixSum ─────────────────────────────────
  for (let i = 0; i < n; i++) {
    const explanation = i === 0
      ? `i=0: prefixSum[0] = nums[0] = ${prefixSum[0]}. Base case.`
      : `i=${i}: prefixSum[${i}] = nums[${i}] + prefixSum[${i - 1}] = ${nums[i]} + ${prefixSum[i - 1]} = ${prefixSum[i]}.`;

    steps.push({
      explanation,
      highlightLine: i === 0 ? 9 : 11,
      state: {
        type: 'array',
        cells: prefixSum.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [{ label: 'nums', value: `[${nums.join(', ')}]` }],
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: `prefixSum[${i}]`, value: prefixSum[i], highlight: true },
      ],
    });
  }

  // ── Transition to scan phase ──────────────────────────────────
  let minPrefixSum = 0;
  let maxSum = -Infinity;

  steps.push({
    explanation: `prefixSum = [${prefixSum.join(', ')}]. Now scan it: for each value, candidate subarray sum = curSum − minPrefixSum (minimum prefix so far, starting at 0 to allow subarrays starting at index 0).`,
    highlightLine: 14,
    state: {
      type: 'array',
      cells: prefixSum.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'minPrefixSum', value: minPrefixSum },
        { label: 'maxSum', value: '-∞' },
      ],
    },
    variables: [
      { name: 'minPrefixSum', value: 0 },
      { name: 'maxSum', value: '-∞' },
    ],
  });

  // ── Phase 2: Scan for maxSum ─────────────────────────────────
  for (let i = 0; i < n; i++) {
    const curSum = prefixSum[i];
    const oldMin = minPrefixSum;
    const candidate = curSum - oldMin;
    const improved = candidate > maxSum;
    if (improved) maxSum = candidate;
    minPrefixSum = Math.min(minPrefixSum, curSum);
    const minChanged = minPrefixSum < oldMin;

    steps.push({
      explanation: `curSum=${curSum}: candidate = ${curSum} − ${oldMin} = ${candidate}. ${improved ? `New maxSum = ${maxSum}!` : `maxSum stays ${maxSum}.`}${minChanged ? ` minPrefixSum → ${minPrefixSum}.` : ''}`,
      highlightLine: 18,
      state: {
        type: 'array',
        cells: prefixSum.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'minPrefixSum', value: minPrefixSum },
          { label: 'maxSum', value: maxSum },
        ],
      },
      variables: [
        { name: 'curSum', value: curSum, highlight: true },
        { name: 'candidate', value: candidate, highlight: true },
        { name: 'maxSum', value: maxSum, highlight: improved },
        { name: 'minPrefixSum', value: minPrefixSum, highlight: minChanged },
      ],
    });
  }

  // ── Final ──────────────────────────────────────────────────────
  steps.push({
    explanation: `maxSum = ${maxSum}. Prefix sum uses O(n) space for the prefix array vs Kadane's O(1), but both are O(n) time. The prefix-sum pattern generalises to arbitrary subarray range queries.`,
    highlightLine: 21,
    state: {
      type: 'array',
      cells: prefixSum.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'minPrefixSum', value: minPrefixSum },
        { label: 'maxSum', value: maxSum },
      ],
    },
    variables: [
      { name: 'maxSum', value: maxSum, highlight: true },
    ],
  });

  return steps;
}

const prefixSumSolution: SolutionVariant = {
  label: 'Prefix Sum',
  pythonCode: PYTHON_CODE_PREFIX,
  generateSteps: generatePrefixSumSteps,
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
  solutions: [kadaneSolution, prefixSumSolution],
};
