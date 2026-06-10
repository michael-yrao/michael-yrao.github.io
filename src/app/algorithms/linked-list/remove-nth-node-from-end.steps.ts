import { AlgorithmMeta, SolutionVariant, Step, ProblemExample, LinkedListNode } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def removeNthFromEnd(self, head, n):
        dummy = ListNode(0)
        dummy.next = head
        length, ptr = 0, dummy
        while ptr:
            length += 1
            ptr = ptr.next
        idx = length - n - 1   # index to repoint (in dummy-prefixed list)
        ptr = dummy
        for i in range(idx + 1):
            if i == idx:
                ptr.next = ptr.next.next
            ptr = ptr.next
        return dummy.next`;

function makeNodes(
  vals: number[],
  activeIdx: number | null,
  removedIdx: number | null
): LinkedListNode[] {
  return vals.map((v, i) => ({
    id: `n${i}`,
    value: v,
    nextId: i < vals.length - 1 ? `n${i + 1}` : null,
    state:
      i === removedIdx
        ? ('active' as const)
        : i === activeIdx
        ? ('curr' as const)
        : ('default' as const),
  }));
}

function generateSteps(): Step[] {
  const vals = [1, 2, 3, 4, 5];
  const n = 2;
  const dummyVals = [0, ...vals];
  const steps: Step[] = [];

  steps.push({
    explanation: `Remove the ${n}nd node from the end of [${vals.join('→')}]. Prepend a dummy node (0) so removing the head is handled the same as any other removal.`,
    highlightLine: 2,
    state: {
      type: 'linked-list',
      nodes: makeNodes(dummyVals, 0, null),
      pointers: [],
    },
    variables: [
      { name: 'n', value: n },
      { name: 'dummy', value: '0 → head' },
    ],
  });

  // Phase 1: count length
  let length = 0;
  for (let i = 0; i < dummyVals.length; i++) {
    length++;
    steps.push({
      explanation: `Pass 1 — ptr at index ${i} (val=${dummyVals[i]}). length = ${length}.`,
      highlightLine: 5,
      state: {
        type: 'linked-list',
        nodes: makeNodes(dummyVals, i, null),
        pointers: [{ nodeId: `n${i}`, label: 'ptr' }],
      },
      variables: [
        { name: 'ptr', value: `index ${i}` },
        { name: 'length', value: length },
      ],
    });
  }

  const idx = length - n - 1;

  steps.push({
    explanation: `Pass 1 done. length=${length} (includes dummy). Repoint index = ${length} − ${n} − 1 = ${idx}. Node to remove is at index ${idx + 1} (val=${dummyVals[idx + 1]}).`,
    highlightLine: 9,
    state: {
      type: 'linked-list',
      nodes: makeNodes(dummyVals, null, null),
      pointers: [],
    },
    variables: [
      { name: 'length', value: length },
      { name: 'repoint idx', value: idx, highlight: true },
      { name: 'remove val', value: dummyVals[idx + 1] },
    ],
  });

  // Phase 2: traverse to idx
  for (let i = 0; i <= idx; i++) {
    const atTarget = i === idx;
    steps.push({
      explanation: atTarget
        ? `i=${i}: at repoint node (val=${dummyVals[i]}). Set ptr.next = ptr.next.next → skips val=${dummyVals[i + 1]}.`
        : `Pass 2 — i=${i}: advancing ptr to index ${i} (val=${dummyVals[i]}).`,
      highlightLine: atTarget ? 12 : 11,
      state: {
        type: 'linked-list',
        nodes: makeNodes(dummyVals, i, atTarget ? i + 1 : null),
        pointers: [{ nodeId: `n${i}`, label: 'ptr' }],
      },
      variables: [
        { name: 'i', value: i },
        { name: 'ptr val', value: dummyVals[i], highlight: atTarget },
      ],
    });
  }

  // Final result
  const resultVals = dummyVals.filter((_, i) => i !== idx + 1).slice(1);
  steps.push({
    explanation: `val=${dummyVals[idx + 1]} removed. Return dummy.next → [${resultVals.join('→')}]. O(n) time, O(1) space — two passes.`,
    highlightLine: 14,
    state: {
      type: 'linked-list',
      nodes: resultVals.map((v, i) => ({
        id: `r${i}`,
        value: v,
        nextId: i < resultVals.length - 1 ? `r${i + 1}` : null,
        state: 'done' as const,
      })),
      pointers: [],
    },
    variables: [{ name: 'return', value: `[${resultVals.join('→')}]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two-Pass',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const removeNthFromEndMeta: AlgorithmMeta = {
  id: 'remove-nth-node-from-end',
  lcNumber: 19,
  title: 'Remove Nth Node From End of List',
  difficulty: 'Medium',
  category: 'linked-list',
  tags: ['Linked List', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given the head of a linked list, remove the nth node from the end of the list and return its head.',
  examples: [
    {
      input: 'head = [1,2,3,4,5], n = 2',
      output: '[1,2,3,5]',
      explanation: 'The 2nd node from the end (val=4) is removed.',
    },
    {
      input: 'head = [1], n = 1',
      output: '[]',
    },
    {
      input: 'head = [1,2], n = 1',
      output: '[1]',
    },
  ] as ProblemExample[],
  constraints: [
    'The number of nodes in the list is sz.',
    '1 ≤ sz ≤ 30',
    '0 ≤ Node.val ≤ 100',
    '1 ≤ n ≤ sz',
  ],
  hint: 'Prepend a dummy node so removing the real head is no different from removing any other node. Pass 1: count the length (including dummy). Pass 2: walk to index (length − n − 1) and set node.next = node.next.next.',
  solutions: [solution],
};
