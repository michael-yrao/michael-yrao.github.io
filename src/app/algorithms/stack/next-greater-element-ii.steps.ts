// Traces cse-progress's nextGreaterElements_20260731 verbatim: the "unset" sentinel is
// -math.inf (NOT -1) throughout the whole 2n-pass main loop, and stays -inf for any index
// the loop never resolves. Only a SEPARATE post-loop pass (for i in range(len(greater)))
// converts any leftover -inf entries to -1. Names: actualIndex, currentNumber, prevNode,
// greater (not currentNumberIndex/priorNumberIndex/result — those never appear in the code).
import { AlgorithmMeta, SolutionVariant, Step, StepAnchor, ArrayCell, ProblemExample } from '../../core/models/algorithm.model';

const NUMS = [1, 2, 3, 4, 3];
const UNSET = -Infinity;

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const n = NUMS.length;
  const greater: number[] = new Array(n).fill(UNSET);
  const stack: number[] = []; // indices

  const cells = (curIdx: number): ArrayCell[] =>
    NUMS.map((v, i) => ({
      value: v,
      state:
        i === curIdx ? 'active' : stack.includes(i) ? 'window' : greater[i] !== UNSET ? 'found' : 'default',
    }));

  const stackItems = (): (string | number)[] => stack.map((i) => `i${i}(${NUMS[i]})`);

  const fmt = (v: number): string => (v === UNSET ? '−∞' : String(v));
  const greaterStr = () => `[${greater.map(fmt).join(', ')}]`;

  function emit(explanation: string, anchor: StepAnchor, curIdx: number, extraVars: { name: string; value: string | number; highlight?: boolean }[]): void {
    steps.push({
      explanation,
      anchor,
      state: {
        type: 'array',
        cells: cells(curIdx),
        pointers: curIdx >= 0 ? [{ index: curIdx, label: 'actualIndex' }] : [],
        stackItems: stackItems(),
        counters: [{ label: 'greater', value: greaterStr() }],
      },
      variables: extraVars,
    });
  }

  emit(
    'Next greater element in a CIRCULAR array. Trick: iterate i from 0 to 2·n − 1 and use actualIndex = i % len(nums), so every element gets a second scan that "wraps around". Keep a monotonic decreasing stack of indices. The "unset" sentinel is -math.inf, not -1 — a leftover -inf only becomes -1 in a separate cleanup pass after the main loop.',
    { match: 'def nextGreaterElements_20260731(self, nums: List[int]) -> List[int]:' },
    -1,
    [],
  );

  emit(
    'Initialize decreasingStack = [] and greater = [-math.inf] * len(nums) — every slot starts unset.',
    { match: 'decreasingStack = []', to: { match: 'greater = [-math.inf] * len(nums)' } },
    -1,
    [],
  );

  for (let i = 0; i < 2 * n; i++) {
    const actualIndex = i % n;
    const currentNumber = NUMS[actualIndex];
    const pass = i < n ? 1 : 2;

    while (stack.length > 0 && currentNumber > NUMS[stack[stack.length - 1]]) {
      const prevNode = stack[stack.length - 1];
      stack.pop();
      const alreadySet = greater[prevNode] !== UNSET;
      if (!alreadySet) greater[prevNode] = currentNumber;
      emit(
        `i=${i} (pass ${pass}, actualIndex=${actualIndex}, currentNumber=${currentNumber}): currentNumber ${currentNumber} > nums[top=${prevNode}]=${NUMS[prevNode]} → pop prevNode=${prevNode}. ${alreadySet ? `greater[${prevNode}] is already ${fmt(greater[prevNode])} (not -inf) — skip.` : `greater[${prevNode}] == -inf → set greater[${prevNode}] = ${currentNumber}.`}`,
        alreadySet
          ? { match: 'prevNode = decreasingStack.pop()', to: { match: 'if greater[prevNode] == -math.inf:' } }
          : { match: 'prevNode = decreasingStack.pop()', to: { match: 'greater[prevNode] = currentNumber' } },
        actualIndex,
        [
          { name: 'currentNumber', value: currentNumber, highlight: true },
          { name: 'prevNode', value: prevNode },
          { name: `greater[${prevNode}]`, value: fmt(greater[prevNode]) },
        ],
      );
    }

    stack.push(actualIndex);
    emit(
      `i=${i} (pass ${pass}, actualIndex=${actualIndex}): stack top is now ≥ ${currentNumber} (or empty) — push actualIndex ${actualIndex} onto the decreasing stack.${pass === 2 ? ' (2nd pass only resolves elements that wrap around; it never overwrites an already-set result.)' : ''}`,
      { match: 'decreasingStack.append(actualIndex)' },
      actualIndex,
      [{ name: 'pushed actualIndex', value: actualIndex, highlight: true }],
    );
  }

  emit(
    `Both passes done. greater = ${greaterStr()}. Any index still -inf never found a greater element in either pass — that's handled next, in the cleanup loop: for i in range(len(greater)).`,
    { match: 'for i in range(len(greater)):' },
    -1,
    [],
  );

  for (let i = 0; i < n; i++) {
    const isUnset = greater[i] === UNSET;
    if (isUnset) greater[i] = -1;
    steps.push({
      explanation: `Cleanup pass: greater[${i}] = ${fmt(isUnset ? UNSET : greater[i])}. ${isUnset ? `Still -inf → no greater element was ever found → set greater[${i}] = -1.` : `Already a real value — leave it.`}`,
      anchor: isUnset ? { match: 'greater[i] = -1' } : { match: 'if greater[i] == -math.inf:' },
      state: {
        type: 'array',
        cells: NUMS.map((v, idx) => ({ value: v, state: idx === i ? 'active' : greater[idx] !== UNSET ? 'found' : 'default' })),
        pointers: [{ index: i, label: 'i' }],
        stackItems: [],
        counters: [{ label: 'greater', value: greaterStr() }],
      },
      variables: [{ name: `greater[${i}]`, value: fmt(greater[i]), highlight: isUnset }],
    });
  }

  steps.push({
    explanation: `Cleanup done. Final: ${greaterStr()}.`,
    anchor: { match: 'return greater' },
    state: {
      type: 'array',
      cells: NUMS.map((v, i) => ({ value: v, state: greater[i] !== -1 ? 'found' : 'eliminated' })),
      pointers: [],
      stackItems: [],
      counters: [{ label: 'greater', value: greaterStr() }],
    },
    variables: [{ name: 'return', value: greaterStr(), highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Circular Monotonic Stack (2·n pass)',
  variant: 'circular-stack',
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
};

export const nextGreaterElementIIMeta: AlgorithmMeta = {
  id: 'next-greater-element-ii',
  lcNumber: 503,
  title: 'Next Greater Element II',
  difficulty: 'Medium',
  category: 'stack',
  tags: ['Array', 'Stack', 'Monotonic Stack'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given a circular integer array nums (the element after the last is the first), return the next greater number for every element. The next greater number of x is the first greater number found while traversing forward circularly; −1 if none exists.',
  examples: [
    { input: 'nums = [1,2,1]', output: '[2,-1,2]', explanation: "The second 1 wraps around to find 2." },
    { input: 'nums = [1,2,3,4,3]', output: '[2,3,4,-1,4]' },
  ] as ProblemExample[],
  constraints: ['1 ≤ nums.length ≤ 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹'],
  hint: 'Handle circularity by looping 2·n times with idx = i % n. Maintain a monotonic decreasing stack of indices; each time the current value beats the value at the stack top, pop and record the current value as that index\'s answer. Only the first (unset) result sticks.',
  solutions: [solution],
};
