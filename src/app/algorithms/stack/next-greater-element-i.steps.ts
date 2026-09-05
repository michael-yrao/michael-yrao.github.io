import { AlgorithmMeta, SolutionVariant, Step, ArrayCell, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced from cse-progress: dsa/leetcode/stack/496_next_greater_element_i.py
const PYTHON_CODE = `class Solution:
    def nextGreaterElement(self, nums1: List[int], nums2: List[int]) -> List[int]:
        # monotonic stack practice
        # naive solution is to loop through both nums1 and nums2 and look for next greater giving us O(n^2)
        # what we can do instead of find all next greater elements first for nums2
        # we can do this with monotonic decreasing stack and then store as a map {num -> next greater}
        # then just go through nums1 and look for mapped value
        nextGreaterMap = {}
        stack = collections.deque()
        for i in range(len(nums2)):
            # if nums2[i] breaks stack's order
            # it is the next greater element
            while stack and nums2[i] > stack[-1]:
                value = stack.pop()
                nextGreaterMap[value] = nums2[i]
            stack.append(nums2[i])

        result = []

        for n in nums1:
            if n not in nextGreaterMap:
                result.append(-1)
            else:
                result.append(nextGreaterMap[n])

        return result`;

function generateSteps(): Step[] {
  const nums1 = [4, 1, 2];
  const nums2 = [1, 3, 4, 2];
  const steps: Step[] = [];

  const stack: number[] = [];
  const nextGreater: Record<number, number> = {};

  const nums2Cells = (activeIdx: number, poppedVal?: number): ArrayCell[] =>
    nums2.map((v, idx) => {
      let state: ArrayCell['state'] = 'default';
      if (idx < activeIdx) state = 'visited';
      if (idx === activeIdx) state = 'active';
      if (poppedVal !== undefined && v === poppedVal) state = 'found';
      return { value: v, state };
    });

  const mapLabel = 'nextGreaterMap (num→next greater)';

  // ── Intro ──────────────────────────────────────────────────────────────────
  steps.push({
    explanation:
      'For every value in nums2 we want its "next greater element" — the first larger value to its right. Brute force is O(n²). A monotonic decreasing stack does it in one pass: whenever a new value is bigger than the stack top, that new value is the answer for everything it pops. Then nums1 queries are O(1) map lookups.',
    highlightLine: 9,
    state: {
      type: 'array',
      cells: nums2Cells(-1),
      pointers: [],
      arrayLabel: 'nums2 (scan to build the map)',
      stackItems: [],
      hashmap: {},
      hashmapLabel: mapLabel,
    },
    variables: [
      { name: 'nums1', value: '[4, 1, 2]' },
      { name: 'nums2', value: '[1, 3, 4, 2]' },
      { name: 'stack', value: '[]' },
    ],
  });

  // ── Phase 1: build nextGreaterMap by scanning nums2 ────────────────────────
  for (let i = 0; i < nums2.length; i++) {
    const val = nums2[i];

    steps.push({
      explanation: `i=${i}: look at nums2[${i}] = ${val}. Compare it against the top of the stack. While ${val} is greater than the stack top, that top has just found its next greater element.`,
      highlightLine: 11,
      state: {
        type: 'array',
        cells: nums2Cells(i),
        pointers: [{ index: i, label: 'i' }],
        arrayLabel: 'nums2 (scan to build the map)',
        stackItems: [...stack],
        hashmap: { ...nextGreater },
        hashmapLabel: mapLabel,
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: 'nums2[i]', value: val, highlight: true },
        { name: 'stack', value: stack.length ? `[${stack.join(', ')}]` : '[]' },
      ],
    });

    // inner while: pop everything smaller than val — each pop resolves a next-greater
    while (stack.length && val > stack[stack.length - 1]) {
      const popped = stack.pop()!;
      nextGreater[popped] = val;
      steps.push({
        explanation: `${val} > ${popped} (stack top). Pop ${popped} — its next greater element is ${val}. Record nextGreaterMap[${popped}] = ${val}, then keep checking the new top.`,
        highlightLine: 15,
        state: {
          type: 'array',
          cells: nums2Cells(i, popped),
          pointers: [{ index: i, label: 'i' }],
          arrayLabel: 'nums2 (scan to build the map)',
          stackItems: [...stack],
          hashmap: { ...nextGreater },
          hashmapLabel: mapLabel,
        },
        variables: [
          { name: 'value (popped)', value: popped, highlight: true },
          { name: `nextGreaterMap[${popped}]`, value: val, highlight: true },
          { name: 'stack', value: stack.length ? `[${stack.join(', ')}]` : '[]' },
        ],
      });
    }

    stack.push(val);
    steps.push({
      explanation: `Nothing left on the stack is smaller than ${val}. Push ${val}. The stack stays monotonically decreasing bottom→top — each value waits here until a larger one arrives.`,
      highlightLine: 16,
      state: {
        type: 'array',
        cells: nums2Cells(i),
        pointers: [{ index: i, label: 'i' }],
        arrayLabel: 'nums2 (scan to build the map)',
        stackItems: [...stack],
        hashmap: { ...nextGreater },
        hashmapLabel: mapLabel,
      },
      variables: [
        { name: 'pushed', value: val, highlight: true },
        { name: 'stack', value: `[${stack.join(', ')}]` },
      ],
    });
  }

  steps.push({
    explanation: `Scan of nums2 complete. Anything still on the stack ([${stack.join(', ')}]) never found a greater element to its right — those values simply aren't in the map and will default to -1. Final map: ${JSON.stringify(nextGreater)}.`,
    highlightLine: 18,
    state: {
      type: 'array',
      cells: nums2.map((v) => ({ value: v, state: 'visited' as const })),
      pointers: [],
      arrayLabel: 'nums2 (fully scanned)',
      stackItems: [...stack],
      hashmap: { ...nextGreater },
      hashmapLabel: mapLabel,
    },
    variables: [
      { name: 'nextGreaterMap', value: JSON.stringify(nextGreater) },
      { name: 'unresolved', value: stack.length ? `[${stack.join(', ')}] → -1` : 'none' },
    ],
  });

  // ── Phase 2: answer nums1 queries via O(1) map lookups ─────────────────────
  const result: number[] = [];
  for (let i = 0; i < nums1.length; i++) {
    const q = nums1[i];
    const found = q in nextGreater;
    const ans = found ? nextGreater[q] : -1;
    result.push(ans);

    steps.push({
      explanation: found
        ? `Query nums1[${i}] = ${q}. It's in the map: nextGreaterMap[${q}] = ${ans}. Append ${ans}.`
        : `Query nums1[${i}] = ${q}. It isn't in the map — no greater element to its right in nums2. Append -1.`,
      highlightLine: found ? 24 : 22,
      state: {
        type: 'array',
        cells: nums1.map((v, idx) => ({
          value: v,
          state: idx < i ? ('visited' as const) : idx === i ? (found ? ('found' as const) : ('eliminated' as const)) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'n' }],
        arrayLabel: 'nums1 (answer each query)',
        stackItems: [],
        hashmap: { ...nextGreater },
        hashmapLabel: mapLabel,
      },
      variables: [
        { name: 'n', value: q, highlight: true },
        { name: 'nextGreaterMap[n]', value: found ? ans : 'absent', highlight: true },
        { name: 'result', value: `[${result.join(', ')}]` },
      ],
    });
  }

  steps.push({
    explanation: `All nums1 queries answered by O(1) map lookups. Result: [${result.join(', ')}]. Building the map is O(n) — each nums2 value is pushed and popped at most once — and the queries add O(m), for O(n + m) total.`,
    highlightLine: 26,
    state: {
      type: 'array',
      cells: nums1.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      arrayLabel: 'nums1 (done)',
      stackItems: [],
      hashmap: { ...nextGreater },
      hashmapLabel: mapLabel,
      counters: [{ label: 'result', value: `[${result.join(', ')}]` }],
    },
    variables: [
      { name: 'result', value: `[${result.join(', ')}]`, highlight: true },
    ],
  });

  return steps;
}

const monotonicStackSolution: SolutionVariant = {
  label: 'Monotonic Stack',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(n + m)',
  spaceComplexity: 'O(n)',
};

export const nextGreaterElementIMeta: AlgorithmMeta = {
  id: 'next-greater-element-i',
  lcNumber: 496,
  title: 'Next Greater Element I',
  difficulty: 'Easy',
  category: 'stack',
  tags: ['Stack', 'Monotonic Stack', 'Hash Map', 'Array'],
  timeComplexity: 'O(n + m)',
  spaceComplexity: 'O(n)',
  description:
    'You are given two distinct 0-indexed integer arrays nums1 and nums2, where nums1 is a subset of nums2. For each element in nums1, find its next greater element in nums2 — the first element to its right that is greater. If none exists, the answer is -1.',
  examples: [
    {
      input: 'nums1 = [4,1,2], nums2 = [1,3,4,2]',
      output: '[-1,3,-1]',
      explanation: '4 has no greater element to its right; 1 → 3; 2 has none.',
    },
    {
      input: 'nums1 = [2,4], nums2 = [1,2,3,4]',
      output: '[3,-1]',
      explanation: '2 → 3; 4 has no greater element to its right.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums1.length ≤ nums2.length ≤ 1000',
    '0 ≤ nums1[i], nums2[i] ≤ 10⁴',
    'All integers in nums1 and nums2 are unique.',
    'All integers of nums1 also appear in nums2.',
  ],
  hint: 'Precompute the next greater element for every value in nums2 with a monotonic decreasing stack, store value → answer in a map, then answer each nums1 query in O(1).',
  solutions: [monotonicStackSolution],
};
