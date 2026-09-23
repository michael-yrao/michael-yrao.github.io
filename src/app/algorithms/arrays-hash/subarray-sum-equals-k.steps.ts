import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's subarraySum_20260628 verbatim: a value-based `for n in
// nums:` (no index variable), `diffMap` (defaultdict) seeded with {0: 1}, and
// `diff = runningSum - k` as the two-sum-style lookup key.

function generateSteps(): Step[] {
  const nums = [1, 2, 3];
  const k = 3;
  const steps: Step[] = [];
  const diffMap: Record<number, number> = { 0: 1 };
  let result = 0;
  let runningSum = 0;

  const snap = (active: number | null) => ({
    type: 'array' as const,
    cells: nums.map((v, i) => ({
      value: v,
      state: i === active ? ('active' as const) : i < (active ?? 0) ? ('visited' as const) : ('default' as const),
    })),
    pointers: active !== null ? [{ index: active, label: 'n' }] : [],
    hashmap: { ...diffMap },
    hashmapLabel: 'diffMap (sum→count)',
    counters: [
      { label: 'runningSum', value: runningSum },
      { label: 'result', value: result },
      { label: 'k', value: k },
    ],
  });

  steps.push({
    explanation: `Count subarrays summing to k=${k}. Trick (like Two Sum on prefix sums): a subarray (i, j] sums to k iff runningSum[j] − runningSum[i] = k, i.e. runningSum − k was a prefix we've seen. Store counts of each prefix sum in diffMap; seed it with {0: 1} so a prefix that itself equals k is counted.`,
    anchor: { match: 'diffMap[0] = 1' },
    state: snap(null),
    variables: [
      { name: 'diffMap', value: '{0: 1}' },
      { name: 'result', value: 0 },
      { name: 'runningSum', value: 0 },
    ],
  });

  nums.forEach((n, idx) => {
    runningSum += n;
    const diff = runningSum - k;
    const found = diffMap[diff] || 0;
    if (found) result += found;
    steps.push({
      explanation: `n=${n}: runningSum += ${n} → ${runningSum}. diff = runningSum − k = ${runningSum} − ${k} = ${diff}. ${found ? `diffMap has ${diff} (×${found}) → result += ${found} → ${result}.` : `${diff} not in diffMap → no new subarray here.`}`,
      anchor: {
        match: 'runningSum+=n',
        to: found ? { match: 'result+=diffMap[diff]' } : { match: 'if diff in diffMap:' },
      },
      state: snap(idx),
      variables: [
        { name: 'n', value: n },
        { name: 'runningSum', value: runningSum, highlight: true },
        { name: 'diff', value: diff, highlight: true },
        { name: 'found count', value: found, highlight: found > 0 },
        { name: 'result', value: result, highlight: found > 0 },
      ],
    });

    diffMap[runningSum] = (diffMap[runningSum] || 0) + 1;
    steps.push({
      explanation: `Record this prefix: diffMap[${runningSum}] → ${diffMap[runningSum]}. A future element can now use it as its "diff".`,
      anchor: { match: 'diffMap[runningSum]+=1' },
      state: snap(idx),
      variables: [
        { name: `diffMap[${runningSum}]`, value: diffMap[runningSum], highlight: true },
      ],
    });
  });

  steps.push({
    explanation: `All elements processed. ${result} subarray(s) sum to ${k} ([1,2] and [3]). Return ${result}. One pass, O(n) time and O(n) space — the map turns the O(n²) prefix-pair search into O(1) lookups.`,
    anchor: { match: 'return result' },
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      hashmap: { ...diffMap },
      hashmapLabel: 'diffMap (sum→count)',
      counters: [{ label: 'result', value: result }],
    },
    variables: [{ name: 'return', value: result, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Prefix Sum + Hash Map',
  variant: 'prefix-map',
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
};

export const subarraySumEqualsKMeta: AlgorithmMeta = {
  id: 'subarray-sum-equals-k',
  lcNumber: 560,
  title: 'Subarray Sum Equals K',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Hash Map', 'Prefix Sum'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an integer array nums and an integer k, return the total number of contiguous subarrays whose sum equals k.',
  examples: [
    { input: 'nums = [1,1,1], k = 2', output: '2' },
    { input: 'nums = [1,2,3], k = 3', output: '2', explanation: 'Subarrays [1,2] and [3].' },
  ] as ProblemExample[],
  constraints: ['1 ≤ nums.length ≤ 2 × 10⁴', '-1000 ≤ nums[i] ≤ 1000', '-10⁷ ≤ k ≤ 10⁷'],
  hint: 'A subarray sum is a difference of two prefix sums. As you sweep, ask "have I seen a prefix equal to runningSum − k?" — count occurrences of each prefix sum in a hash map (seeded with {0:1}) so each lookup is O(1).',
  solutions: [solution],
};
