import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's search_20260824 verbatim: Phase 1 finds rotationIndex via a
// min-boundary binary search (`while l < r`: nums[m] > nums[r] → l = m+1, else r = m). Phase 2
// defines a nested binarySearch(l, r) — its params SHADOW phase 1's l/r, a fresh scope — and
// always calls it on the left half FIRST (firstHalfSearch = binarySearch(0, rotationIndex-1)),
// unconditionally, even when rotationIndex is 0 (that call just returns -1 immediately since
// l > r right away); only if that's -1 does it search the right half.

function generateSteps(): Step[] {
  const nums = [4, 5, 6, 7, 0, 1, 2];
  const target = 0;
  const steps: Step[] = [];

  const snapPhase1 = (l: number, r: number, m: number | null) =>
    nums.map((v, i) => ({
      value: v,
      state: (i === m ? 'active' : i >= l && i <= r ? 'window' : 'eliminated') as 'active' | 'window' | 'eliminated',
    }));

  const snapPhase2 = (lo: number, hi: number, m: number | null, rotationIndex: number) =>
    nums.map((v, i) => ({
      value: v,
      state: (i === m
        ? 'active'
        : i >= lo && i <= hi
        ? 'window'
        : i === rotationIndex
        ? 'min-ptr'
        : 'eliminated') as 'active' | 'window' | 'min-ptr' | 'eliminated',
    }));

  steps.push({
    explanation: `[${nums.join(',')}] is a sorted array rotated at some pivot. Find target=${target}. l, r = 0, len(nums)-1. Phase 1: min-boundary binary search for rotationIndex. Phase 2: binarySearch() the left half, then the right half if needed.`,
    anchor: { match: 'l, r = 0, len(nums) - 1', to: { match: 'while l < r:' } },
    state: { type: 'array', cells: nums.map((v) => ({ value: v, state: 'default' as const })), pointers: [] },
    variables: [{ name: 'target', value: target }],
  });

  // ── Phase 1: find rotationIndex ──────────────────────────────────────────
  let l = 0;
  let r = nums.length - 1;

  while (l < r) {
    const m = Math.floor((l + r) / 2);

    steps.push({
      explanation: `while l < r (${l}<${r}): m = (l+r)//2 = ${m}. nums[m]=${nums[m]}.`,
      anchor: { match: 'while l < r:', to: { match: 'm = (l + r) // 2' } },
      state: {
        type: 'array',
        cells: snapPhase1(l, r, m),
        pointers: [{ index: l, label: 'l' }, { index: m, label: 'm' }, { index: r, label: 'r' }],
      },
      variables: [{ name: 'l', value: l }, { name: 'r', value: r }, { name: 'm', value: m, highlight: true }],
    });

    const goRight = nums[m] > nums[r];

    if (goRight) {
      steps.push({
        explanation: `nums[m]=${nums[m]} > nums[r]=${nums[r]} → l = m+1 = ${m + 1}.`,
        // nth 1: phase 1's own 'l = m + 1'; hit 2 is binarySearch()'s else-branch 'l = m + 1'.
        anchor: { match: 'if nums[m] > nums[r]:', to: { match: 'l = m + 1', nth: 1 } },
        state: {
          type: 'array',
          cells: snapPhase1(l, r, m),
          pointers: [{ index: l, label: 'l' }, { index: m, label: 'm' }, { index: r, label: 'r' }],
        },
        variables: [{ name: 'nums[m]', value: nums[m] }, { name: 'nums[r]', value: nums[r] }, { name: 'l', value: m + 1, highlight: true }],
      });
      l = m + 1;
    } else {
      steps.push({
        explanation: `nums[m]=${nums[m]} ≤ nums[r]=${nums[r]} → the if doesn't fire, else: r = m = ${m}.`,
        // nth 1/1: phase 1's own 'else:' and its own 'r = m'; hit 2 of each belongs to
        // binarySearch()'s elif-branch 'r = m - 1' ('r = m' is a substring of that too).
        anchor: { match: 'else:', nth: 1, to: { match: 'r = m', nth: 1 } },
        state: {
          type: 'array',
          cells: snapPhase1(l, r, m),
          pointers: [{ index: l, label: 'l' }, { index: m, label: 'm' }, { index: r, label: 'r' }],
        },
        variables: [{ name: 'nums[m]', value: nums[m] }, { name: 'nums[r]', value: nums[r] }, { name: 'r', value: m, highlight: true }],
      });
      r = m;
    }
  }

  const rotationIndex = l;

  steps.push({
    explanation: `rotationIndex = l = ${rotationIndex} (nums[rotationIndex]=${nums[rotationIndex]}, the minimum). Two sorted halves: [0..${rotationIndex - 1}] = [${nums.slice(0, rotationIndex).join(',')}] and [${rotationIndex}..${nums.length - 1}] = [${nums.slice(rotationIndex).join(',')}].`,
    anchor: { match: 'rotationIndex = l' },
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i === rotationIndex ? ('min-ptr' as const) : i < rotationIndex ? ('visited' as const) : ('window' as const),
      })),
      pointers: [{ index: rotationIndex, label: 'rotationIndex' }],
    },
    variables: [{ name: 'rotationIndex', value: rotationIndex, highlight: true }],
  });

  steps.push({
    explanation: `def binarySearch(l, r): a plain exact-target binary search (its l, r are fresh parameters — a new scope, not phase 1's). firstHalfSearch = binarySearch(0, rotationIndex-1) is called FIRST, unconditionally — even if the left half is empty.`,
    anchor: { match: 'def binarySearch(l,r):', to: { match: 'firstHalfSearch = binarySearch(0, rotationIndex-1)' } },
    state: {
      type: 'array',
      cells: snapPhase2(0, rotationIndex - 1, null, rotationIndex),
      pointers: [],
    },
    variables: [{ name: 'searching', value: `binarySearch(0, ${rotationIndex - 1})` }],
  });

  // ── Phase 2: the nested binarySearch(l, r), traced with lo/hi to avoid shadowing our own l/r ──
  const bsearch = (lo: number, hi: number): number => {
    while (lo <= hi) {
      const m = Math.floor((lo + hi) / 2);

      steps.push({
        explanation: `while l <= r (${lo}<=${hi}): m = (l+r)//2 = ${m}. nums[m]=${nums[m]}.`,
        anchor: { match: 'while l <= r:', to: { match: 'm = (l+r)//2' } },
        state: {
          type: 'array',
          cells: snapPhase2(lo, hi, m, rotationIndex),
          pointers: [{ index: lo, label: 'l' }, { index: m, label: 'm' }, { index: hi, label: 'r' }],
        },
        variables: [{ name: 'l', value: lo }, { name: 'r', value: hi }, { name: 'm', value: m, highlight: true }],
      });

      if (nums[m] === target) {
        steps.push({
          explanation: `nums[m]=${nums[m]} == target=${target} → return m = ${m}.`,
          anchor: { match: 'if nums[m] == target:', to: { match: 'return m' } },
          state: {
            type: 'array',
            cells: nums.map((v, i) => ({ value: v, state: i === m ? ('found' as const) : ('eliminated' as const) })),
            pointers: [{ index: m, label: 'result' }],
          },
          variables: [{ name: 'nums[m]', value: nums[m], highlight: true }, { name: 'return', value: m, highlight: true }],
        });
        return m;
      }

      if (nums[m] > target) {
        steps.push({
          explanation: `nums[m]=${nums[m]} > target=${target} → elif fires: r = m-1 = ${m - 1}.`,
          anchor: { match: 'elif nums[m] > target:', to: { match: 'r = m - 1' } },
          state: {
            type: 'array',
            cells: snapPhase2(lo, hi, m, rotationIndex),
            pointers: [{ index: lo, label: 'l' }, { index: m, label: 'm' }, { index: hi, label: 'r' }],
          },
          variables: [{ name: 'nums[m]', value: nums[m] }, { name: 'r', value: m - 1, highlight: true }],
        });
        hi = m - 1;
      } else {
        steps.push({
          explanation: `nums[m]=${nums[m]} < target=${target}, not >, not == → else: l = m+1 = ${m + 1}.`,
          // nth 2/2: hit 1 of each is phase 1's own 'else:'/'l = m + 1' above; this is
          // binarySearch()'s else-branch.
          anchor: { match: 'else:', nth: 2, to: { match: 'l = m + 1', nth: 2 } },
          state: {
            type: 'array',
            cells: snapPhase2(lo, hi, m, rotationIndex),
            pointers: [{ index: lo, label: 'l' }, { index: m, label: 'm' }, { index: hi, label: 'r' }],
          },
          variables: [{ name: 'nums[m]', value: nums[m] }, { name: 'l', value: m + 1, highlight: true }],
        });
        lo = m + 1;
      }
    }

    steps.push({
      explanation: `l > r: this half is exhausted without a match. return -1.`,
      anchor: { match: 'return -1' },
      state: { type: 'array', cells: nums.map((v) => ({ value: v, state: 'eliminated' as const })), pointers: [] },
      variables: [{ name: 'return', value: -1, highlight: true }],
    });
    return -1;
  };

  const firstHalfSearch = bsearch(0, rotationIndex - 1);

  steps.push({
    explanation: `firstHalfSearch = ${firstHalfSearch}. if firstHalfSearch == -1: ${firstHalfSearch === -1 ? 'true — search the right half next.' : 'false — return firstHalfSearch directly.'}`,
    anchor: { match: 'if firstHalfSearch == -1:' },
    state: { type: 'array', cells: nums.map((v) => ({ value: v, state: 'default' as const })), pointers: [] },
    variables: [{ name: 'firstHalfSearch', value: firstHalfSearch, highlight: true }],
  });

  if (firstHalfSearch === -1) {
    const rightResult = bsearch(rotationIndex, nums.length - 1);
    steps.push({
      explanation: `return binarySearch(rotationIndex, len(nums)-1) = ${rightResult}.`,
      anchor: { match: 'return binarySearch(rotationIndex, len(nums)-1)' },
      state: {
        type: 'array',
        cells: nums.map((v, i) => ({ value: v, state: i === rightResult ? ('found' as const) : ('eliminated' as const) })),
        pointers: rightResult !== -1 ? [{ index: rightResult, label: 'result' }] : [],
      },
      variables: [{ name: 'return', value: rightResult, highlight: true }],
    });
  } else {
    steps.push({
      explanation: `else: return firstHalfSearch = ${firstHalfSearch}.`,
      anchor: { match: 'return firstHalfSearch' },
      state: {
        type: 'array',
        cells: nums.map((v, i) => ({ value: v, state: i === firstHalfSearch ? ('found' as const) : ('eliminated' as const) })),
        pointers: [{ index: firstHalfSearch, label: 'result' }],
      },
      variables: [{ name: 'return', value: firstHalfSearch, highlight: true }],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Find Pivot + Binary Search',
  variant: 'pivot-then-search',
  generateSteps,
};

export const searchInRotatedSortedArrayMeta: AlgorithmMeta = {
  id: 'search-in-rotated-sorted-array',
  lcNumber: 33,
  title: 'Search in Rotated Sorted Array',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Array', 'Binary Search'],
  timeComplexity: 'O(log n)',
  spaceComplexity: 'O(1)',
  description:
    'Given the integer array nums sorted in ascending order and then possibly rotated at an unknown pivot, and an integer target, return the index of target if it is in nums, or -1 if it is not.',
  examples: [
    {
      input: 'nums = [4,5,6,7,0,1,2], target = 0',
      output: '4',
    },
    {
      input: 'nums = [4,5,6,7,0,1,2], target = 3',
      output: '-1',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 5000',
    '-10⁴ ≤ nums[i] ≤ 10⁴',
    'All values of nums are unique.',
    'nums is an ascending array that is possibly rotated.',
    '-10⁴ ≤ target ≤ 10⁴',
  ],
  hint: 'Two-pass O(log n): (1) find the rotation index by binary searching for the minimum — if nums[mid] > nums[r] the min is to the right, otherwise it\'s at mid or left; (2) binary search the left half first, then the right half if the target wasn\'t there.',
  solutions: [solution],
};
