import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def containsNearbyDuplicate(self, nums: List[int], k: int) -> bool:
        seen = {}
        for i, num in enumerate(nums):
            if num in seen and i - seen[num] <= k:
                return True
            seen[num] = i
        return False`;

const SLIDING_WINDOW_CODE = `class Solution:
    def containsNearbyDuplicate(self, nums: List[int], k: int) -> bool:
        window = set()
        l = 0
        for r in range(len(nums)):
            if r - l > k:
                window.remove(nums[l])
                l += 1
            if nums[r] in window:
                return True
            window.add(nums[r])
        return False`;

function generateHashMapSteps(): Step[] {
  const nums = [1, 2, 1, 3, 2];
  const k = 2;
  const steps: Step[] = [];
  const seen: Record<number, number> = {};

  steps.push({
    explanation: `Check if any two equal elements are within k=${k} indices of each other. HashMap approach: store the most recent index of each value. When we revisit a value, check if the gap is ≤ k.`,
    highlightLine: 2,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [{ name: 'k', value: k }],
  });

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i];

    if (num in seen) {
      const gap = i - seen[num];
      if (gap <= k) {
        steps.push({
          explanation: `i=${i}, nums[${i}]=${num}: found in seen at index ${seen[num]}. Gap = ${i} − ${seen[num]} = ${gap} ≤ k=${k}. Return true!`,
          highlightLine: 4,
          state: {
            type: 'array',
            cells: nums.map((v, j) => ({
              value: v,
              state:
                j === i
                  ? ('found' as const)
                  : j === seen[num]
                  ? ('found' as const)
                  : j < i
                  ? ('visited' as const)
                  : ('default' as const),
            })),
            pointers: [{ index: i, label: 'i' }, { index: seen[num], label: 'prev' }],
            hashmap: { ...seen },
          },
          variables: [
            { name: 'num', value: num, highlight: true },
            { name: 'seen[num]', value: seen[num] },
            { name: 'gap', value: gap, highlight: true },
            { name: 'return', value: 'true' },
          ],
        });
        return steps;
      } else {
        steps.push({
          explanation: `i=${i}, nums[${i}]=${num}: found in seen at index ${seen[num]}. Gap = ${gap} > k=${k} — too far apart. Update seen[${num}] to ${i}.`,
          highlightLine: 4,
          state: {
            type: 'array',
            cells: nums.map((v, j) => ({
              value: v,
              state:
                j === i
                  ? ('active' as const)
                  : j === seen[num]
                  ? ('eliminated' as const)
                  : j < i
                  ? ('visited' as const)
                  : ('default' as const),
            })),
            pointers: [{ index: i, label: 'i' }],
            hashmap: { ...seen },
          },
          variables: [
            { name: 'num', value: num },
            { name: 'gap', value: gap },
            { name: 'action', value: `update seen[${num}] → ${i}` },
          ],
        });
        seen[num] = i;
      }
    } else {
      seen[num] = i;
      steps.push({
        explanation: `i=${i}, nums[${i}]=${num}: not in seen yet. Store seen[${num}] = ${i}.`,
        highlightLine: 6,
        state: {
          type: 'array',
          cells: nums.map((v, j) => ({
            value: v,
            state:
              j === i
                ? ('active' as const)
                : j < i
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [{ index: i, label: 'i' }],
          hashmap: { ...seen },
        },
        variables: [
          { name: 'num', value: num },
          { name: `seen[${num}]`, value: i, highlight: true },
        ],
      });
    }
  }

  steps.push({
    explanation: `Scanned all ${nums.length} elements. No duplicate pair within distance k=${k} found. Return false.`,
    highlightLine: 7,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
      hashmap: { ...seen },
    },
    variables: [{ name: 'return', value: 'false', highlight: true }],
  });

  return steps;
}

function generateSlidingWindowSteps(): Step[] {
  const nums = [1, 2, 1, 3, 2];
  const k = 2;
  const steps: Step[] = [];
  const window = new Set<number>();
  let l = 0;

  steps.push({
    explanation: `Sliding window approach: maintain a set of values within a window of size k. Advance r; if r − l > k, evict nums[l] and slide l forward. Check for duplicates before adding.`,
    highlightLine: 3,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [{ index: 0, label: 'l=r' }],
      hashmap: {},
    },
    variables: [{ name: 'k', value: k }, { name: 'window', value: '{}' }],
  });

  for (let r = 0; r < nums.length; r++) {
    if (r - l > k) {
      steps.push({
        explanation: `r(${r}) − l(${l}) = ${r - l} > k=${k}: window too wide. Remove nums[l=${l}]=${nums[l]} from window, advance l.`,
        highlightLine: 5,
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
          hashmap: Object.fromEntries([...window].map(v => [v, 1])),
        },
        variables: [
          { name: 'evict', value: nums[l], highlight: true },
          { name: 'l', value: l + 1 },
        ],
      });
      window.delete(nums[l]);
      l++;
    }

    if (window.has(nums[r])) {
      steps.push({
        explanation: `nums[r=${r}]=${nums[r]} already in window [${[...window].join(',')}]. Duplicate within k=${k}! Return true.`,
        highlightLine: 7,
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
          hashmap: Object.fromEntries([...window].map(v => [v, 1])),
        },
        variables: [
          { name: 'nums[r]', value: nums[r], highlight: true },
          { name: 'in window', value: 'true' },
          { name: 'return', value: 'true' },
        ],
      });
      return steps;
    }

    window.add(nums[r]);
    steps.push({
      explanation: `r=${r}, nums[r]=${nums[r]} not in window. Add it. Window = {${[...window].join(',')}}.`,
      highlightLine: 9,
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
        hashmap: Object.fromEntries([...window].map(v => [v, 1])),
      },
      variables: [
        { name: 'nums[r]', value: nums[r] },
        { name: 'window', value: `{${[...window].join(',')}}`, highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `All elements scanned. No duplicate within distance k=${k}. Return false.`,
    highlightLine: 10,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
      hashmap: Object.fromEntries([...window].map(v => [v, 1])),
    },
    variables: [{ name: 'return', value: 'false', highlight: true }],
  });

  return steps;
}

const hashMapSolution: SolutionVariant = {
  label: 'HashMap',
  pythonCode: PYTHON_CODE,
  generateSteps: generateHashMapSteps,
};

const slidingWindowSolution: SolutionVariant = {
  label: 'Sliding Window Set',
  pythonCode: SLIDING_WINDOW_CODE,
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
  hint: 'HashMap: store the most recent index of each number. When a repeat is found, check if the index gap ≤ k. Sliding window: maintain a set of at most k elements; evict the leftmost before checking for a duplicate on the right.',
  solutions: [hashMapSolution, slidingWindowSolution],
};
