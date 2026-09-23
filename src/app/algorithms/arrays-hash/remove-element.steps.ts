import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's removeElement_20260626 verbatim: `l = r = 0`, then
// `while r < len(nums): if nums[r] != val: nums[l] = nums[r]; l += 1; r += 1`
// — l is the write pointer, r is the read pointer, r advances every
// iteration regardless of the branch taken.

function generateSteps(): Step[] {
  const numsOrig = [0, 1, 2, 2, 3, 0, 4, 2];
  const val = 2;
  const nums = [...numsOrig];
  const steps: Step[] = [];

  steps.push({
    explanation:
      `Remove Element on nums=[${numsOrig.join(',')}], val=${val}. Two-pointer approach: l is the write position, r is the read position (l = r = 0). Walk r through the array; when nums[r] != val, write it to nums[l] and increment l. r advances every iteration either way. Elements at l and beyond after the loop are "don't care".`,
    anchor: { match: 'l = r = 0' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [{ index: 0, label: 'l=0' }, { index: 0, label: 'r=0' }],
      counters: [
        { label: 'l (write ptr)', value: 0 },
        { label: 'r (read ptr)', value: 0 },
        { label: 'val', value: val },
      ],
    },
    variables: [
      { name: 'nums', value: `[${numsOrig.join(',')}]` },
      { name: 'val', value: val },
      { name: 'l', value: 0 },
    ],
  });

  let l = 0;

  for (let r = 0; r < nums.length; r++) {
    const cur = nums[r];
    const isVal = cur === val;

    steps.push({
      explanation: `r=${r}: nums[r]=${cur}. ${isVal ? `Equal to val=${val} → skip (l stays at ${l}).` : `Not val → write nums[${l}] = ${cur}, increment l to ${l + 1}.`}`,
      anchor: { match: 'if nums[r] != val:' },
      state: {
        type: 'array',
        cells: nums.map((v, idx) => ({
          value: v,
          state:
            idx === r
              ? ('active' as const)
              : idx < l
              ? ('found' as const)
              : ('default' as const),
        })),
        pointers: [
          { index: l, label: 'l' },
          { index: r, label: 'r' },
        ],
        counters: [
          { label: 'l (write ptr)', value: l },
          { label: 'r (read ptr)', value: r },
          { label: 'nums[r]', value: cur },
          { label: 'is val?', value: isVal ? 'yes→skip' : 'no→write' },
        ],
      },
      variables: [
        { name: 'r', value: r },
        { name: 'nums[r]', value: cur, highlight: true },
        { name: 'l', value: l },
      ],
    });

    if (!isVal) {
      nums[l] = cur;
      l++;

      steps.push({
        explanation: `Wrote ${cur} to position ${l - 1}. l is now ${l}. First ${l} element(s) in result: [${nums.slice(0, l).join(',')}].`,
        anchor: { match: 'nums[l] = nums[r]', to: { match: 'l+=1' } },
        state: {
          type: 'array',
          cells: nums.map((v, idx) => ({
            value: v,
            state:
              idx < l
                ? ('found' as const)
                : idx === r
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [
            { index: l < nums.length ? l : nums.length - 1, label: 'l' },
            { index: r, label: 'r' },
          ],
          counters: [
            { label: 'l (write ptr)', value: l },
            { label: 'r (read ptr)', value: r },
            { label: 'result so far', value: `[${nums.slice(0, l).join(',')}]` },
          ],
        },
        variables: [
          { name: 'l', value: l, highlight: true },
          { name: 'result', value: `[${nums.slice(0, l).join(',')}]` },
        ],
      });
    } else {
      steps.push({
        explanation: `nums[${r}]=${cur} equals val=${val} → eliminated (skip). l stays at ${l}.`,
        anchor: { match: 'if nums[r] != val:' },
        state: {
          type: 'array',
          cells: nums.map((v, idx) => ({
            value: v,
            state:
              idx === r
                ? ('eliminated' as const)
                : idx < l
                ? ('found' as const)
                : ('default' as const),
          })),
          pointers: [
            { index: l < nums.length ? l : nums.length - 1, label: 'l' },
            { index: r, label: 'r' },
          ],
          counters: [
            { label: 'l (write ptr)', value: l },
            { label: 'r (read ptr)', value: r },
            { label: 'skipped val', value: cur },
          ],
        },
        variables: [
          { name: 'l', value: l },
          { name: 'skipped', value: cur, highlight: true },
        ],
      });
    }
  }

  steps.push({
    explanation: `Done. l=${l} elements remain. Result (first ${l} elements): [${nums.slice(0, l).join(',')}]. The remaining cells are "don't care". Return l=${l}.`,
    anchor: { match: 'return l' },
    state: {
      type: 'array',
      cells: nums.map((v, idx) => ({
        value: v,
        state: idx < l ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      counters: [
        { label: 'l (return)', value: l },
        { label: 'result', value: `[${nums.slice(0, l).join(',')}]` },
      ],
    },
    variables: [{ name: 'return l', value: l, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointer (Write Position)',
  variant: 'write-pointer',
  generateSteps,
};

export const removeElementMeta: AlgorithmMeta = {
  id: 'remove-element',
  lcNumber: 27,
  title: 'Remove Element',
  difficulty: 'Easy',
  category: 'arrays-hash',
  tags: ['Array', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array nums and an integer val, remove all occurrences of val in nums in-place. Return the number of elements k in nums which are not equal to val. The first k elements of nums must contain only non-val elements.',
  examples: [
    {
      input: 'nums = [3,2,2,3], val = 3',
      output: '2, nums = [2,2,_,_]',
      explanation: 'Return k=2 with the first two elements being 2.',
    },
    {
      input: 'nums = [0,1,2,2,3,0,4,2], val = 2',
      output: '5, nums = [0,1,4,0,3,_,_,_]',
      explanation: 'Return k=5; the first five elements contain the non-2 values in any order.',
    },
  ] as ProblemExample[],
  constraints: [
    '0 ≤ nums.length ≤ 100',
    '0 ≤ nums[i] ≤ 50',
    '0 ≤ val ≤ 100',
  ],
  hint: 'Use a write pointer k starting at 0. Walk i through the array: whenever nums[i] != val, copy nums[i] to nums[k] and advance k. At the end, the first k elements are the valid result. O(n) time, O(1) space.',
  solutions: [solution],
};
