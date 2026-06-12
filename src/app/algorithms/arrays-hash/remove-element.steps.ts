import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def removeElementTwoPointer(self, nums: List[int], val: int) -> int:
        # use counter to keep track of where the replacement should go
        # iterate through the list
        # if nums[i] == val, counter stays here
        # if nums[i] != val, replace nums[counter] = nums[i], increment counter

        counter = 0
        for value in enumerate(nums):
            if value != val:
                nums[counter] = value
                counter+=1

        return counter`;

function generateSteps(): Step[] {
  const numsOrig = [0, 1, 2, 2, 3, 0, 4, 2];
  const val = 2;
  const nums = [...numsOrig];
  const steps: Step[] = [];

  steps.push({
    explanation:
      `Remove Element on nums=[${numsOrig.join(',')}], val=${val}. Two-pointer approach: k is the write position. Walk i through the array; when nums[i] != val, write it to nums[k] and increment k. Elements at k and beyond after the loop are "don't care".`,
    highlightLine: 9,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [{ index: 0, label: 'k=0' }, { index: 0, label: 'i=0' }],
      counters: [
        { label: 'k (write ptr)', value: 0 },
        { label: 'i (read ptr)', value: 0 },
        { label: 'val', value: val },
      ],
    },
    variables: [
      { name: 'nums', value: `[${numsOrig.join(',')}]` },
      { name: 'val', value: val },
      { name: 'k', value: 0 },
    ],
  });

  let k = 0;

  for (let i = 0; i < nums.length; i++) {
    const cur = nums[i];
    const isVal = cur === val;

    steps.push({
      explanation: `i=${i}: nums[i]=${cur}. ${isVal ? `Equal to val=${val} → skip (k stays at ${k}).` : `Not val → write nums[${k}] = ${cur}, increment k to ${k + 1}.`}`,
      highlightLine: isVal ? 11 : 12,
      state: {
        type: 'array',
        cells: nums.map((v, idx) => ({
          value: v,
          state:
            idx === i
              ? ('active' as const)
              : idx < k
              ? ('found' as const)
              : ('default' as const),
        })),
        pointers: [
          { index: k, label: 'k' },
          { index: i, label: 'i' },
        ],
        counters: [
          { label: 'k (write ptr)', value: k },
          { label: 'i (read ptr)', value: i },
          { label: 'nums[i]', value: cur },
          { label: 'is val?', value: isVal ? 'yes→skip' : 'no→write' },
        ],
      },
      variables: [
        { name: 'i', value: i },
        { name: 'nums[i]', value: cur, highlight: true },
        { name: 'k', value: k },
      ],
    });

    if (!isVal) {
      nums[k] = cur;
      k++;

      steps.push({
        explanation: `Wrote ${cur} to position ${k - 1}. k is now ${k}. First ${k} element(s) in result: [${nums.slice(0, k).join(',')}].`,
        highlightLine: 13,
        state: {
          type: 'array',
          cells: nums.map((v, idx) => ({
            value: v,
            state:
              idx < k
                ? ('found' as const)
                : idx === i
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [
            { index: k < nums.length ? k : nums.length - 1, label: 'k' },
            { index: i, label: 'i' },
          ],
          counters: [
            { label: 'k (write ptr)', value: k },
            { label: 'i (read ptr)', value: i },
            { label: 'result so far', value: `[${nums.slice(0, k).join(',')}]` },
          ],
        },
        variables: [
          { name: 'k', value: k, highlight: true },
          { name: 'result', value: `[${nums.slice(0, k).join(',')}]` },
        ],
      });
    } else {
      steps.push({
        explanation: `nums[${i}]=${cur} equals val=${val} → eliminated (skip). k stays at ${k}.`,
        highlightLine: 11,
        state: {
          type: 'array',
          cells: nums.map((v, idx) => ({
            value: v,
            state:
              idx === i
                ? ('eliminated' as const)
                : idx < k
                ? ('found' as const)
                : ('default' as const),
          })),
          pointers: [
            { index: k < nums.length ? k : nums.length - 1, label: 'k' },
            { index: i, label: 'i' },
          ],
          counters: [
            { label: 'k (write ptr)', value: k },
            { label: 'i (read ptr)', value: i },
            { label: 'skipped val', value: cur },
          ],
        },
        variables: [
          { name: 'k', value: k },
          { name: 'skipped', value: cur, highlight: true },
        ],
      });
    }
  }

  steps.push({
    explanation: `Done. k=${k} elements remain. Result (first ${k} elements): [${nums.slice(0, k).join(',')}]. The remaining cells are "don't care". Return k=${k}.`,
    highlightLine: 15,
    state: {
      type: 'array',
      cells: nums.map((v, idx) => ({
        value: v,
        state: idx < k ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      counters: [
        { label: 'k (return)', value: k },
        { label: 'result', value: `[${nums.slice(0, k).join(',')}]` },
      ],
    },
    variables: [{ name: 'return k', value: k, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointer (Write Position)',
  pythonCode: PYTHON_CODE,
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
