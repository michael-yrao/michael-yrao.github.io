import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def rotate(self, nums: List[int], k: int) -> None:
        # three-reversal trick: reverse all → reverse first k → reverse last (n-k)
        # this repositions every element in O(n) time with O(1) space

        def reverseArray(l, r):
            def swap(l, r):
                temp = nums[l]
                nums[l] = nums[r]
                nums[r] = temp
            while r > l:
                swap(l, r)
                l += 1
                r -= 1
        # rotating by n is the same as no rotation, so reduce k to avoid redundant work
        k = k % len(nums)
        reverseArray(0, len(nums) - 1)
        reverseArray(0, k - 1)
        reverseArray(k, len(nums) - 1)`;

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
    highlightLine: 8,
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
    explanation: `Phase 1: reverse the entire array (indices 0..${n - 1}).`,
    highlightLine: 9,
    state: {
      type: 'array',
      cells: snap(new Set(), new Set(), [0, n - 1]),
      pointers: [{ index: 0, label: 'l' }, { index: n - 1, label: 'r' }],
    },
    variables: [{ name: 'phase', value: 'reverse all' }],
  });

  const reverse = (l: number, r: number, phaseLabel: string, hl: number) => {
    let ll = l, rr = r;
    while (ll < rr) {
      const done: Set<number> = new Set();
      for (let x = l; x < ll; x++) done.add(x);
      for (let x = rr + 1; x <= r; x++) done.add(x);

      steps.push({
        explanation: `${phaseLabel}: swap nums[${ll}]=${nums[ll]} ↔ nums[${rr}]=${nums[rr]}.`,
        highlightLine: hl,
        state: {
          type: 'array',
          cells: snap(new Set([ll, rr]), done, [l, r]),
          pointers: [{ index: ll, label: 'l' }, { index: rr, label: 'r' }],
        },
        variables: [
          { name: 'swap', value: `${nums[ll]} ↔ ${nums[rr]}`, highlight: true },
        ],
      });
      [nums[ll], nums[rr]] = [nums[rr], nums[ll]];
      ll++;
      rr--;
    }
  };

  reverse(0, n - 1, 'Phase 1', 4);

  steps.push({
    explanation: `After phase 1: [${nums.join(',')}]. The whole array is flipped.`,
    highlightLine: 9,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
    },
    variables: [{ name: 'array', value: `[${nums.join(',')}]` }],
  });

  // Phase 2: reverse first k
  steps.push({
    explanation: `Phase 2: reverse first k=${k} elements (indices 0..${k - 1}).`,
    highlightLine: 10,
    state: {
      type: 'array',
      cells: snap(new Set(), new Set(), [0, k - 1]),
      pointers: [{ index: 0, label: 'l' }, { index: k - 1, label: 'r' }],
    },
    variables: [{ name: 'phase', value: `reverse [0..${k - 1}]` }],
  });

  reverse(0, k - 1, 'Phase 2', 4);

  steps.push({
    explanation: `After phase 2: [${nums.join(',')}]. First ${k} elements are now in rotated order.`,
    highlightLine: 10,
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
    explanation: `Phase 3: reverse last n-k=${n - k} elements (indices ${k}..${n - 1}).`,
    highlightLine: 11,
    state: {
      type: 'array',
      cells: snap(new Set(), new Set([...Array(k).keys()]), [k, n - 1]),
      pointers: [{ index: k, label: 'l' }, { index: n - 1, label: 'r' }],
    },
    variables: [{ name: 'phase', value: `reverse [${k}..${n - 1}]` }],
  });

  reverse(k, n - 1, 'Phase 3', 4);

  steps.push({
    explanation: `Done. [${nums.join(',')}] = rotate([${original.join(',')}], k=${k}). Three reversals: O(n) time, O(1) space.`,
    highlightLine: 11,
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
  pythonCode: PYTHON_CODE,
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
