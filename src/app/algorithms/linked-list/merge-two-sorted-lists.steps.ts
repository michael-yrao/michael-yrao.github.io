import { AlgorithmMeta, SolutionVariant, Step, LinkedListNode, ProblemExample } from '../../core/models/algorithm.model';

const ITERATIVE_CODE = `class Solution:
    def mergeTwoLists(self, list1, list2):
        # creating new linked list
        # thus we should use a dummy node to keep track of new head

        # value is irrelevant, using -101 since constraint says node.val >= -100
        dummy = ListNode(-101)

        # now we need a cursor to actually traverse the list
        # we initialize it to dummy so we keep references to it
        current = dummy

        # while both of the lists are not null
        # we want to compare and provide lowest to current

        while list1 and list2:
            if list1.val < list2.val:
                current.next = list1
                list1 = list1.next
            else:
                current.next = list2
                list2 = list2.next
            current = current.next

        # when we are here, we know one of the list is null

        if list1:
            current.next = list1
        else:
            current.next = list2

        return dummy.next`;

const RECURSIVE_CODE = `class Solution:
    def mergeTwoListsRecursive(self, list1, list2):
        # since we are merging, we have to do forward-order
        # meaning we have to make our decision on our way down the call stack

        # if either side is empty, we just set next to the rest of the other list
        if not list1:
            return list2

        if not list2:
            return list1

        # knowing neither is None here, we check value
        # if list1.val is smaller, we want to increment list1
        # otherwise increment list2
        if list1.val < list2.val:
            list1.next = self.mergeTwoListsRecursive(list1.next, list2)
            # forward traversal, thus since list1 is set in stone, we return it
            return list1
        else:
            list2.next = self.mergeTwoListsRecursive(list1, list2.next)
            # forward traversal, thus since list2 is set in stone, we return it
            return list2`;

// list1: 1→2→4, list2: 1→3→4
const L1 = [1, 2, 4];
const L2 = [1, 3, 4];

function makeInputNodes(
  p1Idx: number | null,
  p2Idx: number | null
): LinkedListNode[] {
  const l1Nodes: LinkedListNode[] = L1.map((v, i) => ({
    id: `a${i}`,
    value: v,
    nextId: i < L1.length - 1 ? `a${i + 1}` : null,
    state:
      p1Idx === i
        ? ('curr' as const)
        : p1Idx !== null && i < p1Idx
        ? ('done' as const)
        : ('default' as const),
  }));

  const l2Nodes: LinkedListNode[] = L2.map((v, i) => ({
    id: `b${i}`,
    value: v,
    nextId: i < L2.length - 1 ? `b${i + 1}` : null,
    state:
      p2Idx === i
        ? ('prev' as const)
        : p2Idx !== null && i < p2Idx
        ? ('done' as const)
        : ('default' as const),
  }));

  return [...l1Nodes, ...l2Nodes];
}

function makeResult(vals: number[]): LinkedListNode[] {
  return vals.map((v, i) => ({
    id: `r${i}`,
    value: v,
    nextId: i < vals.length - 1 ? `r${i + 1}` : null,
    state: 'done' as const,
  }));
}

