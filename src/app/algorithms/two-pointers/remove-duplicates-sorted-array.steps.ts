import { AlgorithmMeta, SolutionVariant, Step, StepAnchor, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's removeDuplicates_20260805 verbatim: l is the write cursor, r is the
// read cursor; index 0 is always valid so both start at 1. There is no separate counter — the
// function returns l itself, since l always sits one past the last confirmed-unique slot.

function generateSteps(): Step[] {
  const nums = [1, 1, 2, 3, 3];
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

  function emit(explanation: string, anchor: StepAnchor, l: number, r: number, highlightL = false): void {
    steps.push({
      explanation,
      anchor,
      state: {
        type: 'array',
        cells: snap(l, r),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
      },
      variables: [
        { name: 'l', value: l, highlight: highlightL },
        { name: 'r', value: r },
      ],
    });
  }

  steps.push({
    explanation:
      'Two-pointer in-place dedup: l marks the next write slot, r scans forward. Index 0 is always valid, so both start at 1. Write nums[r] to nums[l] only when it differs from nums[l-1].',
    anchor: { match: 'l = r = 1' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'nums', value: `[${nums.join(', ')}]` }],
  });

  let l = 1;
  let r = 1;

  while (r < nums.length) {
    const differs = nums[r] !== nums[l - 1];

    steps.push({
      explanation: `r=${r}: nums[r]=${nums[r]} vs nums[l-1]=${nums[l - 1]} → ${differs ? 'different — write & advance l' : 'duplicate — skip'}.`,
      anchor: { match: 'if nums[r] != nums[l-1]:' },
      state: {
        type: 'array',
        cells: snap(l, r),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
      },
      variables: [
        { name: 'l', value: l },
        { name: 'r', value: r },
        { name: 'differs', value: String(differs), highlight: true },
      ],
    });

    if (differs) {
      nums[l] = nums[r];
      l++;
      emit(
        `Wrote ${nums[l - 1]} at l=${l - 1}. Advance l to ${l}.`,
        { match: 'nums[l] = nums[r]', to: { match: 'l+=1' } },
        l,
        r,
        true,
      );
    }

    r++;
  }

  steps.push({
    explanation: `Done. First ${l} elements are the unique sorted values. Return ${l}. O(n) time, O(1) space.`,
    anchor: { match: 'return l' },
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

export const removeDuplicatesSortedArrayMeta: AlgorithmMeta = {
  id: 'remove-dup-from-sorted-array',
  lcNumber: 26,
  title: 'Remove Duplicates from Sorted Array',
  difficulty: 'Easy',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array nums sorted in non-decreasing order, remove the duplicates in-place such that each unique element appears only once. Return k, the number of unique elements.',
  examples: [
    {
      input: 'nums = [1,1,2]',
      output: '2, nums = [1,2,_]',
      explanation: 'Two unique values; first two elements become [1,2].',
    },
    {
      input: 'nums = [0,0,1,1,1,2,2,3,3,4]',
      output: '5, nums = [0,1,2,3,4,_,_,_,_,_]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 3 × 10⁴',
    '-100 ≤ nums[i] ≤ 100',
    'nums is sorted in non-decreasing order.',
  ],
  hint: 'left is the write cursor; right is the read cursor. Both start at 1 (index 0 is always valid). Write nums[right] to nums[left] only when it differs from nums[left−1], then advance left. Always advance right.',
  solutions: [solution],
};
