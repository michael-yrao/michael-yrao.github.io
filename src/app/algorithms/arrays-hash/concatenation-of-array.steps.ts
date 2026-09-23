import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's getConcatenationNonPython verbatim: a SINGLE while loop
// over ansIterator from 0 to 2n-1, appending nums[ansIterator % n] every
// iteration — not two separate copy passes (the old pasted code's split into a
// "first pass ans[0..n-1]" for-loop and a "second pass ans[n..2n-1]" for-loop
// doesn't exist in the attempt; the modulo does the same work uniformly across
// the single loop).

// Placeholder for a slot `ans` hasn't grown into yet — the attempt's `ans` starts
// as `[]` and grows one `append()` at a time, so an unfilled slot is never really
// a 0; it renders as empty, not as a value.
const UNFILLED_SLOT = '·';

function generateSteps(): Step[] {
  const nums = [1, 2, 1];
  const n = nums.length;
  const total = n * 2;
  const steps: Step[] = [];

  // Reserve `total` slots for rendering, but track how many are actually
  // appended so far (`filledCount`) — that count is what "ans.length" shows.
  const ans: (number | string)[] = new Array(total).fill(UNFILLED_SLOT);

  steps.push({
    explanation:
      `Concatenation of Array: nums=[${nums.join(',')}]. Create empty ans, then while ansIterator < ${total} (= len(nums)*2), append nums[ansIterator % ${n}] and increment. One loop the whole way — the modulo wraps back to the start of nums once ansIterator reaches ${n}. Result will be [${[...nums, ...nums].join(',')}].`,
    anchor: { match: 'ans = []' },
    state: {
      type: 'array',
      cells: ans.map(v => ({ value: v, state: 'default' as const })),
      pointers: [{ index: 0, label: 'ansIterator=0' }],
      counters: [
        { label: 'n', value: n },
        { label: 'ans.length', value: 0 },
      ],
    },
    variables: [
      { name: 'nums', value: `[${nums.join(',')}]` },
      { name: 'n', value: n },
    ],
  });

  for (let ansIterator = 0; ansIterator < total; ansIterator++) {
    const srcIdx = ansIterator % n;
    ans[ansIterator] = nums[srcIdx];
    const filledCount = ansIterator + 1;
    steps.push({
      explanation: `ansIterator=${ansIterator}: ans.append(nums[${ansIterator} % ${n}]) = nums[${srcIdx}] = ${nums[srcIdx]}. ans.length is now ${filledCount}. ansIterator becomes ${filledCount}.`,
      anchor: {
        match: 'ans.append(nums[ansIterator%len(nums)])',
        to: { match: 'ansIterator+=1' },
      },
      state: {
        type: 'array',
        cells: ans.map((v, idx) => ({
          value: v,
          state:
            idx === ansIterator
              ? ('active' as const)
              : idx < ansIterator
              ? ('found' as const)
              : ('default' as const),
        })),
        pointers: [{ index: ansIterator, label: `ans[${ansIterator}]` }],
        counters: [
          { label: 'ansIterator', value: ansIterator },
          { label: 'src: nums[ansIterator%n]', value: nums[srcIdx] },
          { label: 'ans.length', value: filledCount },
        ],
      },
      variables: [
        { name: 'ansIterator', value: ansIterator },
        { name: 'nums[ansIterator%n]', value: nums[srcIdx], highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `ansIterator=${total} is no longer < ${total} — loop ends. ans = [${ans.join(',')}]. The array is exactly nums+nums. Return ans.`,
    anchor: { match: 'return ans' },
    state: {
      type: 'array',
      cells: ans.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [{ label: 'ans.length', value: total }],
    },
    variables: [{ name: 'return', value: `[${ans.join(',')}]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Index Modulo Fill',
  variant: 'modulo-fill',
  generateSteps,
};

export const concatenationOfArrayMeta: AlgorithmMeta = {
  id: 'concatenation-of-array',
  lcNumber: 1929,
  title: 'Concatenation of Array',
  difficulty: 'Easy',
  category: 'arrays-hash',
  tags: ['Array'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an integer array nums of length n, create an array ans of length 2n where ans[i] == nums[i] and ans[i+n] == nums[i] for 0 ≤ i < n. Return the array ans.',
  examples: [
    {
      input: 'nums = [1,2,1]',
      output: '[1,2,1,1,2,1]',
      explanation: 'ans = [nums[0],nums[1],nums[2],nums[0],nums[1],nums[2]] = [1,2,1,1,2,1].',
    },
    {
      input: 'nums = [1,3,2,1]',
      output: '[1,3,2,1,1,3,2,1]',
    },
  ] as ProblemExample[],
  constraints: [
    'n == nums.length',
    '1 ≤ n ≤ 1000',
    '1 ≤ nums[i] ≤ 1000',
  ],
  hint: 'Start ans as an empty list. While ansIterator < 2n, append nums[ansIterator % n] and increment. The modulo wraps ansIterator back to the start of nums once it reaches n, so one loop builds both copies.',
  solutions: [solution],
};
