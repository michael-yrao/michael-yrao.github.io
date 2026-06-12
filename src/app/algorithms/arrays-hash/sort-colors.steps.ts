import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const DUTCH_FLAG_CODE = `class Solution:
    def sortColors(self, nums: List[int]) -> None:
        # Dutch National Flag: maintain three regions in a single pass
        # l = boundary of confirmed 0s, r = boundary of confirmed 2s, inc = current element
        #   if nums[inc] == 0: swap with l, advance both l and inc (0 region grows left)
        #   if nums[inc] == 1: just advance inc (already in the correct middle region)
        #   if nums[inc] == 2: swap with r, shrink r (don't advance inc — must re-inspect swapped value)
        def swap(l, r):
            temp = nums[l]
            nums[l] = nums[r]
            nums[r] = temp

        l, inc, r = 0, 0, len(nums) - 1
        while inc < len(nums):
            if nums[inc] == 0:
                swap(l, inc)
                l += 1
            elif nums[inc] == 2:
                swap(r, inc)
                r -= 1
                # the value swapped in from r is unknown — decrement inc so the next inc += 1 re-visits it
                inc -= 1
            inc += 1`;

const BUCKET_SORT_CODE = `class Solution:
    def sortColors(self, nums: List[int]) -> None:
        # counting sort works here because values are bounded to {0, 1, 2}
        # count occurrences of each color, then overwrite the array in color order
        bucket = {}
        for num in nums:
            bucket[num] = 1 + bucket.get(num, 0)
        counter = 0
        for i in range(3):
            while bucket.get(i):
                nums[counter] = i
                bucket[i] = -1 + bucket.get(i, 0)
                counter += 1`;

function generateDutchFlagSteps(): Step[] {
  const nums = [2, 0, 2, 1, 1, 0];
  const steps: Step[] = [];

  const snap = (l: number, inc: number, r: number) =>
    nums.map((v, i) => ({
      value: v,
      state:
        i < l
          ? ('found' as const)
          : i > r
          ? ('eliminated' as const)
          : i === inc
          ? ('active' as const)
          : i === l && l !== inc
          ? ('min-ptr' as const)
          : i === r && r !== inc
          ? ('max-ptr' as const)
          : ('default' as const),
    }));

  const ptrs = (l: number, inc: number, r: number) => {
    const ps = [];
    if (l === inc && l === r) ps.push({ index: l, label: 'l=inc=r' });
    else if (l === inc) { ps.push({ index: l, label: 'l=inc' }); ps.push({ index: r, label: 'r' }); }
    else if (inc === r) { ps.push({ index: l, label: 'l' }); ps.push({ index: inc, label: 'inc=r' }); }
    else { ps.push({ index: l, label: 'l' }); ps.push({ index: inc, label: 'inc' }); ps.push({ index: r, label: 'r' }); }
    return ps;
  };

  let l = 0, inc = 0, r = nums.length - 1;

  steps.push({
    explanation:
      'Dutch National Flag: three regions — [0..l) are confirmed 0s (green), (r..n) are confirmed 2s (red), [l..inc) are confirmed 1s (middle), [inc..r] are unknown. inc scans forward; we place 0s left and 2s right.',
    highlightLine: 3,
    state: {
      type: 'array',
      cells: snap(l, inc, r),
      pointers: ptrs(l, inc, r),
    },
    variables: [
      { name: 'l', value: l },
      { name: 'inc', value: inc },
      { name: 'r', value: r },
    ],
  });

  while (inc <= r) {
    const val = nums[inc];

    if (val === 0) {
      steps.push({
        explanation: `nums[${inc}]=0: swap with l=${l}. Grow the 0-region left boundary, advance both l and inc.`,
        highlightLine: 5,
        state: { type: 'array', cells: snap(l, inc, r), pointers: ptrs(l, inc, r) },
        variables: [{ name: 'nums[inc]', value: 0, highlight: true }, { name: 'action', value: 'swap(l,inc), l++, inc++' }],
      });
      [nums[l], nums[inc]] = [nums[inc], nums[l]];
      l++; inc++;
      steps.push({
        explanation: `After swap: nums[${l - 1}]=${nums[l - 1]} locked as 0. l=${l}, inc=${inc}.`,
        highlightLine: 8,
        state: { type: 'array', cells: snap(l, inc, r), pointers: ptrs(l, inc, r) },
        variables: [{ name: 'l', value: l, highlight: true }, { name: 'inc', value: inc }],
      });
    } else if (val === 2) {
      steps.push({
        explanation: `nums[${inc}]=2: swap with r=${r}. Shrink the 2-region. Do NOT advance inc — must re-check the swapped value.`,
        highlightLine: 10,
        state: { type: 'array', cells: snap(l, inc, r), pointers: ptrs(l, inc, r) },
        variables: [{ name: 'nums[inc]', value: 2, highlight: true }, { name: 'action', value: 'swap(r,inc), r--' }],
      });
      [nums[r], nums[inc]] = [nums[inc], nums[r]];
      r--;
      steps.push({
        explanation: `After swap: nums[${r + 1}]=${nums[r + 1]} locked as 2. r=${r}. inc stays at ${inc} to recheck.`,
        highlightLine: 12,
        state: { type: 'array', cells: snap(l, inc, r), pointers: ptrs(l, inc, r) },
        variables: [{ name: 'r', value: r, highlight: true }, { name: 'inc', value: inc }],
      });
    } else {
      steps.push({
        explanation: `nums[${inc}]=1: already in the middle region. Just advance inc.`,
        highlightLine: 14,
        state: { type: 'array', cells: snap(l, inc, r), pointers: ptrs(l, inc, r) },
        variables: [{ name: 'nums[inc]', value: 1 }, { name: 'action', value: 'inc++' }],
      });
      inc++;
    }
  }

  steps.push({
    explanation: `inc(${inc}) > r(${r}): done. All elements sorted into three regions: 0s, 1s, 2s. O(n) time, O(1) space — single pass.`,
    highlightLine: 4,
    state: {
      type: 'array',
      cells: nums.map(v => ({
        value: v,
        state: v === 0 ? ('found' as const) : v === 2 ? ('eliminated' as const) : ('visited' as const),
      })),
      pointers: [],
    },
    variables: [{ name: 'result', value: `[${nums.join(', ')}]`, highlight: true }],
  });

  return steps;
}

