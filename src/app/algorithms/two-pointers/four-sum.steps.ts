import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def fourSum(self, nums: List[int], target: int) -> List[List[int]]:
        resultSet = set()
        nums.sort()
        for a in range(len(nums)):
            # skip a index to avoid duplicates
            currentTarget = target - nums[a]
            for b in range(a+1,len(nums),1):
                twoSumTarget = currentTarget - nums[b]
                c, d = b+1, len(nums) - 1
                while c < d:
                    if nums[c] + nums[d] == twoSumTarget:
                        result = (nums[a], nums[b], nums[c], nums[d])
                        resultSet.add(result)
                        c+=1
                        d-=1
                    elif nums[c] + nums[d] < twoSumTarget:
                        c+=1
                    else:
                        d-=1
        return list(resultSet)`;

function generateSteps(): Step[] {
  const original = [1, 0, -1, 0, -2, 2];
  const target = 0;
  const nums = [...original].sort((a, b) => a - b); // [-2,-1,0,0,1,2]
  const n = nums.length;
  const steps: Step[] = [];
  const found: string[] = [];

  const snap = (aIdx: number, bIdx: number, cIdx: number, dIdx: number) =>
    nums.map((v, idx) => ({
      value: v,
      state:
        idx === aIdx
          ? ('active' as const)
          : idx === bIdx
          ? ('active' as const)
          : idx >= cIdx && idx <= dIdx && cIdx <= dIdx
          ? ('window' as const)
          : idx < aIdx
          ? ('visited' as const)
          : ('default' as const),
    }));

  // Intro / sort step
  steps.push({
    explanation: `Sort first: [${original.join(', ')}] → [${nums.join(', ')}]. Sorting enables two-pointer searches. Fix outer indices a and b, then use two-pointer c/d on the remaining subarray to find pairs that sum to target - nums[a] - nums[b].`,
    highlightLine: 4,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [{ label: 'target', value: target }],
    },
    variables: [
      { name: 'sorted', value: `[${nums.join(', ')}]` },
      { name: 'target', value: target },
    ],
  });

  for (let a = 0; a < n - 3; a++) {
    const currentTarget = target - nums[a];

    steps.push({
      explanation: `a=${a}: nums[a]=${nums[a]}. currentTarget = target - nums[a] = ${target} - ${nums[a]} = ${currentTarget}. Fix this element and search for three more that sum to ${currentTarget}.`,
      highlightLine: 6,
      state: {
        type: 'array',
        cells: nums.map((v, idx) => ({
          value: v,
          state:
            idx === a
              ? ('active' as const)
              : idx < a
              ? ('visited' as const)
              : ('default' as const),
        })),
        pointers: [{ index: a, label: 'a' }],
        counters: [
          { label: 'target', value: target },
          { label: 'currentTarget', value: currentTarget },
          { label: 'found', value: found.length },
        ],
      },
      variables: [
        { name: 'a', value: a },
        { name: 'nums[a]', value: nums[a] },
        { name: 'currentTarget', value: currentTarget },
      ],
    });

    for (let b = a + 1; b < n - 2; b++) {
      const twoSumTarget = currentTarget - nums[b];
      let c = b + 1;
      let d = n - 1;

      steps.push({
        explanation: `  b=${b}: nums[b]=${nums[b]}. twoSumTarget = ${currentTarget} - ${nums[b]} = ${twoSumTarget}. Set c=${c}, d=${d}. Looking for nums[c]+nums[d]=${twoSumTarget}.`,
        highlightLine: 9,
        state: {
          type: 'array',
          cells: snap(a, b, c, d),
          pointers: [
            { index: a, label: 'a' },
            { index: b, label: 'b' },
            { index: c, label: 'c' },
            { index: d, label: 'd' },
          ],
          counters: [
            { label: 'twoSumTarget', value: twoSumTarget },
            { label: 'found', value: found.length },
          ],
        },
        variables: [
          { name: 'b', value: b },
          { name: 'nums[b]', value: nums[b] },
          { name: 'twoSumTarget', value: twoSumTarget },
          { name: 'c', value: c },
          { name: 'd', value: d },
        ],
      });

      while (c < d) {
        const pairSum = nums[c] + nums[d];

        if (pairSum === twoSumTarget) {
          const quad = `[${nums[a]},${nums[b]},${nums[c]},${nums[d]}]`;
          found.push(quad);
          steps.push({
            explanation: `nums[c]+nums[d] = ${nums[c]}+${nums[d]} = ${pairSum} == ${twoSumTarget} ✓ Found quadruplet ${quad}! Add to result set, then advance both c and d.`,
            highlightLine: 12,
            state: {
              type: 'array',
              cells: nums.map((v, idx) => ({
                value: v,
                state:
                  idx === a || idx === b || idx === c || idx === d
                    ? ('found' as const)
                    : idx < a
                    ? ('visited' as const)
                    : ('default' as const),
              })),
              pointers: [
                { index: a, label: 'a' },
                { index: b, label: 'b' },
                { index: c, label: 'c' },
                { index: d, label: 'd' },
              ],
              counters: [
                { label: 'pairSum', value: pairSum },
                { label: 'found', value: found.length },
              ],
            },
            variables: [
              { name: 'sum', value: pairSum, highlight: true },
              { name: 'quad', value: quad, highlight: true },
            ],
          });
          c++;
          d--;
        } else if (pairSum < twoSumTarget) {
          steps.push({
            explanation: `nums[c]+nums[d] = ${nums[c]}+${nums[d]} = ${pairSum} < ${twoSumTarget}. Too small — move c right to increase sum.`,
            highlightLine: 18,
            state: {
              type: 'array',
              cells: snap(a, b, c, d),
              pointers: [
                { index: a, label: 'a' },
                { index: b, label: 'b' },
                { index: c, label: 'c' },
                { index: d, label: 'd' },
              ],
              counters: [
                { label: 'pairSum', value: pairSum },
                { label: 'found', value: found.length },
              ],
            },
            variables: [
              { name: 'sum', value: pairSum, highlight: true },
              { name: 'action', value: 'c++' },
            ],
          });
          c++;
        } else {
          steps.push({
            explanation: `nums[c]+nums[d] = ${nums[c]}+${nums[d]} = ${pairSum} > ${twoSumTarget}. Too large — move d left to decrease sum.`,
            highlightLine: 20,
            state: {
              type: 'array',
              cells: snap(a, b, c, d),
              pointers: [
                { index: a, label: 'a' },
                { index: b, label: 'b' },
                { index: c, label: 'c' },
                { index: d, label: 'd' },
              ],
              counters: [
                { label: 'pairSum', value: pairSum },
                { label: 'found', value: found.length },
              ],
            },
            variables: [
              { name: 'sum', value: pairSum, highlight: true },
              { name: 'action', value: 'd--' },
            ],
          });
          d--;
        }
      }
    }
  }

  steps.push({
    explanation: `All (a, b) pairs processed. Result set: ${found.join(', ')}. O(n³) time (two outer loops + two-pointer inner scan), O(n) space for output.`,
    highlightLine: 21,
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
  label: 'Sort + Two Nested Loops + Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const fourSumMeta: AlgorithmMeta = {
  id: 'four-sum',
  lcNumber: 18,
  title: '4Sum',
  difficulty: 'Medium',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers', 'Sorting'],
  timeComplexity: 'O(n³)',
  spaceComplexity: 'O(n)',
  description:
    'Given an array nums of n integers and an integer target, return an array of all unique quadruplets [nums[a], nums[b], nums[c], nums[d]] such that the four indices are distinct and their values sum to target.',
  examples: [
    {
      input: 'nums = [1,0,-1,0,-2,2], target = 0',
      output: '[[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]',
    },
    {
      input: 'nums = [2,2,2,2,2], target = 8',
      output: '[[2,2,2,2]]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 200',
    '-10⁹ ≤ nums[i] ≤ 10⁹',
    '-10⁹ ≤ target ≤ 10⁹',
  ],
  hint: 'Sort the array. Fix two outer indices a and b (O(n²)), then run a two-pointer search with c and d on the remaining subarray to find pairs that complete the quadruplet. Use a result set to automatically deduplicate.',
  solutions: [solution],
};
