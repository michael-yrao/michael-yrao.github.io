import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def getConcatenationNonPython(self, nums: List[int]) -> List[int]:
        # create a list of size len(nums)*2
        # loop through new list, insert nums
        ans = []
        ansIterator = 0
        while ansIterator < len(nums)*2:
            ans.append(nums[ansIterator%len(nums)])
            ansIterator+=1
        return ans`;

function generateSteps(): Step[] {
  const nums = [1, 2, 1];
  const n = nums.length;
  const steps: Step[] = [];

  // Build result array starting all at 0
  const ans: (number | string)[] = new Array(n * 2).fill(0);

  steps.push({
    explanation:
      `Concatenation of Array: nums=[${nums.join(',')}]. Create ans of size ${n * 2} (all 0). Fill ans[i] = nums[i] for i in [0..${n - 1}], then ans[i+n] = nums[i] for i in [0..${n - 1}]. Result will be [${[...nums, ...nums].join(',')}].`,
    highlightLine: 5,
    state: {
      type: 'array',
      cells: ans.map(v => ({ value: v, state: 'default' as const })),
      pointers: [{ index: 0, label: 'ansIterator=0' }],
      counters: [
        { label: 'n', value: n },
        { label: 'ans.length', value: n * 2 },
      ],
    },
    variables: [
      { name: 'nums', value: `[${nums.join(',')}]` },
      { name: 'n', value: n },
    ],
  });

  // First pass: fill ans[0..n-1]
  for (let i = 0; i < n; i++) {
    ans[i] = nums[i];
    steps.push({
      explanation: `ansIterator=${i}: ans[${i}] = nums[${i} % ${n}] = nums[${i}] = ${nums[i]}. First copy pass.`,
      highlightLine: 8,
      state: {
        type: 'array',
        cells: ans.map((v, idx) => ({
          value: v,
          state:
            idx === i
              ? ('active' as const)
              : idx < i
              ? ('found' as const)
              : ('default' as const),
        })),
        pointers: [{ index: i, label: `ans[${i}]` }],
        counters: [
          { label: 'ansIterator', value: i },
          { label: 'src: nums[i%n]', value: nums[i % n] },
          { label: 'filled', value: `[${ans.slice(0, i + 1).join(',')}]` },
        ],
      },
      variables: [
        { name: 'ansIterator', value: i },
        { name: 'nums[i%n]', value: nums[i % n], highlight: true },
      ],
    });
  }

  // Second pass: fill ans[n..2n-1]
  for (let i = 0; i < n; i++) {
    ans[n + i] = nums[i];
    steps.push({
      explanation: `ansIterator=${n + i}: ans[${n + i}] = nums[${n + i} % ${n}] = nums[${i}] = ${nums[i]}. Second copy pass (repeat).`,
      highlightLine: 8,
      state: {
        type: 'array',
        cells: ans.map((v, idx) => ({
          value: v,
          state:
            idx === n + i
              ? ('active' as const)
              : idx <= n + i - 1
              ? ('found' as const)
              : ('default' as const),
        })),
        pointers: [{ index: n + i, label: `ans[${n + i}]` }],
        counters: [
          { label: 'ansIterator', value: n + i },
          { label: 'src: nums[i%n]', value: nums[i] },
          { label: 'filled', value: `[${ans.slice(0, n + i + 1).join(',')}]` },
        ],
      },
      variables: [
        { name: 'ansIterator', value: n + i },
        { name: 'nums[i%n]', value: nums[i], highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `All ${n * 2} cells written. ans = [${ans.join(',')}]. The array is exactly nums+nums. Return ans.`,
    highlightLine: 10,
    state: {
      type: 'array',
      cells: ans.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [{ label: 'return', value: `[${ans.join(',')}]` }],
    },
    variables: [{ name: 'return', value: `[${ans.join(',')}]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Index Modulo Fill',
  pythonCode: PYTHON_CODE,
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
  hint: 'Create ans of size 2n. For ansIterator from 0 to 2n-1, set ans[ansIterator] = nums[ansIterator % n]. The modulo wraps back to the start of nums after the first n elements.',
  solutions: [solution],
};
