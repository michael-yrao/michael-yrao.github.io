import { AlgorithmMeta, SolutionVariant, Step, ArrayState, CellState, Pointer, ProblemExample } from '../../core/models/algorithm.model';
import { arrayState } from '../../core/steps';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's nextGreaterElement_20260919 verbatim: nextGreaterMap,
// decreasingStack, priorNode (not stack/nextGreater/value); loop var is `num`
// in BOTH loops (over nums2, then over nums1). The nums1-query check is
// `if num in nextGreaterMap: append(mapped) else: append(-1)` — the FOUND
// branch is checked FIRST, not the not-found branch first.

function generateSteps(): Step[] {
  const nums1 = [4, 1, 2];
  const nums2 = [1, 3, 4, 2];
  const steps: Step[] = [];

  const decreasingStack: number[] = [];
  const nextGreaterMap: Record<number, number> = {};

  const nums2Cell = (activeIdx: number, poppedVal?: number) => (idx: number, v: number): CellState => {
    if (v === poppedVal) return 'found';
    if (idx === activeIdx) return 'active';
    return idx < activeIdx ? 'visited' : 'default';
  };

  const mapLabel = 'nextGreaterMap (num→next greater)';
  const nums2Label = 'nums2 (scan to build the map)';

  const mapState = (
    values: number[],
    arrayLabel: string,
    cellState: (idx: number, v: number) => CellState,
    pointers: Pointer[],
    stackItems: number[],
    counters?: ArrayState['counters'],
  ): ArrayState =>
    arrayState(values, { cellState, pointers, arrayLabel, stackItems, hashmap: { ...nextGreaterMap }, hashmapLabel: mapLabel, counters });

  // ── Intro ──────────────────────────────────────────────────────────────────
  steps.push({
    explanation:
      'For every value in nums2 we want its "next greater element" — the first larger value to its right. Brute force is O(n²). A monotonic decreasing stack does it in one pass: whenever a new value is bigger than the stack top, that new value is the answer for everything it pops. Then nums1 queries are O(1) map lookups.',
    anchor: { match: 'nextGreaterMap = {}', to: { match: 'decreasingStack = []' } },
    state: mapState(nums2, nums2Label, nums2Cell(-1), [], []),
    variables: [
      { name: 'nums1', value: '[4, 1, 2]' },
      { name: 'nums2', value: '[1, 3, 4, 2]' },
      { name: 'decreasingStack', value: '[]' },
    ],
  });

  // ── Phase 1: build nextGreaterMap by scanning nums2 ────────────────────────
  for (let i = 0; i < nums2.length; i++) {
    const num = nums2[i];

    steps.push({
      explanation: `Look at nums2[${i}] = ${num}. Compare it against the top of decreasingStack. While ${num} is greater than the stack top, that top has just found its next greater element.`,
      anchor: { match: 'for num in nums2:' },
      state: mapState(nums2, nums2Label, nums2Cell(i), [{ index: i, label: 'i' }], [...decreasingStack]),
      variables: [
        { name: 'num', value: num, highlight: true },
        { name: 'decreasingStack', value: decreasingStack.length ? `[${decreasingStack.join(', ')}]` : '[]' },
      ],
    });

    // inner while: pop everything smaller than num — each pop resolves a next-greater
    while (decreasingStack.length && num > decreasingStack[decreasingStack.length - 1]) {
      const priorNode = decreasingStack.pop()!;
      nextGreaterMap[priorNode] = num;
      steps.push({
        explanation: `${num} > ${priorNode} (stack top). priorNode = decreasingStack.pop() = ${priorNode} — its next greater element is ${num}. Record nextGreaterMap[${priorNode}] = ${num}, then keep checking the new top.`,
        anchor: {
          match: 'while decreasingStack and num > decreasingStack[-1]:',
          to: { match: 'nextGreaterMap[priorNode] = num' },
        },
        state: mapState(nums2, nums2Label, nums2Cell(i, priorNode), [{ index: i, label: 'i' }], [...decreasingStack]),
        variables: [
          { name: 'priorNode (popped)', value: priorNode, highlight: true },
          { name: `nextGreaterMap[${priorNode}]`, value: num, highlight: true },
          { name: 'decreasingStack', value: decreasingStack.length ? `[${decreasingStack.join(', ')}]` : '[]' },
        ],
      });
    }

    decreasingStack.push(num);
    steps.push({
      explanation: `Nothing left on decreasingStack is smaller than ${num}. decreasingStack.append(${num}). The stack stays monotonically decreasing bottom→top — each value waits here until a larger one arrives.`,
      anchor: { match: 'decreasingStack.append(num)' },
      state: mapState(nums2, nums2Label, nums2Cell(i), [{ index: i, label: 'i' }], [...decreasingStack]),
      variables: [
        { name: 'pushed', value: num, highlight: true },
        { name: 'decreasingStack', value: `[${decreasingStack.join(', ')}]` },
      ],
    });
  }

  steps.push({
    explanation: `Scan of nums2 complete. Anything still on decreasingStack ([${decreasingStack.join(', ')}]) never found a greater element to its right — those values simply aren't in the map and will default to -1. Final map: ${JSON.stringify(nextGreaterMap)}.`,
    anchor: { match: 'result = []' },
    state: mapState(nums2, 'nums2 (fully scanned)', () => 'visited', [], [...decreasingStack]),
    variables: [
      { name: 'nextGreaterMap', value: JSON.stringify(nextGreaterMap) },
      { name: 'unresolved', value: decreasingStack.length ? `[${decreasingStack.join(', ')}] → -1` : 'none' },
    ],
  });

  // ── Phase 2: answer nums1 queries via O(1) map lookups ─────────────────────
  // `if num in nextGreaterMap: append(mapped) else: append(-1)` — found branch first.
  const result: number[] = [];
  for (let i = 0; i < nums1.length; i++) {
    const num = nums1[i];
    const found = num in nextGreaterMap;
    const ans = found ? nextGreaterMap[num] : -1;
    result.push(ans);

    steps.push({
      explanation: found
        ? `Query nums1[${i}] = ${num}. num in nextGreaterMap → append(nextGreaterMap[${num}]) = ${ans}.`
        : `Query nums1[${i}] = ${num}. num NOT in nextGreaterMap → append(-1).`,
      anchor: found
        ? { match: 'if num in nextGreaterMap:', to: { match: 'result.append(nextGreaterMap[num])' } }
        : { match: 'if num in nextGreaterMap:', to: { match: 'result.append(-1)' } },
      state: mapState(
        nums1,
        'nums1 (answer each query)',
        (idx) => (idx < i ? 'visited' : idx === i ? (found ? 'found' : 'eliminated') : 'default'),
        [{ index: i, label: 'num' }],
        [],
      ),
      variables: [
        { name: 'num', value: num, highlight: true },
        { name: 'nextGreaterMap[num]', value: found ? ans : 'absent', highlight: true },
        { name: 'result', value: `[${result.join(', ')}]` },
      ],
    });
  }

  steps.push({
    explanation: `All nums1 queries answered by O(1) map lookups. Result: [${result.join(', ')}]. Building the map is O(n) — each nums2 value is pushed and popped at most once — and the queries add O(m), for O(n + m) total.`,
    anchor: { match: 'return result' },
    state: mapState(nums1, 'nums1 (done)', () => 'found', [], [], [{ label: 'result', value: `[${result.join(', ')}]` }]),
    variables: [
      { name: 'result', value: `[${result.join(', ')}]`, highlight: true },
    ],
  });

  return steps;
}

const monotonicStackSolution: SolutionVariant = {
  label: 'Monotonic Stack',
  variant: 'monotonic-stack',
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
