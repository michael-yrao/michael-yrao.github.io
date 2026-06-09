import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        nums.sort()
        result = set()
        for i in range(len(nums)):
            j, k = i + 1, len(nums) - 1
            while j < k:
                s = nums[i] + nums[j] + nums[k]
                if s == 0:
                    result.add((nums[i], nums[j], nums[k]))
                    j += 1
                    k -= 1
                elif s > 0:
                    k -= 1
                else:
                    j += 1
        return list(result)`;

function generateSteps(): Step[] {
  const original = [-1, 0, 1, 2, -1, -4];
  const nums = [...original].sort((a, b) => a - b); // [-4,-1,-1,0,1,2]
  const n = nums.length;
  const steps: Step[] = [];
  const found: string[] = [];

  const snap = (iIdx: number, jIdx: number, kIdx: number) =>
    nums.map((v, idx) => ({
      value: v,
      state:
        idx === iIdx
          ? ('found' as const)
          : idx === jIdx
          ? ('active' as const)
          : idx === kIdx
          ? ('min-ptr' as const)
          : idx < iIdx
          ? ('visited' as const)
          : ('default' as const),
    }));

  // Intro
  steps.push({
    explanation: `Sort first: [${original.join(', ')}] → [${nums.join(', ')}]. Sorting lets us use a two-pointer search for the inner pair. Fix i (outer element), then use j (left) and k (right) to find two elements that sum to -nums[i].`,
    highlightLine: 3,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'sorted', value: `[${nums.join(', ')}]` }],
  });

  for (let i = 0; i < n - 2; i++) {
    // Skip duplicate i (but always show the first occurrence)
    if (i > 0 && nums[i] === nums[i - 1]) {
      steps.push({
        explanation: `i=${i}: nums[${i}]=${nums[i]} is the same as nums[${i - 1}]=${nums[i - 1]}. Skip to avoid duplicate triplets.`,
        highlightLine: 5,
        state: {
          type: 'array',
          cells: nums.map((v, idx) => ({
            value: v,
            state: idx <= i ? ('visited' as const) : ('default' as const),
          })),
          pointers: [{ index: i, label: 'i (skip)' }],
          counters: found.length > 0 ? [{ label: 'found', value: found.join(', ') }] : [],
        },
        variables: [{ name: 'i', value: i }, { name: 'skip duplicate', value: nums[i] }],
      });
      continue;
    }

    let j = i + 1;
    let k = n - 1;

    steps.push({
      explanation: `i=${i}: nums[i]=${nums[i]}. Set j=${j} (left of remaining) and k=${k} (right). Looking for nums[j]+nums[k] = ${-nums[i]}.`,
      highlightLine: 6,
      state: {
        type: 'array',
        cells: snap(i, j, k),
        pointers: [
          { index: i, label: 'i' },
          { index: j, label: 'j' },
          { index: k, label: 'k' },
        ],
        counters: found.length > 0 ? [{ label: 'found', value: found.join(', ') }] : [],
      },
      variables: [
        { name: 'i', value: i },
        { name: 'nums[i]', value: nums[i] },
        { name: 'target', value: -nums[i] },
      ],
    });

    while (j < k) {
      const sum = nums[i] + nums[j] + nums[k];

      if (sum === 0) {
        const triplet = `[${nums[i]},${nums[j]},${nums[k]}]`;
        found.push(triplet);
        steps.push({
          explanation: `nums[${i}]+nums[${j}]+nums[${k}] = ${nums[i]}+${nums[j]}+${nums[k]} = 0 ✓ Found triplet ${triplet}! Advance both j and k.`,
          highlightLine: 9,
          state: {
            type: 'array',
            cells: nums.map((v, idx) => ({
              value: v,
              state:
                idx === i || idx === j || idx === k
                  ? ('found' as const)
                  : idx < i
                  ? ('visited' as const)
                  : ('default' as const),
            })),
            pointers: [
              { index: i, label: 'i' },
              { index: j, label: 'j' },
              { index: k, label: 'k' },
            ],
            counters: [{ label: 'found', value: found.join(', ') }],
          },
          variables: [
            { name: 'sum', value: sum, highlight: true },
            { name: 'triplet', value: triplet, highlight: true },
          ],
        });
        j++;
        k--;
      } else if (sum > 0) {
        steps.push({
          explanation: `sum=${sum} > 0. Too large — move k left to reduce the sum.`,
          highlightLine: 13,
          state: {
            type: 'array',
            cells: snap(i, j, k),
            pointers: [
              { index: i, label: 'i' },
              { index: j, label: 'j' },
              { index: k, label: 'k' },
            ],
            counters: found.length > 0 ? [{ label: 'found', value: found.join(', ') }] : [],
          },
          variables: [
            { name: 'sum', value: sum, highlight: true },
            { name: 'action', value: 'k--' },
          ],
        });
        k--;
      } else {
        steps.push({
          explanation: `sum=${sum} < 0. Too small — move j right to increase the sum.`,
          highlightLine: 15,
          state: {
            type: 'array',
            cells: snap(i, j, k),
            pointers: [
              { index: i, label: 'i' },
              { index: j, label: 'j' },
              { index: k, label: 'k' },
            ],
            counters: found.length > 0 ? [{ label: 'found', value: found.join(', ') }] : [],
          },
          variables: [
            { name: 'sum', value: sum, highlight: true },
            { name: 'action', value: 'j++' },
          ],
        });
        j++;
      }
    }
  }

  steps.push({
    explanation: `All outer values processed. Result: ${found.join(', ')}. O(n²) time (sorting + two-pointer scan per outer element), O(n) space for output.`,
    highlightLine: 16,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
      counters: [{ label: 'result', value: found.join(', ') }],
    },
    variables: [{ name: 'return', value: found.join(', '), highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Sort + Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const threeSumMeta: AlgorithmMeta = {
  id: 'three-sum',
  lcNumber: 15,
  title: '3Sum',
  difficulty: 'Medium',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers', 'Sorting'],
  timeComplexity: 'O(n²)',
  spaceComplexity: 'O(n)',
  description:
    'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i, j, and k are distinct indices, nums[i] + nums[j] + nums[k] == 0, and the solution set contains no duplicate triplets.',
  examples: [
    {
      input: 'nums = [-1,0,1,2,-1,-4]',
      output: '[[-1,-1,2],[-1,0,1]]',
    },
    {
      input: 'nums = [0,1,1]',
      output: '[]',
    },
    {
      input: 'nums = [0,0,0]',
      output: '[[0,0,0]]',
    },
  ] as ProblemExample[],
  constraints: [
    '3 ≤ nums.length ≤ 3000',
    '-10⁵ ≤ nums[i] ≤ 10⁵',
  ],
  hint: 'Sort the array. For each element nums[i] (the "anchor"), reduce the problem to two-sum on the sorted subarray to the right. Two pointers j and k move inward, adjusting based on whether the current sum is too small or too large.',
  solutions: [solution],
};