function generateIterativeSteps(): Step[] {
  const steps: Step[] = [];
  const result: number[] = [];
  let p1 = 0; // index into L1
  let p2 = 0; // index into L2

  steps.push({
    explanation:
      'Iterative merge: create a dummy head to simplify edge cases. p1 and p2 scan list1 and list2. At each step pick the smaller head, attach it to the result, and advance that pointer.',
    highlightLine: 3,
    state: {
      type: 'linked-list',
      nodes: makeInputNodes(0, 0),
      pointers: [
        { nodeId: 'a0', label: 'p1' },
        { nodeId: 'b0', label: 'p2' },
      ],
      result: [],
    },
  });

  while (p1 < L1.length && p2 < L2.length) {
    const v1 = L1[p1];
    const v2 = L2[p2];

    if (v1 <= v2) {
      result.push(v1);
      const old = p1;
      p1++;
      steps.push({
        explanation: `p1.val=${v1} ≤ p2.val=${v2}. Take ${v1} from list1 into result. Advance p1.`,
        highlightLine: 7,
        state: {
          type: 'linked-list',
          nodes: makeInputNodes(p1 < L1.length ? p1 : null, p2),
          pointers: [
            ...(p1 < L1.length ? [{ nodeId: `a${p1}`, label: 'p1' }] : [{ nodeId: null, label: 'p1=null' }]),
            { nodeId: `b${p2}`, label: 'p2' },
          ],
          result: makeResult(result),
        },
        variables: [
          { name: 'took', value: v1, highlight: true },
          { name: 'p1', value: p1 < L1.length ? `list1[${p1}]=${L1[p1]}` : 'null' },
          { name: 'result', value: `[${result.join(',')}]` },
        ],
      });
    } else {
      result.push(v2);
      const old = p2;
      p2++;
      steps.push({
        explanation: `p1.val=${v1} > p2.val=${v2}. Take ${v2} from list2 into result. Advance p2.`,
        highlightLine: 11,
        state: {
          type: 'linked-list',
          nodes: makeInputNodes(p1, p2 < L2.length ? p2 : null),
          pointers: [
            { nodeId: `a${p1}`, label: 'p1' },
            ...(p2 < L2.length ? [{ nodeId: `b${p2}`, label: 'p2' }] : [{ nodeId: null, label: 'p2=null' }]),
          ],
          result: makeResult(result),
        },
        variables: [
          { name: 'took', value: v2, highlight: true },
          { name: 'p2', value: p2 < L2.length ? `list2[${p2}]=${L2[p2]}` : 'null' },
          { name: 'result', value: `[${result.join(',')}]` },
        ],
      });
    }
  }

  // Append remaining
  while (p1 < L1.length) { result.push(L1[p1++]); }
  while (p2 < L2.length) { result.push(L2[p2++]); }

  steps.push({
    explanation: `One list exhausted. Append the remaining tail: [${(p1 < L1.length ? L1.slice(p1) : L2.slice(p2)).join('→')}]. Done — merged list: 1→1→2→3→4→4. O(m+n) time, O(1) extra space.`,
    highlightLine: 14,
    state: {
      type: 'linked-list',
      nodes: makeInputNodes(null, null),
      pointers: [{ nodeId: null, label: 'p1' }, { nodeId: null, label: 'p2' }],
      result: makeResult(result),
    },
    variables: [
      { name: 'return', value: `[${result.join('→')}]`, highlight: true },
    ],
  });

  return steps;
}