function generateBucketSortSteps(): Step[] {
  const nums = [2, 0, 2, 1, 1, 0];
  const steps: Step[] = [];
  const bucket: Record<number, number> = {};

  steps.push({
    explanation:
      'Bucket / Counting Sort: count how many 0s, 1s, and 2s exist, then overwrite the array in order. Two passes, O(n) time, O(1) extra space (only 3 buckets).',
    highlightLine: 3,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [{ name: 'nums', value: `[${nums.join(', ')}]` }],
  });

  // Count pass
  for (let i = 0; i < nums.length; i++) {
    bucket[nums[i]] = (bucket[nums[i]] ?? 0) + 1;
    steps.push({
      explanation: `Count nums[${i}]=${nums[i]}. bucket[${nums[i]}] = ${bucket[nums[i]]}.`,
      highlightLine: 5,
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...bucket },
      },
      variables: [
        { name: `bucket[${nums[i]}]`, value: bucket[nums[i]], highlight: true },
      ],
    });
  }

  // Write pass
  const result = [...nums];
  let counter = 0;
  for (let color = 0; color < 3; color++) {
    const cnt = bucket[color] ?? 0;
    for (let k = 0; k < cnt; k++) {
      result[counter] = color;
      steps.push({
        explanation: `Write color ${color} at index ${counter}. ${cnt - k - 1} more ${color}(s) to write.`,
        highlightLine: 9,
        state: {
          type: 'array',
          cells: result.map((v, j) => ({
            value: v,
            state:
              j < counter
                ? ('found' as const)
                : j === counter
                ? ('active' as const)
                : j > counter && j <= counter + (cnt - k - 1) - 1
                ? ('default' as const)
                : ('default' as const),
          })),
          pointers: [{ index: counter, label: 'counter' }],
          hashmap: { ...bucket },
        },
        variables: [
          { name: 'color', value: color },
          { name: 'counter', value: counter, highlight: true },
        ],
      });
      counter++;
    }
  }

  steps.push({
    explanation: `Done. [${result.join(', ')}]. O(n) time — two passes. Works only because values are bounded (0,1,2).`,
    highlightLine: 10,
    state: {
      type: 'array',
      cells: result.map(v => ({
        value: v,
        state: v === 0 ? ('found' as const) : v === 2 ? ('eliminated' as const) : ('visited' as const),
      })),
      pointers: [],
    },
    variables: [{ name: 'result', value: `[${result.join(', ')}]`, highlight: true }],
  });

  return steps;
}

const dutchFlagSolution: SolutionVariant = {
  label: 'Dutch Flag',
  pythonCode: DUTCH_FLAG_CODE,
  generateSteps: generateDutchFlagSteps,
};

const bucketSortSolution: SolutionVariant = {
  label: 'Bucket Sort',
  pythonCode: BUCKET_SORT_CODE,
  generateSteps: generateBucketSortSteps,
};

export const sortColorsMeta: AlgorithmMeta = {
  id: 'sort-colors',
  lcNumber: 75,
  title: 'Sort Colors',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Two Pointers', 'Dutch Flag'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an array nums with n objects colored red, white, or blue (represented as 0, 1, and 2), sort them in-place so that objects of the same color are adjacent, with the colors in the order red, white, and blue. You must solve this without using the built-in sort function.',
  examples: [
    { input: 'nums = [2,0,2,1,1,0]', output: '[0,0,1,1,2,2]' },
    { input: 'nums = [2,0,1]', output: '[0,1,2]' },
  ] as ProblemExample[],
  constraints: [
    'n == nums.length',
    '1 ≤ n ≤ 300',
    'nums[i] is either 0, 1, or 2.',
  ],
  hint: 'Dutch National Flag: maintain three regions using l, inc, r. Elements before l are 0s, between l and inc are 1s, after r are 2s. inc scans forward — swap 0s to l, 2s to r. When swapping with r, do not advance inc (the incoming element needs inspection).',
  solutions: [dutchFlagSolution, bucketSortSolution],
};
