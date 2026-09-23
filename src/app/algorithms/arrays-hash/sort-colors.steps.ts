import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Dutch Flag ────────────────────────────────────────────────────
//
// Traces cse-progress's sortColors_20260816 verbatim: pointers named l, t, r
// (not l, inc, r); `swap(l, r)` takes the two indices in the ORDER CALLED (not
// "left, right"); the loop condition is `while t <= r:`; and t is advanced by
// an UNCONDITIONAL `t += 1` at the end of every iteration — the ==2 branch's
// `t -= 1` right before it is what makes t net-unchanged, not a skipped
// increment. Every iteration (0, 1, or 2) falls through to that same `t += 1`.

function generateDutchFlagSteps(): Step[] {
  const nums = [2, 0, 2, 1, 1, 0];
  const steps: Step[] = [];

  const snap = (l: number, t: number, r: number) =>
    nums.map((v, i) => ({
      value: v,
      state:
        i < l
          ? ('found' as const)
          : i > r
          ? ('eliminated' as const)
          : i === t
          ? ('active' as const)
          : i === l && l !== t
          ? ('min-ptr' as const)
          : i === r && r !== t
          ? ('max-ptr' as const)
          : ('default' as const),
    }));

  const ptrs = (l: number, t: number, r: number) => {
    const ps = [];
    if (l === t && l === r) ps.push({ index: l, label: 'l=t=r' });
    else if (l === t) { ps.push({ index: l, label: 'l=t' }); ps.push({ index: r, label: 'r' }); }
    else if (t === r) { ps.push({ index: l, label: 'l' }); ps.push({ index: t, label: 't=r' }); }
    else { ps.push({ index: l, label: 'l' }); ps.push({ index: t, label: 't' }); ps.push({ index: r, label: 'r' }); }
    return ps;
  };

  let l = 0, t = 0, r = nums.length - 1;

  steps.push({
    explanation:
      'Dutch National Flag: three regions — [0..l) confirmed 0s, (r..n) confirmed 2s, [l..t) confirmed 1s, [t..r] unknown. t scans forward; nums[t]==0 swaps left, nums[t]==2 swaps right, nums[t]==1 falls through. t always advances by 1 at the end of the loop body; the ==2 branch pre-cancels that by decrementing t first.',
    anchor: { match: 'l, t, r = 0, 0, len(nums) - 1' },
    state: {
      type: 'array',
      cells: snap(l, t, r),
      pointers: ptrs(l, t, r),
    },
    variables: [
      { name: 'l', value: l },
      { name: 't', value: t },
      { name: 'r', value: r },
    ],
  });

  while (t <= r) {
    const val = nums[t];

    if (val === 0) {
      [nums[l], nums[t]] = [nums[t], nums[l]];
      const swappedL = l;
      l++;
      const prevT = t;
      t++;
      steps.push({
        explanation: `nums[${prevT}]=0: swap(l,t) swaps l=${swappedL} and t=${prevT}, then l+=1 → ${l}. Falls through to the unconditional t+=1 → ${t}.`,
        anchor: { match: 'if nums[t] == 0:', to: { match: 't+=1' } },
        state: { type: 'array', cells: snap(l, t, r), pointers: ptrs(l, t, r) },
        variables: [
          { name: 'nums[t]', value: 0, highlight: true },
          { name: 'l', value: l, highlight: true },
          { name: 't', value: t },
        ],
      });
    } else if (val === 2) {
      [nums[t], nums[r]] = [nums[r], nums[t]];
      const swappedR = r;
      r--;
      const prevT = t;
      t--;
      t++;
      steps.push({
        explanation: `nums[${prevT}]=2: swap(t,r) swaps t=${prevT} and r=${swappedR}, then r-=1 → ${r}, t-=1 → ${prevT - 1}. Falls through to the unconditional t+=1 → ${t} — net unchanged, so the swapped-in value gets re-inspected.`,
        anchor: { match: 'elif nums[t] == 2:', to: { match: 't+=1' } },
        state: { type: 'array', cells: snap(l, t, r), pointers: ptrs(l, t, r) },
        variables: [
          { name: 'nums[t]', value: 2, highlight: true },
          { name: 'r', value: r, highlight: true },
          { name: 't', value: t },
        ],
      });
    } else {
      const prevT = t;
      t++;
      steps.push({
        explanation: `nums[${prevT}]=1: neither if nor elif matches — falls straight through to the unconditional t+=1 → ${t}. Already in the correct middle region.`,
        anchor: { match: 'while t <= r:', to: { match: 't+=1' } },
        state: { type: 'array', cells: snap(l, t, r), pointers: ptrs(l, t, r) },
        variables: [{ name: 'nums[t]', value: 1 }, { name: 't', value: t }],
      });
    }
  }

  steps.push({
    explanation: `t(${t}) > r(${r}): the while loop's condition fails. All elements sorted into three regions: 0s, 1s, 2s. O(n) time, O(1) space — single pass. The function mutates nums in place and returns nothing.`,
    anchor: { match: 'while t <= r:' },
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
  const original = [2, 0, 2, 1, 1, 0];
  const nums = [...original];
  const steps: Step[] = [];
  const countMap: Record<number, number> = {};

  steps.push({
    explanation:
      'Counting Sort: count how many 0s, 1s, and 2s exist in countMap, then overwrite nums IN PLACE in color order. Two passes, O(n) time, O(1) extra space (only 3 buckets).',
    anchor: { match: 'countMap = {}' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [{ name: 'nums', value: `[${nums.join(', ')}]` }],
  });

  // Count pass
  for (let i = 0; i < original.length; i++) {
    countMap[original[i]] = (countMap[original[i]] ?? 0) + 1;
    steps.push({
      explanation: `Count nums[${i}]=${original[i]}. countMap[${original[i]}] = ${countMap[original[i]]}.`,
      anchor: { match: 'countMap[num] = 1 + countMap.get(num,0)' },
      state: {
        type: 'array',
        cells: original.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...countMap },
      },
      variables: [
        { name: `countMap[${original[i]}]`, value: countMap[original[i]], highlight: true },
      ],
    });
  }

  // Write pass — overwrites nums in place, index by index
  let index = 0;
  for (let color = 0; color < 3; color++) {
    const remaining = countMap[color] ?? 0;
    for (let k = 0; k < remaining; k++) {
      nums[index] = color;
      countMap[color] = (countMap[color] ?? 0) - 1;
      steps.push({
        explanation: `countMap.get(${color}) is truthy → nums[${index}] = ${color}, countMap[${color}] -= 1 → ${countMap[color]}, index += 1.`,
        anchor: {
          match: 'while countMap.get(color):',
          to: { match: 'index+=1' },
        },
        state: {
          type: 'array',
          cells: nums.map((v, j) => ({
            value: v,
            state:
              j < index
                ? ('found' as const)
                : j === index
                ? ('active' as const)
                : ('default' as const),
          })),
          pointers: [{ index, label: 'index' }],
          hashmap: { ...countMap },
        },
        variables: [
          { name: 'color', value: color },
          { name: 'index', value: index, highlight: true },
        ],
      });
      index++;
    }
  }

  steps.push({
    explanation: `Done. nums = [${nums.join(', ')}]. O(n) time — two passes. Works only because values are bounded (0,1,2).`,
    anchor: { match: 'for color in range(3):' },
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

const dutchFlagSolution: SolutionVariant = {
  label: 'Dutch Flag',
  variant: 'dutch-flag',
  generateSteps: generateDutchFlagSteps,
};

const bucketSortSolution: SolutionVariant = {
  label: 'Bucket Sort',
  variant: 'bucket-sort',
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
  hint: 'Dutch National Flag: maintain three regions using l, t, r. Elements before l are 0s, between l and t are 1s, after r are 2s. t scans forward — swap 0s to l, 2s to r. t always advances by 1 at the end of the loop body; on a 2-swap, t -= 1 first, so the net effect is t stays put and the swapped-in value gets re-inspected.',
  solutions: [dutchFlagSolution, bucketSortSolution],
};
