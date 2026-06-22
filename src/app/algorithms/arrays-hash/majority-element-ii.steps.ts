import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from collections import defaultdict

class Solution:
    def majorityElement(self, nums: List[int]) -> List[int]:
        # at most 2 elements can appear more than n/3 times, so we only need to track 2 candidates
        # whenever a 3rd distinct value appears, decrement every candidate's count — this cancels
        # one occurrence of each against the new value (extended Boyer-Moore)
        # after the scan, do a verification pass since counts were decremented and may not reflect true frequency

        freqCount = defaultdict(int)

        for n in nums:
            freqCount[n] += 1
            # if we still have at most 2 candidates, no cancellation needed
            if len(freqCount) <= 2:
                continue
            else:
                # if we have more than 2, decrement all
                for key, value in freqCount.items():
                    freqCount[key] -= 1
                    # can't delete while iterating — collect keys to delete in a separate pass
                for n in list(freqCount):
                    if freqCount[n] == 0:
                        freqCount.pop(n)

        result = []

        # decrementing may have reduced stored counts below their true frequency,
        # so we must re-count from the original array to confirm each candidate is genuine
        for n in freqCount:
            # nums.count(n) is O(n), but freqCount has at most 2 candidates, so total is O(2n) = O(n)
            if nums.count(n) > len(nums) // 3:
                result.append(n)

        return result`;

function generateSteps(): Step[] {
  const nums = [1, 1, 1, 3, 3, 2, 2, 2];
  const steps: Step[] = [];
  const freqCount: Record<number, number> = {};

  steps.push({
    explanation:
      'At most 2 elements can appear more than ⌊n/3⌋ times. Extended Boyer-Moore: maintain a map of at most 2 candidates. When a 3rd distinct value appears, decrement every candidate\'s count and evict any that hit zero. The survivors are potential majority elements — verify them in a second pass.',
    highlightLine: 4,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [{ name: 'n/3 threshold', value: Math.floor(nums.length / 3) }],
  });

  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    freqCount[n] = (freqCount[n] ?? 0) + 1;

    const mapSnapshot = () => ({ ...freqCount });

    if (Object.keys(freqCount).length <= 2) {
      steps.push({
        explanation: `i=${i}, nums[i]=${n}: freqCount[${n}] = ${freqCount[n]}. Map has ${Object.keys(freqCount).length} candidate(s) — no eviction needed.`,
        highlightLine: 6,
        state: {
          type: 'array',
          cells: nums.map((v, j) => ({
            value: v,
            state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
          })),
          pointers: [{ index: i, label: 'i' }],
          hashmap: mapSnapshot(),
        },
        variables: [
          { name: 'n', value: n },
          { name: `freqCount[${n}]`, value: freqCount[n], highlight: true },
          { name: 'map size', value: Object.keys(freqCount).length },
        ],
      });
    } else {
      // 3rd distinct: show before decrement
      steps.push({
        explanation: `i=${i}, nums[i]=${n}: 3 distinct values in map — 3rd candidate triggers decrement of ALL counts. This simulates cancelling out one occurrence of each.`,
        highlightLine: 20,
        state: {
          type: 'array',
          cells: nums.map((v, j) => ({
            value: v,
            state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
          })),
          pointers: [{ index: i, label: 'i' }],
          hashmap: mapSnapshot(),
        },
        variables: [
          { name: 'n', value: n, highlight: true },
          { name: 'map size', value: Object.keys(freqCount).length },
          { name: 'action', value: 'decrement all' },
        ],
      });

      // Decrement
      for (const key of Object.keys(freqCount)) {
        freqCount[Number(key)]--;
      }
      for (const key of Object.keys(freqCount)) {
        if (freqCount[Number(key)] === 0) delete freqCount[Number(key)];
      }

      steps.push({
        explanation: `After decrement: ${Object.keys(freqCount).length === 0 ? 'map empty' : `candidates = ${JSON.stringify(freqCount)}`}. Evicted any zero-count entries.`,
        highlightLine: 13,
        state: {
          type: 'array',
          cells: nums.map((v, j) => ({
            value: v,
            state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
          })),
          pointers: [{ index: i, label: 'i' }],
          hashmap: mapSnapshot(),
        },
        variables: [
          { name: 'map after evict', value: JSON.stringify(freqCount), highlight: true },
        ],
      });
    }
  }

  // Verify pass
  const threshold = Math.floor(nums.length / 3);
  const result = Object.keys(freqCount)
    .map(Number)
    .filter(n => nums.filter(x => x === n).length > threshold);

  steps.push({
    explanation: `Candidates after scan: ${JSON.stringify(freqCount)}. Verify each appears > n/3 = ${nums.length}/3 = ${threshold} times.`,
    highlightLine: 15,
    state: {
      type: 'array',
      cells: nums.map(v => ({
        value: v,
        state: result.includes(v) ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      hashmap: Object.fromEntries(
        Object.keys(freqCount).map(k => [k, `count=${nums.filter(x => x === Number(k)).length} > ${threshold}? ${nums.filter(x => x === Number(k)).length > threshold}`])
      ),
    },
    variables: [{ name: 'return', value: `[${result.join(', ')}]`, highlight: true }],
  });

  return steps;
}

// ── Solution: Frequency Map (intuitive O(n) space) ───────────────────────────

const PYTHON_CODE_FREQ = `class Solution:
    def majorityElement(self, nums: List[int]) -> List[int]:
        # all return keys must have size bigger than minSize
        # double / for int, single / for float
        minSize = len(nums)//3

        # map of n -> freq(n)
        freqMap = defaultdict(int)

        for n in nums:
            freqMap[n] += 1

        returnList = []

        for key, value in freqMap.items():
            if value > minSize:
                returnList.append(key)

        return returnList`;

function generateStepsFreq(): Step[] {
  const nums = [1, 1, 1, 3, 3, 2, 2, 2];
  const minSize = Math.floor(nums.length / 3);
  const steps: Step[] = [];
  const freq: Record<number, number> = {};

  steps.push({
    explanation: `Frequency-map approach (the intuitive one). minSize = len(nums)//3 = ${nums.length}//3 = ${minSize}. Count every value, then return those appearing MORE than minSize times. Uses a full map — O(n) space — vs Boyer-Moore's O(1).`,
    highlightLine: 5,
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
      hashmapLabel: 'freqMap',
      counters: [{ label: 'minSize (n/3)', value: minSize }],
    },
    variables: [{ name: 'minSize', value: minSize }],
  });

  for (let i = 0; i < nums.length; i++) {
    freq[nums[i]] = (freq[nums[i]] || 0) + 1;
    steps.push({
      explanation: `i=${i}: freqMap[${nums[i]}] → ${freq[nums[i]]}.`,
      highlightLine: 11,
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({ value: v, state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const) })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...freq },
        hashmapLabel: 'freqMap',
        counters: [{ label: 'minSize (n/3)', value: minSize }],
      },
      variables: [
        { name: 'i', value: i },
        { name: `freqMap[${nums[i]}]`, value: freq[nums[i]], highlight: true },
      ],
    });
  }

  const result: number[] = [];
  for (const k of Object.keys(freq).map(Number)) {
    const v = freq[k];
    const pass = v > minSize;
    if (pass) result.push(k);
    steps.push({
      explanation: `Check key ${k}: count = ${v}. ${pass ? `${v} > ${minSize} → include ${k} in the result.` : `${v} ≤ ${minSize} → exclude.`}`,
      highlightLine: 16,
      state: {
        type: 'array',
        cells: nums.map((x) => ({ value: x, state: x === k ? (pass ? ('found' as const) : ('eliminated' as const)) : ('visited' as const) })),
        pointers: [],
        hashmap: { ...freq },
        hashmapLabel: 'freqMap',
        counters: [{ label: 'minSize (n/3)', value: minSize }],
      },
      variables: [
        { name: 'key', value: k, highlight: true },
        { name: 'count', value: v },
        { name: `> ${minSize}?`, value: pass ? 'yes' : 'no', highlight: pass },
      ],
    });
  }

  steps.push({
    explanation: `Done. Keys with count > ${minSize}: [${result.join(', ')}]. Return them. O(n) time and O(n) space — the Boyer-Moore variant gets this down to O(1) space.`,
    highlightLine: 19,
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: result.includes(v) ? ('found' as const) : ('eliminated' as const) })),
      pointers: [],
      hashmap: { ...freq },
      hashmapLabel: 'freqMap',
      counters: [{ label: 'minSize (n/3)', value: minSize }],
    },
    variables: [{ name: 'return', value: `[${result.join(', ')}]`, highlight: true }],
  });

  return steps;
}

const freqSolution: SolutionVariant = {
  label: 'Frequency Map',
  pythonCode: PYTHON_CODE_FREQ,
  generateSteps: generateStepsFreq,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
};

const solution: SolutionVariant = {
  label: 'Extended Boyer-Moore',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
};

export const majorityElementIIMeta: AlgorithmMeta = {
  id: 'majority-element-ii',
  lcNumber: 229,
  title: 'Majority Element II',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Hash Map', 'Boyer-Moore'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array of size n, find all elements that appear more than ⌊n/3⌋ times. There can be at most two such elements.',
  examples: [
    {
      input: 'nums = [3,2,3]',
      output: '[3]',
    },
    {
      input: 'nums = [1,1,1,3,3,2,2,2]',
      output: '[1,2]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 5 × 10⁴',
    '-10⁹ ≤ nums[i] ≤ 10⁹',
  ],
  hint: 'Extension of Boyer-Moore: at most 2 elements can exceed n/3. Keep a map of at most 2 candidates. When a 3rd distinct value appears, decrement all counts and evict zeros — this "cancels" one occurrence of each candidate against the new value. After the scan, do a verification pass to confirm real counts exceed n/3.',
  solutions: [freqSolution, solution],
};
