import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's maxSubarrayKadaneV2 verbatim: maxSum = currentSum = nums[0] is the
// only base case (the loop runs over nums[1:], starting at index 1, never revisiting index
// 0), and there is no `if curMax < 0: reset` branch — every step is one line,
// `currentSum = max(n, currentSum + n)`, which picks between starting fresh at n or
// extending the run. The best-subarray window shading below is a derived visual only: the
// attempt's own code never tracks start/end indices, just the running sums.

function generateKadaneSteps(): Step[] {
  const nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
  const steps: Step[] = [];

  let maxSum = nums[0];
  let currentSum = nums[0];
  let windowStart = 0; // derived only, for the "found" window shading — not in the attempt's code
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
    explanation: "Kadane's algorithm (V2): maxSum = currentSum = nums[0]. The loop below runs over nums[1:] — index 0 is only ever the base case.",
    anchor: { match: 'maxSum = currentSum = nums[0]' },
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({ value: v, state: i === 0 ? ('active' as const) : ('default' as const) })),
      pointers: [{ index: 0, label: 'n' }],
      counters: [
        { label: 'maxSum', value: maxSum },
        { label: 'currentSum', value: currentSum },
      ],
    },
    variables: [
      { name: 'maxSum', value: maxSum },
      { name: 'currentSum', value: currentSum },
    ],
  });

  for (let i = 1; i < nums.length; i++) {
    const n = nums[i];
    const prevSum = currentSum;
    const extended = prevSum + n;
    const startsFresh = n >= extended; // max(n, extended) picks n whenever it's the larger (or tied) option
    currentSum = startsFresh ? n : extended;
    if (startsFresh) windowStart = i;
    const improved = currentSum > maxSum;
    if (improved) {
      maxSum = currentSum;
      bestStart = windowStart;
      bestEnd = i;
    }

    steps.push({
      explanation: `currentSum = max(n, currentSum + n) = max(${n}, ${prevSum} + ${n}) = ${currentSum} → ${startsFresh ? `starts fresh at n=${n} (extending would only give ${extended})` : `extends the run: ${prevSum} + ${n}`}. maxSum = max(maxSum, currentSum) = ${maxSum}${improved ? ' — new best!' : ''}.`,
      anchor: { match: 'currentSum = max(n, currentSum + n)', to: { match: 'maxSum = max(maxSum, currentSum)' } },
      state: {
        type: 'array',
        cells: snap(i, windowStart, bestStart, bestEnd),
        pointers: [{ index: i, label: 'n' }],
        counters: [
          { label: 'maxSum', value: maxSum },
          { label: 'currentSum', value: currentSum },
        ],
      },
      variables: [
        { name: 'n', value: n, highlight: true },
        { name: 'currentSum', value: currentSum, highlight: true },
        { name: 'maxSum', value: maxSum, highlight: improved },
      ],
    });
  }

  steps.push({
    explanation: `Loop over nums[1:] is done. Return maxSum = ${maxSum}. (Shown for reference: the subarray [${nums.slice(bestStart, bestEnd + 1).join(', ')}], indices ${bestStart}–${bestEnd}, achieves it — the code itself only ever tracked the sum, not the indices.)`,
    anchor: { match: 'return maxSum' },
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i >= bestStart && i <= bestEnd ? ('found' as const) : ('default' as const),
      })),
      pointers: [],
      counters: [
        { label: 'maxSum', value: maxSum },
        { label: 'currentSum', value: currentSum },
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
  variant: 'kadane',
  generateSteps: generateKadaneSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
};

// ── Solution 2: Prefix Sum ────────────────────────────────────────────────────
//
// Traces cse-progress's maxSubArray_20260820 verbatim: prefixSum is preallocated as
// `[0] * (len(nums)+1)` — a size-(n+1) array with a leading sentinel prefixSum[0] = 0 —
// and BOTH loops run `for i in range(1, len(prefixSum))`, i.e. i = 1..n, indexing
// prefixSum[i] and nums[i-1] directly. There's no `if i == 0` base case; the sentinel
// already covers it. The scan variable is `minPrefix` (not `minPrefixSum`), and there's
// no `curSum` — it reads `prefixSum[i]` directly.

