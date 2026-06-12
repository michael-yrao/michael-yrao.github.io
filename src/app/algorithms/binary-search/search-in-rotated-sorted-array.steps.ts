import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def search(self, nums: List[int], target: int) -> int:
        # if we are looking for logn time, we can't go through the array to find k
        # we should binary search to find k
        # then binary search on the 2 halves
        # k is smallest value, thus we do binary search on smallest value
        # since we are not looking for an exact value, we should do while l < r instead of while l <= r
        # Want exact target index? l <= r
        # Want first/last occurrence or smallest pivot? l < r
        # If one branch keeps mid as possible answer, prefer l < r
        # If both branches exclude mid, use l <= r

        l, r = 0, len(nums) - 1

        while l < r:
            mid = (l + r) // 2
            if nums[mid] > nums[r]:
                l = mid + 1
            else:
                r = mid

        k = l

        # binary search on both halves

        def binarySearch(l, r) -> int:
            while l <= r:
                mid = (l + r) // 2
                if nums[mid] == target:
                    return mid
                elif nums[mid] > target:
                    r = mid - 1
                else:
                    l = mid + 1
            return -1

        result = binarySearch(0, k - 1)
        if result == -1:
            result = binarySearch(k, len(nums) - 1)

        return result`;

function generateSteps(): Step[] {
  const nums = [4, 5, 6, 7, 0, 1, 2];
  const target = 0;
  const steps: Step[] = [];

  const snapPhase1 = (l: number, r: number, mid: number | null) =>
    nums.map((v, i) => ({
      value: v,
      state:
        i === mid
          ? ('active' as const)
          : i >= l && i <= r
          ? ('window' as const)
          : ('eliminated' as const),
    }));

  const snapPhase2 = (lo: number, hi: number, mid: number | null, k: number) =>
    nums.map((v, i) => ({
      value: v,
      state:
        i === mid
          ? ('active' as const)
          : i >= lo && i <= hi
          ? ('window' as const)
          : i === k
          ? ('min-ptr' as const)
          : ('eliminated' as const),
    }));

  steps.push({
    explanation:
      `[${nums.join(',')}] is a sorted array rotated at some pivot. Find target=${target}. Strategy: (1) binary search to find the pivot (index of minimum); (2) binary search the correct half.`,
    highlightLine: 2,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'target', value: target }],
  });

  // Phase 1: find pivot
  let l = 0;
  let r = nums.length - 1;

  steps.push({
    explanation: `Phase 1 — find pivot. Rule: if nums[mid] > nums[r], the min is in the right half (l = mid+1). Otherwise min is at mid or left (r = mid). We use l < r so mid is never r, preventing infinite loops.`,
    highlightLine: 4,
    state: {
      type: 'array',
      cells: snapPhase1(l, r, null),
      pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
    },
    variables: [{ name: 'phase', value: '1 — find pivot' }],
  });

  while (l < r) {
    const mid = Math.floor((l + r) / 2);
    const goRight = nums[mid] > nums[r];

    steps.push({
      explanation: `l=${l}, r=${r}, mid=${mid}: nums[mid]=${nums[mid]} ${goRight ? '>' : '≤'} nums[r]=${nums[r]} → ${goRight ? 'min is right of mid, l = mid+1' : 'min is at mid or left, r = mid'}.`,
      highlightLine: goRight ? 7 : 9,
      state: {
        type: 'array',
        cells: snapPhase1(l, r, mid),
        pointers: [{ index: l, label: 'l' }, { index: mid, label: 'mid' }, { index: r, label: 'r' }],
      },
      variables: [
        { name: 'mid', value: mid },
        { name: 'nums[mid]', value: nums[mid] },
        { name: 'nums[r]', value: nums[r] },
        { name: goRight ? 'l →' : 'r →', value: goRight ? mid + 1 : mid, highlight: true },
      ],
    });

    if (goRight) l = mid + 1;
    else r = mid;
  }

  const k = l;

  steps.push({
    explanation: `Pivot found at k=${k} (nums[k]=${nums[k]}, the minimum). Array has two sorted halves: [0..${k - 1}] = [${nums.slice(0, k).join(',')}] and [${k}..${nums.length - 1}] = [${nums.slice(k).join(',')}].`,
    highlightLine: 10,
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i === k ? ('min-ptr' as const) : i < k ? ('visited' as const) : ('window' as const),
      })),
      pointers: [{ index: k, label: 'k (pivot)' }],
    },
    variables: [{ name: 'k', value: k, highlight: true }, { name: 'nums[k]', value: nums[k] }],
  });

  // Phase 2: binary search left half [0, k-1]
  const bsearch = (lo: number, hi: number, halfLabel: string): number => {
    steps.push({
      explanation: `Phase 2 — binary search ${halfLabel} [${lo}..${hi}] = [${nums.slice(lo, hi + 1).join(',')}] for target=${target}.`,
      highlightLine: 12,
      state: {
        type: 'array',
        cells: snapPhase2(lo, hi, null, k),
        pointers: [{ index: lo, label: 'lo' }, { index: hi, label: 'hi' }],
      },
      variables: [{ name: 'searching', value: halfLabel }],
    });

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      steps.push({
        explanation: `lo=${lo}, hi=${hi}, mid=${mid}: nums[mid]=${nums[mid]} ${nums[mid] === target ? '= target ✓' : nums[mid] > target ? '> target → hi = mid−1' : '< target → lo = mid+1'}.`,
        highlightLine: nums[mid] === target ? 14 : nums[mid] > target ? 15 : 16,
        state: {
          type: 'array',
          cells: snapPhase2(lo, hi, mid, k),
          pointers: [{ index: lo, label: 'lo' }, { index: mid, label: 'mid' }, { index: hi, label: 'hi' }],
        },
        variables: [
          { name: 'mid', value: mid },
          { name: 'nums[mid]', value: nums[mid], highlight: nums[mid] === target },
        ],
      });

      if (nums[mid] === target) return mid;
      else if (nums[mid] > target) hi = mid - 1;
      else lo = mid + 1;
    }
    return -1;
  };

  const r1 = k > 0 ? bsearch(0, k - 1, 'left half') : -1;

  if (r1 !== -1) {
    steps.push({
      explanation: `Found target=${target} at index ${r1}. O(log n) time.`,
      highlightLine: 18,
      state: {
        type: 'array',
        cells: nums.map((v, i) => ({
          value: v,
          state: i === r1 ? ('found' as const) : ('eliminated' as const),
        })),
        pointers: [{ index: r1, label: 'result' }],
      },
      variables: [{ name: 'return', value: r1, highlight: true }],
    });
    return steps;
  }

  steps.push({
    explanation: `target=${target} not in left half. Try right half [${k}..${nums.length - 1}].`,
    highlightLine: 18,
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i < k ? ('eliminated' as const) : ('window' as const),
      })),
      pointers: [],
    },
    variables: [{ name: 'left result', value: -1 }],
  });

  const r2 = bsearch(k, nums.length - 1, 'right half');

  steps.push({
    explanation: r2 !== -1
      ? `Found target=${target} at index ${r2}. O(log n) time.`
      : `target=${target} not found. Return −1.`,
    highlightLine: 18,
    state: {
      type: 'array',
      cells: nums.map((v, i) => ({
        value: v,
        state: i === r2 ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: r2 !== -1 ? [{ index: r2, label: 'result' }] : [],
    },
    variables: [{ name: 'return', value: r2, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Find Pivot + Binary Search',
  pythonCode: PYTHON_CODE,
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
  hint: 'Two-pass O(log n): (1) find the rotation pivot k by binary searching for the minimum — if nums[mid] > nums[r] the min is to the right, otherwise it\'s at mid or left; (2) binary search each sorted half [0..k−1] and [k..n−1] independently.',
  solutions: [solution],
};
