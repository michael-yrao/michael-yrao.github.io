import { AlgorithmMeta, SolutionVariant, Step, StepAnchor, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's singleNonDuplicate_20260610 verbatim. This is a genuine min-boundary
// binary search (l < r, converge, return nums[l] AFTER the loop) — NOT an exact-match search
// with an in-loop early return. Each iteration: m = (l+r)//2, then if m is odd, shift it down
// by 1 (m-=1) so m always lands on what WOULD be the first index of an intact pair; then
// compare nums[m] to nums[m+1] — if they still match, the pair is intact and the single
// element is strictly right of it (l = m+2, skipping the whole pair); otherwise the pair is
// broken and the single element is at m or to its left (r = m).

function generateSteps(): Step[] {
  const nums = [1, 1, 2, 3, 3, 4, 4, 8, 8];
  const steps: Step[] = [];

  const snap = (l: number, r: number, m: number | null, foundIdx: number | null) =>
    nums.map((v, i) => ({
      value: v,
      state:
        foundIdx !== null && i === foundIdx
          ? ('found' as const)
          : foundIdx !== null
          ? ('eliminated' as const)
          : i === m
          ? ('active' as const)
          : i >= l && i <= r
          ? ('window' as const)
          : ('eliminated' as const),
    }));

  function emit(explanation: string, anchor: StepAnchor, l: number, r: number, m: number | null, vars: { name: string; value: string | number; highlight?: boolean }[]): void {
    steps.push({
      explanation,
      anchor,
      state: {
        type: 'array',
        cells: snap(l, r, m, null),
        pointers:
          m !== null
            ? [{ index: l, label: 'l' }, { index: m, label: 'm' }, { index: r, label: 'r' }]
            : [{ index: l, label: 'l' }, { index: r, label: 'r' }],
      },
      variables: vars,
    });
  }

  steps.push({
    explanation: `Find the single non-duplicate in [${nums.join(', ')}] in O(log n). All elements appear exactly twice except one. Before the single element, an intact pair's first index is always even (nums[0]=nums[1], nums[2]=nums[3]…); after it, pairs shift to start on odd indices. Min-boundary binary search on that parity break — no exact-match early return.`,
    anchor: { match: 'def singleNonDuplicate_20260610(self, nums: List[int]) -> int:' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'nums', value: `[${nums.join(', ')}]` }],
  });

  let l = 0;
  let r = nums.length - 1;

  emit(
    `Initialize l=${l}, r=${r}. Use l < r (min boundary) — the answer is returned as nums[l] only after the loop converges, not from inside it.`,
    { match: 'l, r = 0, len(nums) - 1' },
    l,
    r,
    null,
    [{ name: 'l', value: l }, { name: 'r', value: r }],
  );

  while (l < r) {
    let m = Math.floor((l + r) / 2);
    const rawM = m;

    emit(
      `l=${l}, r=${r}: m = (l+r)//2 = ${m}.`,
      { match: 'm = (l+r)//2' },
      l,
      r,
      m,
      [{ name: 'm', value: m }],
    );

    const needsShift = m % 2 === 1;
    if (needsShift) m -= 1;

    emit(
      needsShift
        ? `m=${rawM} is odd → shift m down by 1 so it always lands on what would be an intact pair's first index → m=${m}.`
        : `m=${rawM} is already even → no shift needed, m stays ${m}.`,
      needsShift
        ? { match: 'if m % 2 == 1:', to: { match: 'm-=1' } }
        : { match: 'if m % 2 == 1:' },
      l,
      r,
      m,
      [{ name: 'm', value: m, highlight: needsShift }],
    );

    const pairIntact = nums[m] === nums[m + 1];

    if (pairIntact) {
      l = m + 2;
      emit(
        `nums[m]=${nums[m]} == nums[m+1]=${nums[m + 1]} → this pair is still intact, so the single element is strictly right of it. l = m + 2 = ${l}.`,
        // Skips nth=1's comment '# so we set l = m + 2' above the if — nth=2 is the real line.
        { match: 'if nums[m] == nums[m+1]:', to: { match: 'l = m + 2', nth: 2 } },
        l,
        r,
        null,
        [{ name: 'l', value: l, highlight: true }, { name: 'r', value: r }],
      );
    } else {
      r = m;
      emit(
        `nums[m]=${nums[m]} != nums[m+1]=${nums[m + 1]} → this pair is broken, so the single element is at m or to its left. r = m = ${r}.`,
        { match: 'r = m' },
        l,
        r,
        null,
        [{ name: 'l', value: l }, { name: 'r', value: r, highlight: true }],
      );
    }
  }

  steps.push({
    explanation: `l === r === ${l}: loop converged. Return nums[${l}] = ${nums[l]}.`,
    anchor: { match: 'return nums[l]' },
    state: {
      type: 'array',
      cells: snap(l, r, null, l),
      pointers: [{ index: l, label: 'answer' }],
    },
    variables: [{ name: 'return', value: nums[l], highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Binary Search on Pair Parity',
  variant: 'pair-parity',
  generateSteps,
};

export const singleElementSortedArrayMeta: AlgorithmMeta = {
  id: 'single-element-in-sorted-array',
  lcNumber: 540,
  title: 'Single Element in a Sorted Array',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Array', 'Binary Search'],
  timeComplexity: 'O(log n)',
  spaceComplexity: 'O(1)',
  description:
    'You are given a sorted array where every element appears exactly twice, except for one element which appears exactly once. Find that single element. Your solution must run in O(log n) time and O(1) space.',
  examples: [
    {
      input: 'nums = [1,1,2,3,3,4,4,8,8]',
      output: '2',
    },
    {
      input: 'nums = [3,3,7,7,10,11,11]',
      output: '10',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 10⁵',
    '0 ≤ nums[i] ≤ 10⁵',
    'nums is sorted.',
  ],
  hint: 'Min-boundary binary search: m = (l+r)//2, then if m is odd shift it down by 1 so m always lands on what would be an intact pair\'s first index. Compare nums[m] to nums[m+1] — equal means the pair is intact and the single element is strictly right of it (l = m+2); unequal means the pair is broken and the single element is at m or to its left (r = m). Converges to l === r; return nums[l].',
  solutions: [solution],
};
