import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's twoSum (167_two_sum_2.py) verbatim: each iteration checks equality
// first (return on match), THEN checks greater-than (retreat r), and only falls to the plain
// else (advance l) when neither if matched. This order matters for the anchor on each branch.

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
      `Two Sum II uses the sorted property. Start with l=0 (smallest) and r=n−1 (largest). Each iteration checks equality first — if numbers[l]+numbers[r] == target, return. Otherwise, if the sum is too large, retreat r; else (sum too small) advance l. No hash map needed — O(1) space.`,
    anchor: { match: 'l, r = 0, len(numbers) - 1' },
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

    if (s === target) {
      steps.push({
        explanation: `l=${l}, r=${r}: numbers[l]+numbers[r] = ${nums[l]}+${nums[r]} = ${s} == target ${target} → equal! Return.`,
        anchor: { match: 'if numbers[l] + numbers[r] == target:' },
        state: {
          type: 'array',
          cells: snap(l, r, false),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        },
        variables: [
          { name: 'l', value: l },
          { name: 'r', value: r },
          { name: 'sum', value: s, highlight: true },
          { name: 'target', value: target },
        ],
      });
      steps.push({
        explanation: `Found: indices [${l + 1}, ${r + 1}] (1-indexed). O(n) time, O(1) space.`,
        anchor: { match: 'return [l+1,r+1]' },
        state: {
          type: 'array',
          cells: snap(l, r, true),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        },
        variables: [{ name: 'return', value: `[${l + 1}, ${r + 1}]`, highlight: true }],
      });
      break;
    } else if (s > target) {
      steps.push({
        explanation: `l=${l}, r=${r}: numbers[l]+numbers[r] = ${nums[l]}+${nums[r]} = ${s}. Not equal to target ${target}; ${s} > ${target} → sum too large, retreat r.`,
        anchor: { match: 'if numbers[l] + numbers[r] > target:', to: { match: 'r-=1' } },
        state: {
          type: 'array',
          cells: snap(l, r, false),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        },
        variables: [
          { name: 'l', value: l },
          { name: 'r', value: r },
          { name: 'sum', value: s, highlight: true },
          { name: 'target', value: target },
        ],
      });
      r--;
    } else {
      steps.push({
        explanation: `l=${l}, r=${r}: numbers[l]+numbers[r] = ${nums[l]}+${nums[r]} = ${s}. Not equal to target ${target}, and not greater — falls to else: sum too small, advance l.`,
        anchor: { match: 'l+=1' },
        state: {
          type: 'array',
          cells: snap(l, r, false),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        },
        variables: [
          { name: 'l', value: l },
          { name: 'r', value: r },
          { name: 'sum', value: s, highlight: true },
          { name: 'target', value: target },
        ],
      });
      l++;
    }
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointers',
  variant: 'two-pointers',
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
