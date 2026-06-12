import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def singleNonDuplicate(self, nums: List[int]) -> int:
        # logn time and O(1) space means has to be binary search and no extra space
        # we don't know what we are looking for, thus we need a way to identify which half it is in
        # since all elements appear twice except for the target, we know len(nums) is odd
        # return condition: mid != mid + 1 and mid != mid - 1
        # [1,1,2,3,3,4,4,8,8]
        #  l       m       r
        # since we know the side with the answer is odd, we can look at length of both sides without current element
        # if m=m-1, then len(left)=m-1, if len(left)%2==0, then we move l=m+1 else r=m-1
        # if m!=m-1, then len(left)=m

        l,r = 0,len(nums) - 1

        while l <= r:
            mid = (l+r)//2

            # since we are doing mid - 1 and mid + 1 here
            # we need to make sure they are inbound
            # if mid -1 is out of bounds or if nums[mid - 1] != nums[mid], left side check is good
            # if mid + 1 is out of bounds or if nums[mid + 1] != nums[mid], right side check is good
            if (mid - 1 < 0 or nums[mid - 1] != nums[mid]) and (mid + 1 >= len(nums) or nums[mid] != nums[mid + 1]):
                return nums[mid]
            # no answers found yet
            # check which side is odd
            lenLeft = 0
            if nums[mid] == nums[mid - 1]:
                lenLeft = mid - 1
            else:
                lenLeft = mid
            if lenLeft%2==0:
                l=mid+1
            else:
                r=mid-1

        return -1`;

function generateSteps(): Step[] {
  const nums = [1, 1, 2, 3, 3, 4, 4, 8, 8];
  const n = nums.length;
  const steps: Step[] = [];

  const snap = (l: number, r: number, mid: number | null, foundIdx: number | null) =>
    nums.map((v, i) => ({
      value: v,
      state:
        foundIdx !== null && i === foundIdx
          ? ('found' as const)
          : foundIdx !== null
          ? ('eliminated' as const)
          : i === mid
          ? ('active' as const)
          : i >= l && i <= r
          ? ('window' as const)
          : ('eliminated' as const),
    }));

  steps.push({
    explanation: `Find the single non-duplicate in [${nums.join(', ')}] in O(log n). All elements appear exactly twice except one. Key insight: in the left portion before the single element, pairs start at even indices (nums[0]=nums[1], nums[2]=nums[3]…). After the single element, pairs start at odd indices. Binary search on this parity property.`,
    highlightLine: 13,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'nums', value: `[${nums.join(', ')}]` }],
  });

  let l = 0;
  let r = n - 1;

  steps.push({
    explanation: `Initialize l=${l}, r=${r}. Use l ≤ r because we return as soon as we find the single element (not just converging on a boundary).`,
    highlightLine: 13,
    state: {
      type: 'array',
      cells: snap(l, r, null, null),
      pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
    },
    variables: [{ name: 'l', value: l }, { name: 'r', value: r }],
  });

  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    const leftOk = mid - 1 < 0 || nums[mid - 1] !== nums[mid];
    const rightOk = mid + 1 >= n || nums[mid] !== nums[mid + 1];

    steps.push({
      explanation: `l=${l}, r=${r}, mid=${mid}: nums[mid]=${nums[mid]}. Check bounds: left neighbor ${mid - 1 < 0 ? 'OOB' : `nums[${mid - 1}]=${nums[mid - 1]}`} (ok=${leftOk}), right neighbor ${mid + 1 >= n ? 'OOB' : `nums[${mid + 1}]=${nums[mid + 1]}`} (ok=${rightOk}).`,
      highlightLine: 19,
      state: {
        type: 'array',
        cells: snap(l, r, mid, null),
        pointers: [
          { index: l, label: 'l' },
          { index: mid, label: 'mid' },
          { index: r, label: 'r' },
        ],
      },
      variables: [
        { name: 'mid', value: mid },
        { name: 'nums[mid]', value: nums[mid] },
        { name: 'leftOk', value: String(leftOk) },
        { name: 'rightOk', value: String(rightOk) },
      ],
    });

    if (leftOk && rightOk) {
      // Found the single element
      steps.push({
        explanation: `Both neighbors differ from nums[mid]=${nums[mid]} (or are out of bounds). Found the single element! Return ${nums[mid]}.`,
        highlightLine: 20,
        state: {
          type: 'array',
          cells: snap(l, r, null, mid),
          pointers: [{ index: mid, label: 'answer' }],
        },
        variables: [{ name: 'return', value: nums[mid], highlight: true }],
      });
      break;
    }

    // Determine which half to eliminate
    let lenLeft: number;
    if (nums[mid] === nums[mid - 1]) {
      lenLeft = mid - 1;
    } else {
      lenLeft = mid;
    }
    const goRight = lenLeft % 2 === 0;

    steps.push({
      explanation: `Not the single element. ${nums[mid] === nums[mid - 1] ? `nums[mid]=nums[mid-1]=${nums[mid]}, so lenLeft (elements strictly left of the pair) = mid-1 = ${lenLeft}.` : `nums[mid]≠nums[mid-1], so lenLeft = mid = ${lenLeft}.`} lenLeft=${lenLeft} is ${lenLeft % 2 === 0 ? 'even' : 'odd'} → single element is ${goRight ? 'to the RIGHT' : 'to the LEFT'} → ${goRight ? `l = mid+1 = ${mid + 1}` : `r = mid-1 = ${mid - 1}`}.`,
      highlightLine: goRight ? 29 : 31,
      state: {
        type: 'array',
        cells: snap(l, r, mid, null),
        pointers: [
          { index: l, label: 'l' },
          { index: mid, label: 'mid' },
          { index: r, label: 'r' },
        ],
      },
      variables: [
        { name: 'lenLeft', value: lenLeft },
        { name: 'parity', value: lenLeft % 2 === 0 ? 'even → go right' : 'odd → go left' },
        { name: goRight ? 'l →' : 'r →', value: goRight ? mid + 1 : mid - 1, highlight: true },
      ],
    });

    if (goRight) l = mid + 1;
    else r = mid - 1;
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Binary Search on Pair Parity',
  pythonCode: PYTHON_CODE,
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
  hint: 'Before the single element, each pair starts at an even index. After it, pairs start at odd indices. At mid: if nums[mid] differs from both neighbors, it is the single element. Otherwise, compute lenLeft (count of elements strictly left of mid\'s pair) — if even, the single element is to the right; if odd, it\'s to the left.',
  solutions: [solution],
};
