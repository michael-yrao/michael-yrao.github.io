// Solution + comments sourced from cse-progress: dsa/leetcode/stack/503_next_greater_element_ii.py
import { AlgorithmMeta, SolutionVariant, Step, ArrayCell, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def nextGreaterElements(self, nums: List[int]) -> List[int]:
        # circular array — simulate two passes with i in range(len*2)
        # and modular arithmetic i % len to map back into nums
        # monotonic decreasing stack of INDICES; when we see a greater
        # number, it is the next greater for everything smaller on the stack
        result = [-1] * len(nums)
        decreasingStack = []
        numSize = len(nums)

        for i in range(2 * numSize):
            currentNumberIndex = i % numSize
            while decreasingStack and nums[currentNumberIndex] > nums[decreasingStack[-1]]:
                priorNumberIndex = decreasingStack.pop()
                if result[priorNumberIndex] == -1:
                    result[priorNumberIndex] = nums[currentNumberIndex]
            decreasingStack.append(currentNumberIndex)

        return result`;

const NUMS = [1, 2, 3, 4, 3];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const n = NUMS.length;
  const result: number[] = new Array(n).fill(-1);
  const stack: number[] = []; // indices

  const cells = (curIdx: number): ArrayCell[] =>
    NUMS.map((v, i) => ({
      value: v,
      state:
        i === curIdx ? 'active' : stack.includes(i) ? 'window' : result[i] !== -1 ? 'found' : 'default',
    }));

  const stackItems = (): (string | number)[] => stack.map((i) => `i${i}(${NUMS[i]})`);

  const resultStr = () => `[${result.join(', ')}]`;

  steps.push({
    explanation:
      'Next greater element in a CIRCULAR array. Trick: iterate i from 0 to 2·n − 1 and use idx = i % n, so every element gets a second scan that "wraps around". Keep a monotonic decreasing stack of indices — when the current value exceeds the value at the stack top, the current value is that index\'s next-greater.',
    highlightLine: 6,
    state: {
      type: 'array',
      cells: cells(-1),
      pointers: [],
      stackItems: [],
      counters: [{ label: 'result', value: resultStr() }],
    },
    variables: [],
  });

  for (let i = 0; i < 2 * n; i++) {
    const idx = i % n;
    const pass = i < n ? 1 : 2;

    while (stack.length > 0 && NUMS[idx] > NUMS[stack[stack.length - 1]]) {
      const prior = stack[stack.length - 1];
      stack.pop();
      const already = result[prior] !== -1;
      if (!already) result[prior] = NUMS[idx];
      steps.push({
        explanation: `i=${i} (pass ${pass}, idx=${idx}, value ${NUMS[idx]}): value ${NUMS[idx]} > nums[top=${prior}]=${NUMS[prior]} → pop index ${prior}. ${already ? `result[${prior}] already set — skip.` : `Set result[${prior}] = ${NUMS[idx]}.`}`,
        highlightLine: 15,
        state: {
          type: 'array',
          cells: cells(idx),
          pointers: [{ index: idx, label: `i%n` }],
          stackItems: stackItems(),
          counters: [
            { label: 'i', value: `${i} (pass ${pass})` },
            { label: 'popped idx', value: prior },
            { label: 'result', value: resultStr() },
          ],
        },
        variables: [
          { name: 'nums[idx]', value: NUMS[idx], highlight: true },
          { name: 'priorNumberIndex', value: prior },
          { name: `result[${prior}]`, value: result[prior] },
        ],
      });
    }

    stack.push(idx);
    steps.push({
      explanation: `i=${i} (pass ${pass}, idx=${idx}): stack top is now ≥ ${NUMS[idx]} (or empty) — push index ${idx} onto the decreasing stack.${pass === 2 ? ' (2nd pass only resolves elements that wrap around; it never sets a result twice.)' : ''}`,
      highlightLine: 18,
      state: {
        type: 'array',
        cells: cells(idx),
        pointers: [{ index: idx, label: `i%n` }],
        stackItems: stackItems(),
        counters: [
          { label: 'i', value: `${i} (pass ${pass})` },
          { label: 'stack', value: `[${stack.join(',')}]` },
          { label: 'result', value: resultStr() },
        ],
      },
      variables: [{ name: 'pushed idx', value: idx, highlight: true }],
    });
  }

  steps.push({
    explanation: `Both passes done. Indices still on the stack never found a greater element, so they keep result −1. Final: ${resultStr()}.`,
    highlightLine: 20,
    state: {
      type: 'array',
      cells: NUMS.map((v, i) => ({ value: v, state: result[i] !== -1 ? 'found' : 'eliminated' })),
      pointers: [],
      stackItems: stackItems(),
      counters: [{ label: 'result', value: resultStr() }],
    },
    variables: [{ name: 'return', value: resultStr(), highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Circular Monotonic Stack (2·n pass)',
  pythonCode: PYTHON_CODE,
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
