import { AlgorithmMeta, SolutionVariant, Step, LinkedListNode, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's mergeTwoLists and mergeTwoListsRecursive verbatim. Both use a
// STRICT `list1.val < list2.val` comparison — on a tie, list2's node is taken, never
// list1's (the earlier site version used `<=`, which took list1 on a tie; that flips
// which node comes first whenever the two lists share a value, as they do here: both
// start with 1).

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

// ── Solution 1: Iterative ─────────────────────────────────────────────────────

function generateIterativeSteps(): Step[] {
  const steps: Step[] = [];
  const result: number[] = [];
  let p1 = 0; // index into L1
  let p2 = 0; // index into L2

  steps.push({
    explanation:
      'dummy = ListNode(-101), then current = dummy. The dummy node simplifies the empty-result edge case. list1 and list2 are the two cursors, shown below. At each step, if list1.val < list2.val take list1\'s node; otherwise (including a tie) take list2\'s.',
    anchor: { match: 'dummy = ListNode(-101)', to: { match: 'current = dummy' } },
    state: {
      type: 'linked-list',
      nodes: makeInputNodes(0, 0),
      pointers: [
        { nodeId: 'a0', label: 'list1' },
        { nodeId: 'b0', label: 'list2' },
      ],
      result: [],
    },
  });

  while (p1 < L1.length && p2 < L2.length) {
    const v1 = L1[p1];
    const v2 = L2[p2];

    if (v1 < v2) {
      result.push(v1);
      p1++;
      steps.push({
        explanation: `list1.val=${v1} < list2.val=${v2}: current.next = list1, list1 = list1.next, current = current.next. ${v1} joins the result from list1.`,
        // nth 1: the in-loop assignment; the 2nd hit is the post-loop tail attach under 'if list1:'
        anchor: { match: 'current.next = list1', nth: 1, to: { match: 'current = current.next' } },
        state: {
          type: 'linked-list',
          nodes: makeInputNodes(p1 < L1.length ? p1 : null, p2),
          pointers: [
            ...(p1 < L1.length ? [{ nodeId: `a${p1}`, label: 'list1' }] : [{ nodeId: null, label: 'list1=null' }]),
            { nodeId: `b${p2}`, label: 'list2' },
          ],
          result: makeResult(result),
        },
        variables: [
          { name: 'took', value: v1, highlight: true },
          { name: 'list1', value: p1 < L1.length ? `list1[${p1}]=${L1[p1]}` : 'null' },
          { name: 'result', value: `[${result.join(',')}]` },
        ],
      });
    } else {
      result.push(v2);
      p2++;
      steps.push({
        explanation: `list1.val=${v1} < list2.val=${v2} is False (${v1 === v2 ? 'tie' : `${v1} > ${v2}`}): current.next = list2, list2 = list2.next, current = current.next. ${v2} joins the result from list2.`,
        // nth 1: the in-loop assignment; the 2nd hit is the post-loop tail attach under 'else:'
        anchor: { match: 'current.next = list2', nth: 1, to: { match: 'current = current.next' } },
        state: {
          type: 'linked-list',
          nodes: makeInputNodes(p1, p2 < L2.length ? p2 : null),
          pointers: [
            { nodeId: `a${p1}`, label: 'list1' },
            ...(p2 < L2.length ? [{ nodeId: `b${p2}`, label: 'list2' }] : [{ nodeId: null, label: 'list2=null' }]),
          ],
          result: makeResult(result),
        },
        variables: [
          { name: 'took', value: v2, highlight: true },
          { name: 'list2', value: p2 < L2.length ? `list2[${p2}]=${L2[p2]}` : 'null' },
          { name: 'result', value: `[${result.join(',')}]` },
        ],
      });
    }
  }

  // Append remaining
  while (p1 < L1.length) { result.push(L1[p1++]); }
  while (p2 < L2.length) { result.push(L2[p2++]); }

  steps.push({
    explanation: `One list exhausted — the while loop exits. if list1: current.next = list1, else: current.next = list2 attaches whichever tail remains. return dummy.next. Merged list: ${result.join('→')}. O(m+n) time, O(1) extra space.`,
    anchor: { match: 'if list1:', to: { match: 'return dummy.next' } },
    state: {
      type: 'linked-list',
      nodes: makeInputNodes(null, null),
      pointers: [{ nodeId: null, label: 'list1' }, { nodeId: null, label: 'list2' }],
      result: makeResult(result),
    },
    variables: [
      { name: 'return', value: `[${result.join('→')}]`, highlight: true },
    ],
  });

  return steps;
}

// ── Solution 2: Recursive ─────────────────────────────────────────────────────

interface RecursiveFrame {
  desc: string;
  l1: string;
  l2: string;
  action: string;
  returns: string;
  usesList1Branch: boolean;
}

function generateRecursiveSteps(): Step[] {
  const steps: Step[] = [];

  // Show recursion conceptually through frames — trace of mergeTwoListsRecursive
  // with the actual strict `list1.val < list2.val` comparison. Both lists start
  // with a 1, so Call 1 ties and takes the else branch (list2), not list1.
  const frames: RecursiveFrame[] = [
    { desc: 'Call 1', l1: '1→2→4', l2: '1→3→4', action: '1 < 1 is False (tie) → list2.next = recurse(1→2→4, 3→4)', returns: 'list2 (1)', usesList1Branch: false },
    { desc: 'Call 2', l1: '1→2→4', l2: '3→4', action: '1 < 3 → list1.next = recurse(2→4, 3→4)', returns: 'list1 (1)', usesList1Branch: true },
    { desc: 'Call 3', l1: '2→4', l2: '3→4', action: '2 < 3 → list1.next = recurse(4, 3→4)', returns: 'list1 (2)', usesList1Branch: true },
    { desc: 'Call 4', l1: '4', l2: '3→4', action: '4 < 3 is False → list2.next = recurse(4, 4)', returns: 'list2 (3)', usesList1Branch: false },
    { desc: 'Call 5', l1: '4', l2: '4', action: '4 < 4 is False (tie) → list2.next = recurse(4, null)', returns: 'list2 (4)', usesList1Branch: false },
    { desc: 'Call 6', l1: '4', l2: 'null', action: 'not list2 → base case, return list1', returns: 'list1 (4)', usesList1Branch: false },
  ];

  steps.push({
    explanation:
      'Recursive merge: at each call, compare the heads with list1.val < list2.val. Attach the smaller (list2 wins ties) and recurse on the rest. The call stack unwinds, returning each head in order to build the merged list bottom-up.',
    anchor: { match: 'def mergeTwoListsRecursive(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:' },
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
    const isBaseCase = f.l2 === 'null';
    const anchor = isBaseCase
      ? { match: 'if not list2:', to: { match: 'return list1', nth: 1 } } // 1st hit: the not-list2 base case (the list1-branch's own "return list1" is the 2nd hit)
      : f.usesList1Branch
      ? { match: 'list1.next = self.mergeTwoListsRecursive(list1.next, list2)', to: { match: 'return list1', nth: 2 } } // 2nd hit: the comparison branch (the not-list2 base case has the 1st)
      : { match: 'list2.next = self.mergeTwoListsRecursive(list1, list2.next)', to: { match: 'return list2', nth: 2 } }; // 2nd hit: the else branch (the not-list1 base case has the 1st)

    steps.push({
      explanation: `${f.desc}: list1=[${f.l1}], list2=[${f.l2}]. ${f.action} → return ${f.returns}.`,
      anchor,
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
    explanation: 'All 6 calls return. The linked chain built during the unwind is: 1→1→2→3→4→4 — the tie at the head resolved to list2\'s node first, per the strict < comparison. O(m+n) time, O(m+n) space for the call stack.',
    anchor: { match: 'def mergeTwoListsRecursive(self, list1: Optional[ListNode], list2: Optional[ListNode]) -> Optional[ListNode]:' },
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
  variant: 'iterative',
  generateSteps: generateIterativeSteps,
};

const recursiveSolution: SolutionVariant = {
  label: 'Recursive',
  variant: 'recursive',
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
