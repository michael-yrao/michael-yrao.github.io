import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def twoSum(self, numbers: List[int], target: int) -> List[int]:
        # Since we know it's sorted
        # we can just use two pointers, one starting from left
        # one starting from right
        # if l + r > target, move r left
        # if l + r < target, move l right
        # if equal return l and r

        l, r = 0, len(numbers) - 1

        while l < r:
            if numbers[l] + numbers[r] == target:
                return [l+1,r+1]
            if numbers[l] + numbers[r] > target:
                r-=1
            else:
                l+=1`;

function generateSteps(): Step[] {
  const nums = [2, 7, 11, 15];
  const target = 9;
  const steps: Step[] = [];

  const snap = (l: number, r: number, found = false) =>
    nums.map((v, i) => ({
      value: v,
      state:
        found && (i === l || i === r)
          ? ('found' as const)
          : i === l
          ? ('active' as const)
          : i === r
          ? ('min-ptr' as const)
          : i > l && i < r
          ? ('window' as const)
          : ('eliminated' as const),
    }));

  steps.push({
    explanation:
      `Two Sum II uses the sorted property. Start with l=0 (smallest) and r=n−1 (largest). Their sum tells us exactly which direction to move: too small → advance l; too large → retreat r. No hash map needed — O(1) space.`,
    highlightLine: 2,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'target', value: target }],
  });

  let l = 0;
  let r = nums.length - 1;

  while (l < r) {
    const s = nums[l] + nums[r];

    steps.push({
      explanation: `l=${l}, r=${r}: nums[l]+nums[r] = ${nums[l]}+${nums[r]} = ${s}. ${
        s === target ? `Equals target ${target}!` :
        s < target ? `${s} < ${target} → sum too small, advance l.` :
                     `${s} > ${target} → sum too large, retreat r.`
      }`,
      highlightLine: s === target ? 6 : s < target ? 8 : 10,
      state: {
        type: 'array',
        cells: snap(l, r, s === target),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
      },
      variables: [
        { name: 'l', value: l },
        { name: 'r', value: r },
        { name: 'sum', value: s, highlight: true },
        { name: 'target', value: target },
      ],
    });

    if (s === target) {
      steps.push({
        explanation: `Found: indices [${l + 1}, ${r + 1}] (1-indexed). O(n) time, O(1) space.`,
        highlightLine: 7,
        state: {
          type: 'array',
          cells: snap(l, r, true),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        },
        variables: [{ name: 'return', value: `[${l + 1}, ${r + 1}]`, highlight: true }],
      });
      break;
    } else if (s < target) {
      l++;
    } else {
      r--;
    }
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const twoSumIIMeta: AlgorithmMeta = {
  id: 'two-sum-ii',
  lcNumber: 167,
  title: 'Two Sum II',
  difficulty: 'Medium',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers', 'Binary Search'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given a 1-indexed array of integers numbers that is already sorted in non-decreasing order, find two numbers such that they add up to a specific target number. Return their indices as a 1-indexed array [index1, index2].',
  examples: [
    {
      input: 'numbers = [2,7,11,15], target = 9',
      output: '[1,2]',
      explanation: 'numbers[1] + numbers[2] = 2 + 7 = 9.',
    },
    {
      input: 'numbers = [2,3,4], target = 6',
      output: '[1,3]',
    },
  ] as ProblemExample[],
  constraints: [
    '2 ≤ numbers.length ≤ 3 × 10⁴',
    '-1000 ≤ numbers[i] ≤ 1000',
    'numbers is sorted in non-decreasing order.',
    'Exactly one solution exists.',
    'You may not use the same element twice.',
    'O(1) extra space required.',
  ],
  hint: 'Use two pointers at opposite ends. The sorted order guarantees: if the sum is too small, moving l right increases it; if too large, moving r left decreases it. Exactly one valid pair exists so the loop always terminates with a result.',
  solutions: [solution],
};
