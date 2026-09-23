import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's removeDuplicates_20260627 verbatim: an early return when
// len(nums) < 3 (skipped on this example — length 6), then the same l/r two-pointer pattern
// as Remove Duplicates I but comparing against nums[l-2] and starting both pointers at 2.

function generateSteps(): Step[] {
  const nums = [1, 1, 1, 2, 2, 3];
  const steps: Step[] = [];

  const snap = (l: number, r: number) =>
    nums.map((v, i) => ({
      value: v,
      state:
        i < l
          ? ('found' as const)
          : i === l
          ? ('active' as const)
          : i === r && r !== l
          ? ('min-ptr' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation:
      `Guard clause: if len(nums) < 3, the first ≤2 elements are trivially valid — return len(nums) directly. nums has ${nums.length} elements, so ${nums.length} < 3 is false: the guard does not fire, and we fall through to the two-pointer scan.`,
    anchor: { match: 'if len(nums) < 3:' },
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i < 2 ? ('found' as const) : ('default' as const),
      })),
      pointers: [],
    },
    variables: [{ name: 'nums', value: `[${nums.join(', ')}]` }],
  });

  steps.push({
    explanation:
      'Same two-pointer pattern as Remove Duplicates I, but allow at most 2 copies. The first 2 elements are always valid, so l = r = 2. The invariant: nums[r] is OK to keep if it differs from nums[l-2] — that ensures we never write a 3rd copy of any value.',
    anchor: { match: 'l = r = 2' },
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i < 2 ? ('found' as const) : ('default' as const),
      })),
      pointers: [],
    },
    variables: [{ name: 'l', value: 2 }, { name: 'r', value: 2 }],
  });

  let l = 2;
  let r = 2;

  while (r < nums.length) {
    const keep = nums[r] !== nums[l - 2];

    steps.push({
      explanation: `r=${r}: nums[r]=${nums[r]} vs nums[l-2]=nums[${l - 2}]=${nums[l - 2]} → ${keep ? 'different — keep (≤2 copies so far)' : '3rd copy — skip'}.`,
      anchor: { match: 'if nums[r] != nums[l-2]:' },
      state: {
        type: 'array',
        cells: snap(l, r),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
      },
      variables: [
        { name: 'l', value: l },
        { name: 'r', value: r },
        { name: 'nums[r]', value: nums[r] },
        { name: 'nums[l-2]', value: nums[l - 2] },
        { name: 'keep', value: String(keep), highlight: true },
      ],
    });

    if (keep) {
      nums[l] = nums[r];
      l++;
      steps.push({
        explanation: `Wrote ${nums[l - 1]} at l=${l - 1}. Advance l to ${l}.`,
        anchor: { match: 'nums[l] = nums[r]', to: { match: 'l+=1' } },
        state: {
          type: 'array',
          cells: snap(l, r),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        },
        variables: [
          { name: 'l', value: l, highlight: true },
          { name: 'r', value: r },
        ],
      });
    }

    r++;
  }

  steps.push({
    explanation: `Done. First ${l} elements allow at most 2 duplicates. Return ${l}. Same O(n)/O(1) as part I — only the comparison window shifts from [l-1] to [l-2].`,
    // nth: 2 — the 1st "return l" hit is the guard clause's "return len(nums)" (line 128);
    // this is the actual final "return l" (line 145).
    anchor: { match: 'return l', nth: 2 },
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i < l ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
    },
    variables: [{ name: 'return', value: l, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointers',
  variant: 'two-pointers',
  generateSteps,
};

export const removeDuplicatesSortedArrayIIMeta: AlgorithmMeta = {
  id: 'remove-dup-sorted-array-ii',
  lcNumber: 80,
  title: 'Remove Duplicates from Sorted Array II',
  difficulty: 'Medium',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array nums sorted in non-decreasing order, remove some duplicates in-place such that each unique element appears at most twice. Return k, the number of elements in the modified prefix.',
  examples: [
    {
      input: 'nums = [1,1,1,2,2,3]',
      output: '5, nums = [1,1,2,2,3,_]',
      explanation: 'Each value appears at most twice.',
    },
    {
      input: 'nums = [0,0,1,1,1,1,2,3,3]',
      output: '7, nums = [0,0,1,1,2,3,3,_,_]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 3 × 10⁴',
    '-10⁴ ≤ nums[i] ≤ 10⁴',
    'nums is sorted in non-decreasing order.',
  ],
  hint: 'Generalisation of Remove Duplicates I: compare nums[r] with nums[l−2] instead of nums[l−1]. If they\'re equal, nums[r] would be a 3rd copy — skip it. First 2 elements are always valid so start both pointers at index 2.',
  solutions: [solution],
};