function generateRecursiveSteps(): Step[] {
  const steps: Step[] = [];

  // Show recursion conceptually through frames
  const frames: { desc: string; l1: string; l2: string; action: string; returns: string }[] = [
    { desc: 'Call 1', l1: '1→2→4', l2: '1→3→4', action: '1 ≤ 1 → list1.next = recurse(2→4, 1→3→4)', returns: 'list1 (1)' },
    { desc: 'Call 2', l1: '2→4', l2: '1→3→4', action: '2 > 1 → list2.next = recurse(2→4, 3→4)', returns: 'list2 (1)' },
    { desc: 'Call 3', l1: '2→4', l2: '3→4', action: '2 ≤ 3 → list1.next = recurse(4, 3→4)', returns: 'list1 (2)' },
    { desc: 'Call 4', l1: '4', l2: '3→4', action: '4 > 3 → list2.next = recurse(4, 4)', returns: 'list2 (3)' },
    { desc: 'Call 5', l1: '4', l2: '4', action: '4 ≤ 4 → list1.next = recurse(null, 4)', returns: 'list1 (4)' },
    { desc: 'Call 6', l1: 'null', l2: '4', action: 'list1 is null → base case, return list2', returns: 'list2 (4)' },
  ];

  const resultsSoFar = ['', '', '', '', '1→', '1→1→', '1→1→2→', '1→1→2→3→', '1→1→2→3→4→', '1→1→2→3→4→4'];

  steps.push({
    explanation:
      'Recursive merge: at each call, compare the heads. Attach the smaller one and recurse on the rest. The call stack unwinds returning each head in order, building the merged list bottom-up.',
    highlightLine: 3,
    state: {
      type: 'linked-list',
      nodes: makeInputNodes(0, 0),
      pointers: [
        { nodeId: 'a0', label: 'list1' },
        { nodeId: 'b0', label: 'list2' },
      ],
    },
  });

  frames.forEach((f, idx) => {
    steps.push({
      explanation: `${f.desc}: list1=[${f.l1}], list2=[${f.l2}]. ${f.action} → return ${f.returns}.`,
      highlightLine: f.l1 === 'null' ? 3 : f.l2 === 'null' ? 5 : 7,
      state: {
        type: 'linked-list',
        nodes: makeInputNodes(
          f.l1 === 'null' ? null : L1.findIndex(v => v === parseInt(f.l1)),
          f.l2 === 'null' ? null : L2.findIndex(v => v === parseInt(f.l2))
        ),
        pointers: [
          { nodeId: f.l1 === 'null' ? null : `a${L1.findIndex(v => v === parseInt(f.l1))}`, label: 'list1' },
          { nodeId: f.l2 === 'null' ? null : `b${L2.findIndex(v => v === parseInt(f.l2))}`, label: 'list2' },
        ],
      },
      variables: [
        { name: 'depth', value: idx + 1 },
        { name: 'action', value: f.action, highlight: true },
        { name: 'returns', value: f.returns, highlight: true },
      ],
    });
  });

  steps.push({
    explanation: 'All 6 calls return. The linked chain built during the unwind is: 1→1→2→3→4→4. O(m+n) time, O(m+n) space for the call stack.',
    highlightLine: 11,
    state: {
      type: 'linked-list',
      nodes: makeInputNodes(null, null),
      pointers: [],
      result: makeResult([1, 1, 2, 3, 4, 4]),
    },
    variables: [{ name: 'return', value: '1→1→2→3→4→4', highlight: true }],
  });

  return steps;
}

const iterativeSolution: SolutionVariant = {
  label: 'Iterative',
  pythonCode: ITERATIVE_CODE,
  generateSteps: generateIterativeSteps,
};

const recursiveSolution: SolutionVariant = {
  label: 'Recursive',
  pythonCode: RECURSIVE_CODE,
  generateSteps: generateRecursiveSteps,
};

export const mergeTwoSortedListsMeta: AlgorithmMeta = {
  id: 'merge-two-sorted-lists',
  lcNumber: 21,
  title: 'Merge Two Sorted Lists',
  difficulty: 'Easy',
  category: 'linked-list',
  tags: ['Linked List', 'Recursion'],
  timeComplexity: 'O(m+n)',
  spaceComplexity: 'O(1)',
  description:
    'You are given the heads of two sorted linked lists list1 and list2. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists. Return the head of the merged linked list.',
  examples: [
    {
      input: 'list1 = [1,2,4], list2 = [1,3,4]',
      output: '[1,1,2,3,4,4]',
    },
    {
      input: 'list1 = [], list2 = []',
      output: '[]',
    },
    {
      input: 'list1 = [], list2 = [0]',
      output: '[0]',
    },
  ] as ProblemExample[],
  constraints: [
    'The number of nodes in both lists is in the range [0, 50].',
    '-100 ≤ Node.val ≤ 100',
    'Both list1 and list2 are sorted in non-decreasing order.',
  ],
  hint: 'Use a dummy head to avoid special-casing the empty result. Compare the two current heads, attach the smaller one, and advance that pointer. When one list is exhausted, attach the rest of the other directly.',
  solutions: [iterativeSolution, recursiveSolution],
};
