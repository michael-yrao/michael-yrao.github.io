import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Frequency map ────────────────────────────────────────────────
//
// Traces cse-progress's majorityElement verbatim: freqMap and (result, maxCount)
// initialized separately, then a single loop that updates freqMap, sets result
// via a ternary (`result = n if freqMap[n] > maxCount else result`), and
// UNCONDITIONALLY updates maxCount = max(maxCount, freqMap[n]) every iteration
// — not only when result changes.

function generateFreqMapSteps(): Step[] {
  const nums = [2, 2, 1, 1, 1, 2, 2];
  const steps: Step[] = [];
  const freqMap: Record<number, number> = {};
  let result = 0;
  let maxCount = 0;

  steps.push({
    explanation:
      'Build a frequency map in one pass. Keep a running result: whenever freqMap[n] exceeds the current maxCount, result becomes n. maxCount is then refreshed to the larger of itself and freqMap[n] every iteration, whether or not result just changed.',
    anchor: { match: 'freqMap = {}', to: { match: 'result, maxCount = 0, 0' } },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
      counters: [{ label: 'result', value: 0 }, { label: 'maxCount', value: 0 }],
    },
    variables: [{ name: 'nums', value: `[${nums.join(', ')}]` }],
  });

  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    freqMap[n] = (freqMap[n] ?? 0) + 1;
    const prevMaxCount = maxCount;
    const switched = freqMap[n] > prevMaxCount;
    if (switched) result = n;
    maxCount = Math.max(prevMaxCount, freqMap[n]);

    steps.push({
      explanation: switched
        ? `n=${n}: freqMap[${n}]=${freqMap[n]} > maxCount ${prevMaxCount}. result becomes ${n}. maxCount = max(maxCount, freqMap[n]) → ${maxCount}.`
        : `n=${n}: freqMap[${n}]=${freqMap[n]}. Does not exceed maxCount=${prevMaxCount}, so result stays ${result}. maxCount = max(maxCount, freqMap[n]) → ${maxCount} (unchanged).`,
      anchor: {
        match: 'freqMap[n] = 1 + freqMap.get(n,0)',
        to: { match: 'maxCount = max(maxCount, freqMap[n])' },
      },
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state: j < i ? ('visited' as const) : j === i ? ('active' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...freqMap } as Record<string | number, number>,
        counters: [{ label: 'result', value: result }, { label: 'maxCount', value: maxCount }],
      },
      variables: [
        { name: 'n', value: n, highlight: true },
        { name: `freqMap[${n}]`, value: freqMap[n], highlight: true },
        { name: 'result', value: result, highlight: switched },
        { name: 'maxCount', value: maxCount },
      ],
    });
  }

  steps.push({
    explanation: `All elements processed. result = ${result} with frequency ${maxCount} (> n/2 = ${Math.floor(nums.length / 2)}). O(n) time, O(n) space.`,
    anchor: { match: 'return result' },
    state: {
      type: 'array',
      cells: nums.map(v => ({
        value: v,
        state: v === result ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      hashmap: { ...freqMap } as Record<string | number, number>,
      counters: [{ label: 'result', value: result }],
    },
    variables: [{ name: 'return', value: result, highlight: true }],
  });

  return steps;
}

// ── Solution 2: Boyer-Moore ──────────────────────────────────────────────────
//
// Traces cse-progress's majorityElementBoyerMoore verbatim: maxElement/counter
// initialized from nums[0], then on a mismatch counter is decremented and
// swapped THE MOMENT IT HITS 0 (not below 0 — the swap check is `if counter ==
// 0:`, nested inside the same else branch as the decrement).

function generateBoyerMooreSteps(): Step[] {
  const nums = [2, 2, 1, 1, 1, 2, 2];
  const steps: Step[] = [];
  let maxElement = nums[0];
  let counter = 0;

  steps.push({
    explanation:
      'Boyer-Moore Voting: the majority element (> n/2 occurrences) can "outlast" all other values combined. Maintain maxElement and counter, seeded from nums[0]. When counter reaches 0 after a mismatch, the current candidate has been cancelled — swap to the current element and restart.',
    anchor: { match: 'maxElement, counter = nums[0], 0' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'maxElement', value: maxElement },
        { label: 'counter', value: counter },
      ],
    },
    variables: [
      { name: 'maxElement', value: maxElement },
      { name: 'counter', value: counter },
    ],
  });

  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    const prevMaxElement = maxElement;
    let explanation: string;
    let anchor: Step['anchor'];

    if (maxElement === n) {
      counter++;
      explanation = `n=${n} matches maxElement. counter → ${counter}.`;
      anchor = { match: 'if maxElement == n:', to: { match: 'counter += 1' } };
    } else {
      counter--;
      if (counter === 0) {
        maxElement = n;
        counter = 1;
        explanation = `n=${n} != maxElement ${prevMaxElement}. counter → 0: cancelled! Swap to ${maxElement}, counter=1.`;
        // nth:2 skips the comment "# also set counter = 1" (hit 1) and lands on the real statement (hit 2).
        anchor = { match: 'counter -=1', to: { match: 'counter = 1', nth: 2 } };
      } else {
        explanation = `n=${n} != maxElement ${prevMaxElement}. counter → ${counter}.`;
        anchor = { match: 'counter -=1', to: { match: 'if counter == 0:' } };
      }
    }

    const switched = maxElement !== prevMaxElement;

    steps.push({
      explanation,
      anchor,
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state: j < i ? ('visited' as const) : j === i ? ('active' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'maxElement', value: maxElement },
          { label: 'counter', value: counter },
        ],
      },
      variables: [
        { name: 'n', value: n, highlight: true },
        { name: 'maxElement', value: maxElement, highlight: switched },
        { name: 'counter', value: counter, highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `Done. maxElement = ${maxElement}. Every non-majority element has been cancelled out at least once. O(n) time, O(1) space.`,
    anchor: { match: 'return maxElement' },
    state: {
      type: 'array',
      cells: nums.map(v => ({
        value: v,
        state: v === maxElement ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      counters: [
        { label: 'maxElement', value: maxElement },
        { label: 'counter', value: counter },
      ],
    },
    variables: [{ name: 'return', value: maxElement, highlight: true }],
  });

  return steps;
}

const freqMapSolution: SolutionVariant = {
  label: 'Frequency Map',
  variant: 'freq-map',
  generateSteps: generateFreqMapSteps,
};

const boyerMooreSolution: SolutionVariant = {
  label: 'Boyer-Moore',
  variant: 'boyer-moore',
  generateSteps: generateBoyerMooreSteps,
};

export const majorityElementMeta: AlgorithmMeta = {
  id: 'majority-element',
  lcNumber: 169,
  title: 'Majority Element',
  difficulty: 'Easy',
  category: 'arrays-hash',
  tags: ['Array', 'Hash Map', 'Boyer-Moore'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an array nums of size n, return the majority element. The majority element is the element that appears more than ⌊n/2⌋ times. You may assume the majority element always exists in the array.',
  examples: [
    { input: 'nums = [3, 2, 3]', output: '3' },
    { input: 'nums = [2, 2, 1, 1, 1, 2, 2]', output: '2' },
  ] as ProblemExample[],
  constraints: [
    'n == nums.length',
    '1 ≤ n ≤ 5 × 10⁴',
    '-10⁹ ≤ nums[i] ≤ 10⁹',
    'The majority element always exists.',
  ],
  hint: 'A hashmap tracks frequencies. For O(1) space, Boyer-Moore Voting works because the majority element (> n/2 occurrences) can never be fully "cancelled" by all other elements combined.',
  solutions: [freqMapSolution, boyerMooreSolution],
};
