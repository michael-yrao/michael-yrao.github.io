import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Iterative ─────────────────────────────────────────────────────

const ITERATIVE_CODE = `class Solution:
    # loop method
    def loopSearch(self, nums: List[int], target: int) -> int:
        l, r = 0, len(nums)-1

        while l <= r:
            # l + (r - l) // 2 avoids integer overflow for very large indices (same value as (l+r)//2 otherwise)
            mid = l + (r - l) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] > target:
                r = mid - 1
            else:
                l = mid + 1

        return -1`;

function generateIterativeSteps(): Step[] {
  const nums = [-1, 0, 3, 5, 9, 12];
  const target = 9;
  const steps: Step[] = [];

  let l = 0;
  let r = nums.length - 1;

  const makeState = (l: number, r: number, mid: number | null) => ({
    type: 'array' as const,
    cells: nums.map((v, i) => ({
      value: v,
      state:
        i < l || i > r
          ? ('eliminated' as const)
          : mid !== null && i === mid
          ? ('active' as const)
          : ('default' as const),
    })),
    pointers: [
      { index: l, label: 'L' },
      { index: r, label: 'R' },
      ...(mid !== null ? [{ index: mid, label: 'mid' }] : []),
    ],
  });

  steps.push({
    explanation: `Array is sorted. L=0, R=${r}. Binary search cuts the search space in half each step — O(log n) instead of O(n). We can do this because sorted order gives us direction.`,
    highlightLine: 6,
    state: makeState(l, r, null),
    variables: [
      { name: 'l', value: l },
      { name: 'r', value: r },
      { name: 'target', value: target },
    ],
  });

  while (l <= r) {
    const mid = l + Math.floor((r - l) / 2);

    steps.push({
      explanation: `mid = L + (R−L)//2 = ${l} + (${r}−${l})//2 = ${mid}. nums[mid] = ${nums[mid]}. We use L+(R−L)//2 instead of (L+R)//2 to avoid integer overflow with large indices.`,
      highlightLine: 13,
      state: makeState(l, r, mid),
      variables: [
        { name: 'l', value: l },
        { name: 'r', value: r },
        { name: 'mid', value: mid, highlight: true },
        { name: 'nums[mid]', value: nums[mid], highlight: true },
        { name: 'target', value: target },
      ],
    });

    if (nums[mid] === target) {
      steps.push({
        explanation: `nums[${mid}] = ${nums[mid]} equals target ${target}. Found! Return ${mid}. We cut the search space from ${nums.length} to 1 in just ${steps.length} steps.`,
        highlightLine: 14,
        state: {
          type: 'array',
          cells: nums.map((v, i) => ({
            value: v,
            state: i === mid ? ('found' as const) : i < l || i > r ? ('eliminated' as const) : ('default' as const),
          })),
          pointers: [{ index: mid, label: 'FOUND' }],
        },
        variables: [
          { name: 'mid', value: mid },
          { name: 'nums[mid]', value: nums[mid] },
          { name: 'target', value: target },
          { name: 'result', value: mid, highlight: true },
        ],
      });
      break;
    }

    if (nums[mid] > target) {
      steps.push({
        explanation: `nums[${mid}]=${nums[mid]} > target ${target}. Everything at index ≥ ${mid} is ≥ ${nums[mid]} — all too large. Move R to mid−1=${mid - 1}. Eliminated ${r - mid + 1} element(s).`,
        highlightLine: 16,
        state: makeState(l, mid - 1, mid),
        variables: [
          { name: 'l', value: l },
          { name: 'r', value: mid - 1, highlight: true },
          { name: 'mid', value: mid },
          { name: 'nums[mid]', value: nums[mid] },
          { name: 'target', value: target },
        ],
      });
      r = mid - 1;
    } else {
      steps.push({
        explanation: `nums[${mid}]=${nums[mid]} < target ${target}. Everything at index ≤ ${mid} is ≤ ${nums[mid]} — all too small. Move L to mid+1=${mid + 1}. Eliminated ${mid - l + 1} element(s).`,
        highlightLine: 14,
        state: makeState(mid + 1, r, mid),
        variables: [
          { name: 'l', value: mid + 1, highlight: true },
          { name: 'r', value: r },
          { name: 'mid', value: mid },
          { name: 'nums[mid]', value: nums[mid] },
          { name: 'target', value: target },
        ],
      });
      l = mid + 1;
    }
  }

  return steps;
}

// ── Solution 2: Recursive ─────────────────────────────────────────────────────

const RECURSIVE_CODE = `class Solution:
    # recursion method
    def recursiveSearch(self, nums: List[int], target: int) -> int:
        def search(l,r):
            if l > r:
                return -1
            m = l + (r - l) // 2

            if nums[m] == target:
                return m
            if nums[m] > target:
                return search(l,m-1)
            return search(m+1,r)

        return search(0, len(nums)-1)`;

