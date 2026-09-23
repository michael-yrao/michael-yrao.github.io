import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's containsNearbyDuplicate_20260704 verbatim: the set is named
// windowSet (not `seen`), and the shrink condition is `r - l > k` (no abs — r never
// trails l, so the plain difference already works).

function generateSlidingWindowSteps(): Step[] {
  const nums = [1, 2, 1, 3, 2];
  const k = 2;
  const steps: Step[] = [];
  const windowSet = new Set<number>();
  let l = 0;

  steps.push({
    explanation: `Sliding window: l = r = 0, windowSet = set(). Advance r; if r − l > k the window is too wide, so evict nums[l] and slide l forward. Check for a duplicate before adding nums[r] to windowSet.`,
    anchor: { match: 'l = r = 0', to: { match: 'windowSet = set()' } },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [{ index: 0, label: 'l=r' }],
      hashmap: {},
    },
    variables: [{ name: 'k', value: k }, { name: 'windowSet', value: '{}' }],
  });

  for (let r = 0; r < nums.length; r++) {
    if (r - l > k) {
      steps.push({
        explanation: `r(${r}) − l(${l}) = ${r - l} > k=${k}: window too wide. windowSet.remove(nums[l=${l}]=${nums[l]}), then l += 1.`,
        anchor: { match: 'while r - l > k:', to: { match: 'l+=1' } },
        state: {
          type: 'array',
          cells: nums.map((v, j) => ({
            value: v,
            state:
              j === l
                ? ('eliminated' as const)
                : j >= l && j <= r
                ? ('window' as const)
                : j < l
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
          hashmap: Object.fromEntries([...windowSet].map(v => [v, 1])),
        },
        variables: [
          { name: 'evict', value: nums[l], highlight: true },
          { name: 'l', value: l + 1 },
        ],
      });
      windowSet.delete(nums[l]);
      l++;
    }

    if (windowSet.has(nums[r])) {
      steps.push({
        explanation: `nums[r=${r}]=${nums[r]} already in windowSet {${[...windowSet].join(',')}}. Duplicate within k=${k}! Return True.`,
        anchor: { match: 'if nums[r] in windowSet:', to: { match: 'return True', nth: 2 } }, // 2nd hit: the actual return (the 1st is the leading comment "# if so, we return True")
        state: {
          type: 'array',
          cells: nums.map((v, j) => ({
            value: v,
            state:
              j === r
                ? ('found' as const)
                : j >= l && j < r && nums[j] === nums[r]
                ? ('found' as const)
                : j >= l && j < r
                ? ('window' as const)
                : j < l
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
          hashmap: Object.fromEntries([...windowSet].map(v => [v, 1])),
        },
        variables: [
          { name: 'nums[r]', value: nums[r], highlight: true },
          { name: 'in windowSet', value: 'True' },
          { name: 'return', value: 'True' },
        ],
      });
      return steps;
    }

    windowSet.add(nums[r]);
    steps.push({
      explanation: `r=${r}, nums[r]=${nums[r]} not in windowSet. windowSet.add(nums[r]). windowSet = {${[...windowSet].join(',')}}.`,
      anchor: { match: 'windowSet.add(nums[r])', to: { match: 'r+=1' } },
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state:
            j === r
              ? ('active' as const)
              : j >= l && j < r
              ? ('window' as const)
              : j < l
              ? ('visited' as const)
              : ('default' as const),
        })),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        hashmap: Object.fromEntries([...windowSet].map(v => [v, 1])),
      },
      variables: [
        { name: 'nums[r]', value: nums[r] },
        { name: 'windowSet', value: `{${[...windowSet].join(',')}}`, highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `r reached len(nums) — loop exits. No duplicate within distance k=${k}. Return False.`,
    anchor: { match: 'return False' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
      hashmap: Object.fromEntries([...windowSet].map(v => [v, 1])),
    },
    variables: [{ name: 'return', value: 'False', highlight: true }],
  });

  return steps;
}

const slidingWindowSolution: SolutionVariant = {
  label: 'Sliding Window Set',
  variant: 'window-set',
  generateSteps: generateSlidingWindowSteps,
};

export const containsDuplicateIIMeta: AlgorithmMeta = {
  id: 'contains-duplicate-ii',
  lcNumber: 219,
  title: 'Contains Duplicate II',
  difficulty: 'Easy',
  category: 'sliding-window',
  tags: ['Array', 'Hash Map', 'Sliding Window'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(min(n,k))',
  description:
    'Given an integer array nums and an integer k, return true if there are two distinct indices i and j in the array such that nums[i] == nums[j] and |i - j| <= k.',
  examples: [
    {
      input: 'nums = [1,2,3,1], k = 3',
      output: 'true',
      explanation: 'nums[0] == nums[3] and |0 - 3| = 3 ≤ 3.',
    },
    {
      input: 'nums = [1,0,1,1], k = 1',
      output: 'true',
    },
    {
      input: 'nums = [1,2,3,1,2,3], k = 2',
      output: 'false',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 10⁵',
    '-10⁹ ≤ nums[i] ≤ 10⁹',
    '0 ≤ k ≤ 10⁵',
  ],
  hint: 'Maintain a set of at most k elements — a sliding window. Evict the leftmost element once the window exceeds size k, then check for a duplicate before adding the new value.',
  solutions: [slidingWindowSolution],
};
