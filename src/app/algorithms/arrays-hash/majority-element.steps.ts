import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const FREQ_MAP_CODE = `class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        majority = (None, 0)
        freq = {}
        for num in nums:
            freq[num] = 1 + freq.get(num, 0)
            if freq[num] > majority[1]:
                majority = (num, freq[num])
        return majority[0]`;

const BOYER_MOORE_CODE = `class Solution:
    def majorityElement(self, nums: List[int]) -> int:
        candidate = nums[0]
        count = 0
        for num in nums:
            if num == candidate:
                count += 1
            else:
                count -= 1
                if count < 0:
                    candidate = num
                    count = 1
        return candidate`;

function generateFreqMapSteps(): Step[] {
  const nums = [2, 2, 1, 1, 1, 2, 2];
  const steps: Step[] = [];
  const freq: Record<number, number> = {};
  let majNum = nums[0];
  let majFreq = 0;

  steps.push({
    explanation:
      'Build a frequency map in one pass. Keep a running majority: whenever freq[num] exceeds the current maximum, update the majority candidate immediately. No second pass needed.',
    highlightLine: 3,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
      counters: [{ label: 'majority', value: 'None' }],
    },
    variables: [{ name: 'nums', value: `[${nums.join(', ')}]` }],
  });

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    freq[num] = (freq[num] ?? 0) + 1;
    const prevMaj = majNum;
    if (freq[num] > majFreq) {
      majNum = num;
      majFreq = freq[num];
    }
    const switched = majNum !== prevMaj;

    steps.push({
      explanation: switched
        ? `num=${num}: freq[${num}]=${freq[num]} > prev majority freq ${majFreq - 1}. New majority → ${num}.`
        : `num=${num}: freq[${num}]=${freq[num]}. Does not beat current majority (${majNum}, freq=${majFreq}).`,
      highlightLine: freq[num] > (majFreq - (switched ? 1 : 0)) ? 8 : 6,
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state: j < i ? ('visited' as const) : j === i ? ('active' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...freq } as Record<string | number, number>,
        counters: [{ label: 'majority', value: `(${majNum}, freq=${majFreq})` }],
      },
      variables: [
        { name: 'num', value: num, highlight: true },
        { name: `freq[${num}]`, value: freq[num], highlight: true },
        { name: 'majority', value: majNum, highlight: switched },
      ],
    });
  }

  steps.push({
    explanation: `All elements processed. majority = ${majNum} with frequency ${majFreq} (> n/2 = ${Math.floor(nums.length / 2)}). O(n) time, O(n) space.`,
    highlightLine: 9,
    state: {
      type: 'array',
      cells: nums.map(v => ({
        value: v,
        state: v === majNum ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      hashmap: { ...freq } as Record<string | number, number>,
      counters: [{ label: 'majority', value: majNum }],
    },
    variables: [{ name: 'return', value: majNum, highlight: true }],
  });

  return steps;
}

function generateBoyerMooreSteps(): Step[] {
  const nums = [2, 2, 1, 1, 1, 2, 2];
  const steps: Step[] = [];
  let candidate = nums[0];
  let count = 0;

  steps.push({
    explanation:
      'Boyer-Moore Voting: the majority element (> n/2 occurrences) can "outlast" all other values combined. Maintain a candidate and a count. When the count drops below zero the candidate has been cancelled — swap to the current element and restart.',
    highlightLine: 3,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'candidate', value: candidate },
        { label: 'count', value: count },
      ],
    },
    variables: [
      { name: 'candidate', value: candidate },
      { name: 'count', value: count },
    ],
  });

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];
    const prevCandidate = candidate;
    let explanation: string;
    let hl: number;

    if (num === candidate) {
      count++;
      explanation = `num=${num} matches candidate. count → ${count}.`;
      hl = 7;
    } else {
      count--;
      if (count < 0) {
        candidate = num;
        count = 1;
        explanation = `num=${num} ≠ candidate ${prevCandidate}. count → -1: candidate cancelled! Swap to ${candidate}, count=1.`;
        hl = 11;
      } else {
        explanation = `num=${num} ≠ candidate ${prevCandidate}. count → ${count}.`;
        hl = 9;
      }
    }

    const switched = candidate !== prevCandidate;

    steps.push({
      explanation,
      highlightLine: hl,
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state: j < i ? ('visited' as const) : j === i ? ('active' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'candidate', value: candidate },
          { label: 'count', value: count },
        ],
      },
      variables: [
        { name: 'num', value: num, highlight: true },
        { name: 'candidate', value: candidate, highlight: switched },
        { name: 'count', value: count, highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `Done. candidate = ${candidate}. Every non-majority element has been cancelled out at least once. O(n) time, O(1) space.`,
    highlightLine: 13,
    state: {
      type: 'array',
      cells: nums.map(v => ({
        value: v,
        state: v === candidate ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      counters: [
        { label: 'candidate', value: candidate },
        { label: 'count', value: count },
      ],
    },
    variables: [{ name: 'return', value: candidate, highlight: true }],
  });

  return steps;
}

const freqMapSolution: SolutionVariant = {
  label: 'Frequency Map',
  pythonCode: FREQ_MAP_CODE,
  generateSteps: generateFreqMapSteps,
};

const boyerMooreSolution: SolutionVariant = {
  label: 'Boyer-Moore',
  pythonCode: BOYER_MOORE_CODE,
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