function generateRecursiveSteps(): Step[] {
  const nums = [-1, 0, 3, 5, 9, 12];
  const target = 9;
  const steps: Step[] = [];

  const makeState = (l: number, r: number, mid: number | null, depth: number, foundAt: number | null = null) => ({
    type: 'array' as const,
    cells: nums.map((v, i) => ({
      value: v,
      state:
        foundAt !== null && i === foundAt
          ? ('found' as const)
          : i < l || i > r
          ? ('eliminated' as const)
          : mid !== null && i === mid
          ? ('active' as const)
          : ('default' as const),
    })),
    pointers: [
      { index: l, label: 'l' },
      { index: r, label: 'r' },
      ...(mid !== null ? [{ index: mid, label: 'm' }] : []),
    ],
    counters: [{ label: 'call stack depth', value: depth }],
  });

  steps.push({
    explanation: `Same halving idea as the loop, but expressed with recursion: search(l, r) inspects the middle, then CALLS ITSELF on whichever half can still contain the target. The base case l > r means the window is empty → not found (return −1). We kick it off with search(0, ${nums.length - 1}).`,
    highlightLine: 15,
    state: makeState(0, nums.length - 1, null, 0),
    variables: [{ name: 'target', value: target }],
  });

  let depth = 0;
  function search(l: number, r: number): number {
    depth++;
    if (l > r) {
      steps.push({
        explanation: `search(${l}, ${r}): l > r, the window is empty. Base case → return −1 (target not present).`,
        highlightLine: 5,
        state: makeState(l, r, null, depth),
        variables: [{ name: 'l', value: l }, { name: 'r', value: r }, { name: 'return', value: -1, highlight: true }],
      });
      depth--;
      return -1;
    }
    const m = l + Math.floor((r - l) / 2);
    if (nums[m] === target) {
      steps.push({
        explanation: `search(${l}, ${r}): m = ${m}, nums[${m}] = ${nums[m]} == target ${target}. Found! Return ${m} straight up the call stack.`,
        highlightLine: 10,
        state: makeState(l, r, m, depth, m),
        variables: [{ name: 'l', value: l }, { name: 'r', value: r }, { name: 'm', value: m, highlight: true }, { name: 'nums[m]', value: nums[m] }, { name: 'return', value: m, highlight: true }],
      });
      depth--;
      return m;
    }
    if (nums[m] > target) {
      steps.push({
        explanation: `search(${l}, ${r}): m = ${m}, nums[${m}] = ${nums[m]} > target ${target}. The target must be in the LEFT half. Recurse: search(${l}, ${m - 1}). Call stack grows to depth ${depth + 1}.`,
        highlightLine: 12,
        state: makeState(l, r, m, depth),
        variables: [{ name: 'l', value: l }, { name: 'r', value: r }, { name: 'm', value: m }, { name: 'nums[m]', value: nums[m], highlight: true }],
      });
      const res = search(l, m - 1);
      depth--;
      return res;
    }
    steps.push({
      explanation: `search(${l}, ${r}): m = ${m}, nums[${m}] = ${nums[m]} < target ${target}. The target must be in the RIGHT half. Recurse: search(${m + 1}, ${r}). Call stack grows to depth ${depth + 1}.`,
      highlightLine: 13,
      state: makeState(l, r, m, depth),
      variables: [{ name: 'l', value: l }, { name: 'r', value: r }, { name: 'm', value: m }, { name: 'nums[m]', value: nums[m], highlight: true }],
    });
    const res = search(m + 1, r);
    depth--;
    return res;
  }

  const answer = search(0, nums.length - 1);
  steps.push({
    explanation: `The found index ${answer} bubbles back through every pending recursive call unchanged. Final answer: ${answer}. Same O(log n) work as the loop, but O(log n) stack space instead of O(1).`,
    highlightLine: 15,
    state: makeState(answer, answer, answer, 0, answer),
    variables: [{ name: 'result', value: answer, highlight: true }],
  });

  return steps;
}

// ── Export ────────────────────────────────────────────────────────────────────

export const binarySearchMeta: AlgorithmMeta = {
  id: 'binary-search',
  lcNumber: 704,
  title: 'Binary Search',
  difficulty: 'Easy',
  category: 'binary-search',
  tags: ['Binary Search', 'Array'],
  timeComplexity: 'O(log n)',
  spaceComplexity: 'O(1)',
  description:
    'Given a sorted array of integers nums and an integer target, return the index of target if it exists, or -1 if it does not. You must write an algorithm with O(log n) runtime — no linear scan allowed.',
  examples: [
    {
      input: 'nums = [-1, 0, 3, 5, 9, 12],  target = 9',
      output: '4',
      explanation: '9 exists in nums at index 4',
    },
    {
      input: 'nums = [-1, 0, 3, 5, 9, 12],  target = 2',
      output: '-1',
      explanation: '2 does not exist in nums',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 10⁴',
    '-10⁴ < nums[i], target < 10⁴',
    'All integers in nums are unique',
    'nums is sorted in ascending order',
  ],
  hint: 'The array is sorted. If the middle element is too big, where can the target possibly be? If it\'s too small, where can it be?',
  solutions: [
    { label: 'Iterative', pythonCode: ITERATIVE_CODE, generateSteps: generateIterativeSteps },
    { label: 'Recursive', pythonCode: RECURSIVE_CODE, generateSteps: generateRecursiveSteps },
  ],
};
