import { AlgorithmMeta, SolutionVariant, Step, LinkedListNode, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced from cse-review: dsa/leetcode/linked_list/2_add_two_numbers.py
// (the elegant single-loop variant, addTwoNumbers_20260705_elegant)
const PYTHON_CODE = `class Solution:
    def addTwoNumbers(self, l1: Optional[ListNode], l2: Optional[ListNode]) -> Optional[ListNode]:
        # slightly cleaner version of linked list arithmetic
        # since the above literally just does 3 loops with the same code
        l1t = l1
        l2t = l2
        carryover = 0
        dummyResultNode = ListNode(-1)
        dummyTraversal = dummyResultNode

        while l1t or l2t or carryover:
            l1tVal = l2tVal = 0
            if l1t:
                l1tVal = l1t.val
            if l2t:
                l2tVal = l2t.val
            digitSum = l1tVal + l2tVal + carryover
            if digitSum >= 10:
                carryover = 1
            else:
                carryover = 0
            resultNode = ListNode(digitSum%10)
            dummyTraversal.next = resultNode
            dummyTraversal = dummyTraversal.next
            if l1t:
                l1t = l1t.next
            if l2t:
                l2t = l2t.next

        return dummyResultNode.next`;

const L1 = [2, 4, 3]; // represents 342 (digits stored reversed)
const L2 = [5, 6, 4]; // represents 465

function makeInputNodes(p1Idx: number | null, p2Idx: number | null): LinkedListNode[] {
  const l1Nodes: LinkedListNode[] = L1.map((v, i) => ({
    id: `a${i}`,
    value: v,
    nextId: i < L1.length - 1 ? `a${i + 1}` : null,
    state: p1Idx === i ? ('curr' as const) : p1Idx !== null && i < p1Idx ? ('done' as const) : ('default' as const),
  }));
  const l2Nodes: LinkedListNode[] = L2.map((v, i) => ({
    id: `b${i}`,
    value: v,
    nextId: i < L2.length - 1 ? `b${i + 1}` : null,
    state: p2Idx === i ? ('prev' as const) : p2Idx !== null && i < p2Idx ? ('done' as const) : ('default' as const),
  }));
  return [...l1Nodes, ...l2Nodes];
}

function makeResult(vals: number[], activeIdx?: number): LinkedListNode[] {
  return vals.map((v, i) => ({
    id: `r${i}`,
    value: v,
    nextId: i < vals.length - 1 ? `r${i + 1}` : null,
    state: i === activeIdx ? ('active' as const) : ('done' as const),
  }));
}

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const result: number[] = [];
  let p1 = 0;
  let p2 = 0;
  let carryover = 0;

  steps.push({
    explanation:
      'Add 342 + 465 = 807. Digits are stored least-significant-first (2→4→3 is 342), which is exactly the order we add by hand: rightmost digit first, carrying overflow left. A dummy head simplifies building the result, and the loop runs while either list has nodes left OR a carry remains.',
    highlightLine: 9,
    state: {
      type: 'linked-list',
      nodes: makeInputNodes(0, 0),
      pointers: [
        { nodeId: 'a0', label: 'l1t' },
        { nodeId: 'b0', label: 'l2t' },
      ],
      result: [],
    },
    variables: [
      { name: 'l1', value: '2→4→3  (342)' },
      { name: 'l2', value: '5→6→4  (465)' },
      { name: 'carryover', value: 0 },
    ],
  });

  while (p1 < L1.length || p2 < L2.length || carryover) {
    const v1 = p1 < L1.length ? L1[p1] : 0;
    const v2 = p2 < L2.length ? L2[p2] : 0;
    const digitSum = v1 + v2 + carryover;
    const prevCarry = carryover;
    const digit = digitSum % 10;
    carryover = digitSum >= 10 ? 1 : 0;
    result.push(digit);

    const carryNote = digitSum >= 10 ? ` Since ${digitSum} ≥ 10, write ${digit} and carry 1 into the next column.` : ` ${digitSum} < 10, so carryover becomes 0.`;

    steps.push({
      explanation: `l1tVal=${v1}, l2tVal=${v2}, carryover=${prevCarry}. digitSum = ${v1} + ${v2} + ${prevCarry} = ${digitSum}. Append ListNode(digitSum % 10) = ${digit} to the result.${carryNote}`,
      highlightLine: 23,
      state: {
        type: 'linked-list',
        nodes: makeInputNodes(p1 + 1 < L1.length ? p1 + 1 : null, p2 + 1 < L2.length ? p2 + 1 : null),
        pointers: [
          ...(p1 + 1 < L1.length ? [{ nodeId: `a${p1 + 1}`, label: 'l1t' }] : [{ nodeId: null, label: 'l1t=None' }]),
          ...(p2 + 1 < L2.length ? [{ nodeId: `b${p2 + 1}`, label: 'l2t' }] : [{ nodeId: null, label: 'l2t=None' }]),
        ],
        result: makeResult(result, result.length - 1),
      },
      variables: [
        { name: 'l1tVal', value: v1 },
        { name: 'l2tVal', value: v2 },
        { name: 'digitSum', value: digitSum, highlight: true },
        { name: 'ListNode(digitSum%10)', value: digit, highlight: true },
        { name: 'carryover', value: carryover, highlight: digitSum >= 10 },
        { name: 'result', value: `[${result.join('→')}]` },
      ],
    });

    p1++;
    p2++;
  }

  steps.push({
    explanation: `Both lists are exhausted and carryover is 0 — the loop condition fails and we return dummyResultNode.next. Result list ${result.join('→')} reads as 807 (again least-significant-first). Each node is visited once: O(max(m, n)) time, O(max(m, n)) for the result list.`,
    highlightLine: 30,
    state: {
      type: 'linked-list',
      nodes: makeInputNodes(null, null),
      pointers: [
        { nodeId: null, label: 'l1t' },
        { nodeId: null, label: 'l2t' },
      ],
      result: makeResult(result),
    },
    variables: [
      { name: 'return', value: `[${result.join('→')}]  (807)`, highlight: true },
    ],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Elementary Addition',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(max(m, n))',
  spaceComplexity: 'O(max(m, n))',
};

export const addTwoNumbersMeta: AlgorithmMeta = {
  id: 'add-two-numbers',
  lcNumber: 2,
  title: 'Add Two Numbers',
  difficulty: 'Medium',
  category: 'linked-list',
  tags: ['Linked List', 'Math', 'Recursion'],
  timeComplexity: 'O(max(m, n))',
  spaceComplexity: 'O(max(m, n))',
  description:
    'You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each node contains a single digit. Add the two numbers and return the sum as a linked list, also in reverse order.',
  examples: [
    { input: 'l1 = [2,4,3], l2 = [5,6,4]', output: '[7,0,8]', explanation: '342 + 465 = 807.' },
    { input: 'l1 = [0], l2 = [0]', output: '[0]' },
    { input: 'l1 = [9,9,9,9,9,9,9], l2 = [9,9,9,9]', output: '[8,9,9,9,0,0,0,1]' },
  ] as ProblemExample[],
  constraints: [
    'The number of nodes in each list is in the range [1, 100].',
    '0 ≤ Node.val ≤ 9',
    'The number has no leading zeros, except the number 0 itself.',
  ],
  hint: 'Because digits are already reversed, add column-by-column from the heads. Keep a single carry variable and keep looping while either list has nodes left OR a carry remains.',
  solutions: [solution],
};
