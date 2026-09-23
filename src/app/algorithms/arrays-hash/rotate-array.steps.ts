import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's rotate_20260624 verbatim: a SINGLE `reverse(left,
// right)` helper (no nested `swap` sub-helper) that inlines the swap via
// `tmp = nums[left]; nums[left] = nums[right]; nums[right] = tmp`, then
// `left += 1; right -= 1`, called as reverse(0,len(nums)-1), reverse(0,k-1),
// reverse(k,len(nums)-1).

function generateSteps(): Step[] {
  const original = [1, 2, 3, 4, 5, 6, 7];
  const nums = [...original];
  const k = 3;
  const n = nums.length;
  const steps: Step[] = [];

  const snap = (
    active: Set<number>,
    done: Set<number>,
    region: [number, number] | null
  ) =>
    nums.map((v, i) => ({
      value: v,
      state:
        active.has(i)
          ? ('active' as const)
          : done.has(i)
          ? ('found' as const)
          : region && i >= region[0] && i <= region[1]
          ? ('window' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation: `Rotation by k=${k} on [${original.join(',')}]. Key insight: reverse all → reverse first k → reverse last n-k. This repositions every element in O(n) time with O(1) space.`,
    anchor: { match: 'k = k % len(nums)' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [
      { name: 'k', value: k },
      { name: 'n', value: n },
    ],
  });

  // Phase 1: reverse all
  steps.push({
    explanation: `Phase 1: reverse(0, len(nums)-1) — reverse the entire array (indices 0..${n - 1}).`,
    anchor: { match: 'reverse(0,len(nums)-1)' },
    state: {
      type: 'array',
      cells: snap(new Set(), new Set(), [0, n - 1]),
      pointers: [{ index: 0, label: 'left' }, { index: n - 1, label: 'right' }],
    },
    variables: [{ name: 'phase', value: 'reverse(0, len(nums)-1)' }],
  });

  const reverse = (left: number, right: number, phaseLabel: string) => {
    let currentLeft = left, currentRight = right;
    while (currentLeft < currentRight) {
      const done: Set<number> = new Set();
      for (let x = left; x < currentLeft; x++) done.add(x);
      for (let x = currentRight + 1; x <= right; x++) done.add(x);

      const tmp = nums[currentLeft];

      steps.push({
        explanation: `${phaseLabel}: tmp = nums[${currentLeft}] = ${tmp}. nums[${currentLeft}] = nums[${currentRight}] (${nums[currentRight]}). nums[${currentRight}] = tmp (${tmp}). left+=1, right-=1.`,
        anchor: { match: 'tmp = nums[left]', to: { match: 'right-=1' } },
        state: {
          type: 'array',
          cells: snap(new Set([currentLeft, currentRight]), done, [left, right]),
          pointers: [{ index: currentLeft, label: 'left' }, { index: currentRight, label: 'right' }],
        },
        variables: [
          { name: 'tmp', value: tmp, highlight: true },
          { name: 'swap', value: `${nums[currentLeft]} ↔ ${nums[currentRight]}`, highlight: true },
        ],
      });
      [nums[currentLeft], nums[currentRight]] = [nums[currentRight], nums[currentLeft]];
      currentLeft++;
      currentRight--;
    }
  };

  reverse(0, n - 1, 'Phase 1');

  steps.push({
    explanation: `After phase 1: [${nums.join(',')}]. The whole array is flipped.`,
    anchor: { match: 'reverse(0,len(nums)-1)' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
    },
    variables: [{ name: 'array', value: `[${nums.join(',')}]` }],
  });

  // Phase 2: reverse first k
  steps.push({
    explanation: `Phase 2: reverse(0, k-1) — reverse first k=${k} elements (indices 0..${k - 1}).`,
    anchor: { match: 'reverse(0,k-1)' },
    state: {
      type: 'array',
      cells: snap(new Set(), new Set(), [0, k - 1]),
      pointers: [{ index: 0, label: 'left' }, { index: k - 1, label: 'right' }],
    },
    variables: [{ name: 'phase', value: `reverse(0, ${k - 1})` }],
  });

  reverse(0, k - 1, 'Phase 2');

  steps.push({
    explanation: `After phase 2: [${nums.join(',')}]. First ${k} elements are now in rotated order.`,
    anchor: { match: 'reverse(0,k-1)' },
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i < k ? ('found' as const) : ('visited' as const),
      })),
      pointers: [],
    },
    variables: [{ name: 'array', value: `[${nums.join(',')}]` }],
  });

  // Phase 3: reverse last n-k
  steps.push({
    explanation: `Phase 3: reverse(k, len(nums)-1) — reverse last n-k=${n - k} elements (indices ${k}..${n - 1}).`,
    anchor: { match: 'reverse(k,len(nums)-1)' },
    state: {
      type: 'array',
      cells: snap(new Set(), new Set([...Array(k).keys()]), [k, n - 1]),
      pointers: [{ index: k, label: 'left' }, { index: n - 1, label: 'right' }],
    },
    variables: [{ name: 'phase', value: `reverse(${k}, len(nums)-1)` }],
  });

  reverse(k, n - 1, 'Phase 3');

  steps.push({
    explanation: `Done. [${nums.join(',')}] = rotate([${original.join(',')}], k=${k}). Three reversals: O(n) time, O(1) space.`,
    anchor: { match: 'reverse(k,len(nums)-1)' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
    },
    variables: [{ name: 'result', value: `[${nums.join(',')}]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Three Reversals',
  variant: 'three-reversals',
  generateSteps,
};

export const rotateArrayMeta: AlgorithmMeta = {
  id: 'rotate-array',
  lcNumber: 189,
  title: 'Rotate Array',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Math', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array nums, rotate the array to the right by k steps, where k is non-negative. Do it in-place with O(1) extra space.',
  examples: [
    {
      input: 'nums = [1,2,3,4,5,6,7], k = 3',
      output: '[5,6,7,1,2,3,4]',
      explanation: 'Rotate 3 steps: [7,1,2,3,4,5,6] → [6,7,1,2,3,4,5] → [5,6,7,1,2,3,4].',
    },
    {
      input: 'nums = [-1,-100,3,99], k = 2',
      output: '[3,99,-1,-100]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 10⁵',
    '-2³¹ ≤ nums[i] ≤ 2³¹ − 1',
    '0 ≤ k ≤ 10⁵',
  ],
  hint: 'Reverse the whole array, then reverse the first k elements, then reverse the remaining n-k elements. First reduce k = k % n to handle k > n.',
  solutions: [solution],
};
