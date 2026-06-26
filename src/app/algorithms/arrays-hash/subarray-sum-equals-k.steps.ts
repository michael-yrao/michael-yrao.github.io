import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced from cse-review: dsa/leetcode/arrays_and_hash/560_subarray_sum_equals_k.py
const PYTHON_CODE = `class Solution:
    def subarraySum(self, nums: List[int], k: int) -> int:
        # first thing that comes to mind for subarray sum is prefixSum
        # we are looking for # of times prefix[j] - prefix[i] = k
        # but if we go through the prefixSum looking for i and j, we will end up with O(n^2)
        # so what can we do reduce the time complexity
        # we can take an approach like two sum
        # prefix[i] = prefix[j] - k
        # prefix[i] is sum we already calculated before
        # prefix[j] is current sum
        # so if prefix[i] is in the map, we increment our solution counter

        # map to store number of times prefix[i] appeared
        # we do need to consider if prefix[j] = k, then prefix[i] = 0
        # so we need to store it in the map first. e.g. nums = [3], k = 3
        prefixSumMap = {}
        prefixSumMap[0] = 1
        result = 0
        runningSum = 0

        for j in range(len(nums)):
            runningSum += nums[j]
            prefix_i = runningSum - k
            if prefix_i in prefixSumMap:
                result+=prefixSumMap[prefix_i]
            # since we just saw runningSum, we store it in the map
            prefixSumMap[runningSum] = prefixSumMap.get(runningSum,0) + 1

        return result`;

function generateSteps(): Step[] {
  const nums = [1, 2, 3];
  const k = 3;
  const steps: Step[] = [];
  const map: Record<number, number> = { 0: 1 };
  let result = 0;
  let runningSum = 0;

  const snap = (active: number | null) => ({
    type: 'array' as const,
    cells: nums.map((v, i) => ({
      value: v,
      state: i === active ? ('active' as const) : i < (active ?? 0) ? ('visited' as const) : ('default' as const),
    })),
    pointers: active !== null ? [{ index: active, label: 'j' }] : [],
    hashmap: { ...map },
    hashmapLabel: 'prefixSumMap (sum→count)',
    counters: [
      { label: 'runningSum', value: runningSum },
      { label: 'result', value: result },
      { label: 'k', value: k },
    ],
  });

  steps.push({
    explanation: `Count subarrays summing to k=${k}. Trick (like Two Sum on prefix sums): a subarray (i, j] sums to k iff runningSum[j] − runningSum[i] = k, i.e. runningSum − k was a prefix we've seen. Store counts of each prefix sum in a map; seed it with {0: 1} so a prefix that itself equals k is counted.`,
    highlightLine: 16,
    state: snap(null),
    variables: [
      { name: 'prefixSumMap', value: '{0: 1}' },
      { name: 'result', value: 0 },
      { name: 'runningSum', value: 0 },
    ],
  });

  for (let j = 0; j < nums.length; j++) {
    runningSum += nums[j];
    const need = runningSum - k;
    const found = map[need] || 0;
    if (found) result += found;
    steps.push({
      explanation: `j=${j}: runningSum += ${nums[j]} → ${runningSum}. We need a prior prefix of runningSum − k = ${runningSum} − ${k} = ${need}. ${found ? `prefixSumMap has ${need} (×${found}) → result += ${found} → ${result}.` : `${need} not in the map → no new subarray here.`}`,
      highlightLine: found ? 25 : 24,
      state: snap(j),
      variables: [
        { name: 'j', value: j },
        { name: 'runningSum', value: runningSum, highlight: true },
        { name: 'prefix_i (need)', value: need, highlight: true },
        { name: 'found count', value: found, highlight: found > 0 },
        { name: 'result', value: result, highlight: found > 0 },
      ],
    });

    map[runningSum] = (map[runningSum] || 0) + 1;
    steps.push({
      explanation: `Record this prefix: prefixSumMap[${runningSum}] → ${map[runningSum]}. A future index can now use it as its "prefix_i".`,
      highlightLine: 27,
      state: snap(j),
      variables: [
        { name: `prefixSumMap[${runningSum}]`, value: map[runningSum], highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `All indices processed. ${result} subarray(s) sum to ${k} ([1,2] and [3]). Return ${result}. One pass, O(n) time and O(n) space — the map turns the O(n²) prefix-pair search into O(1) lookups.`,
    highlightLine: 29,
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      hashmap: { ...map },
      hashmapLabel: 'prefixSumMap (sum→count)',
      counters: [{ label: 'result', value: result }],
    },
    variables: [{ name: 'return', value: result, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Prefix Sum + Hash Map',
  pythonCode: PYTHON_CODE,
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