function generatePrefixSumSteps(): Step[] {
  const nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4];
  const n = nums.length;
  const steps: Step[] = [];

  // prefixSum[0] = 0 (sentinel); prefixSum[i] = nums[i-1] + prefixSum[i-1] for i = 1..n.
  const prefixSum: number[] = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    prefixSum[i] = nums[i - 1] + prefixSum[i - 1];
  }

  // ── Intro ──────────────────────────────────────────────────────
  steps.push({
    explanation:
      'prefixSum = [0] * (len(nums)+1) — a size-(n+1) array with a leading sentinel prefixSum[0] = 0, so a subarray starting at nums[0] can be expressed as prefixSum[i] − prefixSum[0] like any other.',
    anchor: { match: 'prefixSum = [0] * (len(nums)+1)' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'minPrefix', value: 0 },
        { label: 'maxSum', value: '-∞' },
      ],
    },
    variables: [
      { name: 'nums', value: `[${nums.join(', ')}]` },
      { name: 'prefixSum', value: `[${prefixSum.join(', ')}]` },
    ],
  });

  // ── Phase 1: Build prefixSum, i = 1..n ────────────────────────
  for (let i = 1; i <= n; i++) {
    steps.push({
      explanation: `i=${i}: prefixSum[${i}] = nums[${i - 1}] + prefixSum[${i - 1}] = ${nums[i - 1]} + ${prefixSum[i - 1]} = ${prefixSum[i]}.`,
      anchor: { match: 'prefixSum[i] = nums[i-1] + prefixSum[i-1]' },
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

  // ── Transition to scan phase, i = 1..n again ──────────────────
  let minPrefix = 0;
  let maxSum = -Infinity;

  steps.push({
    explanation: `prefixSum = [${prefixSum.join(', ')}]. Now scan i=1..${n}: candidate = prefixSum[i] − minPrefix (the smallest prefix seen so far).`,
    anchor: { match: 'minPrefix = 0', to: { match: 'maxSum = -math.inf' } },
    state: {
      type: 'array',
      cells: prefixSum.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'minPrefix', value: minPrefix },
        { label: 'maxSum', value: '-∞' },
      ],
    },
    variables: [
      { name: 'minPrefix', value: 0 },
      { name: 'maxSum', value: '-∞' },
    ],
  });

  // ── Phase 2: Scan for maxSum, i = 1..n ────────────────────────
  for (let i = 1; i <= n; i++) {
    const curVal = prefixSum[i];
    const oldMin = minPrefix;
    const candidate = curVal - oldMin;
    const improved = candidate > maxSum;
    if (improved) maxSum = candidate;
    minPrefix = Math.min(minPrefix, curVal);
    const minChanged = minPrefix < oldMin;

    steps.push({
      explanation: `candidate = prefixSum[${i}] − minPrefix = ${curVal} − ${oldMin} = ${candidate}. maxSum = max(maxSum, candidate) = ${maxSum}.${improved ? ' New best!' : ''} minPrefix = min(minPrefix, prefixSum[${i}])${minChanged ? ` → ${minPrefix}.` : ` stays ${minPrefix}.`}`,
      anchor: { match: 'maxSum = max(maxSum, prefixSum[i] - minPrefix)', to: { match: 'minPrefix = min(minPrefix, prefixSum[i])' } },
      state: {
        type: 'array',
        cells: prefixSum.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'minPrefix', value: minPrefix },
          { label: 'maxSum', value: maxSum },
        ],
      },
      variables: [
        { name: `prefixSum[${i}]`, value: curVal, highlight: true },
        { name: 'candidate', value: candidate, highlight: true },
        { name: 'maxSum', value: maxSum, highlight: improved },
        { name: 'minPrefix', value: minPrefix, highlight: minChanged },
      ],
    });
  }

  // ── Final ──────────────────────────────────────────────────────
  steps.push({
    explanation: `Return maxSum = ${maxSum}. Both loops here run i=1..n over the size-(n+1) prefixSum array (the leading sentinel covers the index-0 base case) — O(n) time, O(n) space.`,
    anchor: { match: 'return maxSum # type: ignore' },
    state: {
      type: 'array',
      cells: prefixSum.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'minPrefix', value: minPrefix },
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
  variant: 'prefix-min',
  generateSteps: generatePrefixSumSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
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
