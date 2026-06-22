import { AlgorithmMeta, SolutionVariant, Step, LinkedListNode, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def reorderList(self, head: Optional[ListNode]) -> None:
        # naive solution is to make a hashmap
        # we can just loop through the list, construct hashmap of index -> node
        # build new linked list with result
        # L(0) -> L(n) -> L(1) -> L(n-1) -> L(2) -> L(n - 2)
        # effectively we are merging L(n/2) with the reverse top half of L(n/2) interchangeably
        # so first step is to find the middle of the linked list
        # for this, we do floyd's cycle detection which puts slow at the middle
        # then we reverse the second half of the linked list in place
        # then we loop through with two pointers, one at beginning, one at middle and assign interchangeably
        # also if we look at 1->2->3->4->5, we will notice that first half is 1,2,3 and second half is 4,5
        # thus we can't use slow node from floyd's algorithm, we need slow.next for second half
        # what an amazing problem!! floyd/reverse/merge all in one

        # starting slow

        slow = fast = head
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next

        # slow = middle of list
        # slow.next = start of second half of list
        current = slow.next
        # split the two lists
        slow.next = None
        prev = None

        while current:
            temp = current.next
            current.next = prev
            prev = current
            current = temp

        # now that we have reversed, we just need to interchangeably swap the nodes
        # current is null, prev is the actual new head of secondHalf

        firstHalf, secondHalf = head, prev

        # from 1,2,3,4,5, we know secondHalf is shorter
        # thus we loop based on secondHalf

        # 1,2,3
        # 5,4
        while secondHalf:
            # like in all reordering problems, we store next for all lists we traverse
            tmp1, tmp2 = firstHalf.next, secondHalf.next
            # 1.next = 5
            firstHalf.next = secondHalf
            # 5.next = 2
            secondHalf.next = tmp1
            firstHalf = tmp1
            secondHalf = tmp2`;

function generateSteps(): Step[] {
  const vals = [1, 2, 3, 4, 5];
  const steps: Step[] = [];

  // ── Helper: build a simple forward-linked node array ────────────────────────
  const makeLinear = (
    nodeVals: number[],
    stateMap: Record<number, LinkedListNode['state']>
  ): LinkedListNode[] =>
    nodeVals.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: i < nodeVals.length - 1 ? `n${i + 1}` : null,
      state: stateMap[i] ?? ('default' as const),
    }));

  // ── Intro ──────────────────────────────────────────────────────────────────
  steps.push({
    explanation:
      'Reorder [1→2→3→4→5] to [1→5→2→4→3]. Algorithm has 3 phases: (1) find the middle using slow/fast pointers, (2) reverse the second half in-place, (3) interleave-merge the two halves.',
    highlightLine: 1,
    state: {
      type: 'linked-list',
      nodes: makeLinear(vals, {}),
      pointers: [{ nodeId: 'n0', label: 'head' }],
    },
    variables: [],
  });

  // ── Phase 1: Find Middle ───────────────────────────────────────────────────
  steps.push({
    explanation:
      'Phase 1 — Find Middle. slow and fast start at head. slow advances 1 step, fast advances 2 steps per iteration. When fast reaches the end, slow is at the middle.',
    highlightLine: 18,
    state: {
      type: 'linked-list',
      nodes: makeLinear(vals, { 0: 'curr', }),
      pointers: [
        { nodeId: 'n0', label: 'slow' },
        { nodeId: 'n0', label: 'fast' },
      ],
    },
    variables: [{ name: 'slow.val', value: vals[0] }, { name: 'fast.val', value: vals[0] }],
  });

  let slow = 0;
  let fast = 0;

  while (fast < vals.length - 1 && fast + 1 < vals.length - 1) {
    slow++;
    fast += 2;

    steps.push({
      explanation: `slow → ${vals[slow]}, fast → ${fast < vals.length ? vals[fast] : 'null'} (moved 2 steps). fast still has next — continue.`,
      highlightLine: 19,
      state: {
        type: 'linked-list',
        nodes: makeLinear(vals, { [slow]: 'curr', [fast]: 'next-node' }),
        pointers: [
          { nodeId: `n${slow}`, label: 'slow' },
          { nodeId: fast < vals.length ? `n${fast}` : null, label: 'fast' },
        ],
      },
      variables: [
        { name: 'slow.val', value: vals[slow], highlight: true },
        { name: 'fast.val', value: fast < vals.length ? vals[fast] : 'null', highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `fast.next is null — slow is at the middle (node ${vals[slow]}). The second half starts at slow.next (node ${vals[slow + 1]}). We cut the list here: slow.next = None.`,
    highlightLine: 23,
    state: {
      type: 'linked-list',
      nodes: makeLinear(vals, { [slow]: 'active' }),
      pointers: [{ nodeId: `n${slow}`, label: 'slow (middle)' }],
    },
    variables: [
      { name: 'slow.val', value: vals[slow], highlight: true },
      { name: 'slow.next', value: vals[slow + 1] },
    ],
  });

  const midIdx = slow; // index 2 (val 3)
  // first half: vals[0..midIdx], second half: vals[midIdx+1..end]
  const firstHalfVals = vals.slice(0, midIdx + 1);
  const secondHalfVals = vals.slice(midIdx + 1); // [4, 5]

  // ── Phase 2: Reverse Second Half ──────────────────────────────────────────
  steps.push({
    explanation:
      `Phase 2 — Reverse second half [${secondHalfVals.join('→')}]. We reverse in-place using prev/current pointers. Result will be [${[...secondHalfVals].reverse().join('→')}].`,
    highlightLine: 27,
    state: {
      type: 'linked-list',
      nodes: [
        ...firstHalfVals.map((v, i) => ({
          id: `n${i}`,
          value: v,
          nextId: i < firstHalfVals.length - 1 ? `n${i + 1}` : null,
          state: 'default' as const,
        })),
        ...secondHalfVals.map((v, i) => ({
          id: `s${i}`,
          value: v,
          nextId: i < secondHalfVals.length - 1 ? `s${i + 1}` : null,
          state: i === 0 ? ('curr' as const) : ('default' as const),
        })),
      ],
      pointers: [
        { nodeId: 's0', label: 'current' },
        { nodeId: null, label: 'prev' },
      ],
    },
    variables: [
      { name: 'current.val', value: secondHalfVals[0] },
      { name: 'prev', value: 'None' },
    ],
  });

  const reversedSecond = [...secondHalfVals].reverse(); // [5, 4]

  // Reverse the second half in-place, ONE step per iteration of the while loop
  // (temp = current.next; current.next = prev; prev = current; current = temp).
  const shIds = secondHalfVals.map((_, i) => `s${i}`); // s0=4, s1=5
  const shVal: Record<string, number> = {};
  const shNext: Record<string, string | null> = {};
  secondHalfVals.forEach((v, i) => {
    shVal[shIds[i]] = v;
    shNext[shIds[i]] = i < shIds.length - 1 ? shIds[i + 1] : null;
  });

  const firstHalfNodes = () =>
    firstHalfVals.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: i < firstHalfVals.length - 1 ? `n${i + 1}` : null,
      state: 'default' as const,
    }));

  // Render second-half nodes following the current (possibly reversed) pointers:
  // the already-reversed chain hanging off `prevId`, then the untouched remainder from `curId`.
  const renderReverse = (prevId: string | null, curId: string | null): LinkedListNode[] => {
    const order: string[] = [];
    for (let p = prevId; p; p = shNext[p]) order.push(p);
    for (let c = curId; c; c = shNext[c]) order.push(c);
    return order.map((id) => ({
      id,
      value: shVal[id],
      nextId: shNext[id],
      state: id === curId ? ('curr' as const) : id === prevId ? ('active' as const) : ('done' as const),
    }));
  };

  {
    let prevId: string | null = null;
    let curId: string | null = shIds[0];
    let it = 0;
    while (curId) {
      it++;
      const temp: string | null = shNext[curId];
      shNext[curId] = prevId; // reverse this node's pointer
      const curVal = shVal[curId];
      steps.push({
        explanation: `Reverse iteration ${it}: temp = current.next = ${temp ? shVal[temp] : 'null'}. Point current (${curVal}).next back to prev (${prevId ? shVal[prevId] : 'None'}). Then advance: prev → ${curVal}, current → ${temp ? shVal[temp] : 'null'}.`,
        highlightLine: 31,
        state: {
          type: 'linked-list',
          nodes: [...firstHalfNodes(), ...renderReverse(curId, temp)],
          pointers: [
            { nodeId: curId, label: 'prev (new head)' },
            { nodeId: temp, label: 'current' },
          ],
        },
        variables: [
          { name: 'current', value: curVal, highlight: true },
          { name: 'prev', value: prevId ? shVal[prevId] : 'None' },
          { name: 'temp', value: temp ? shVal[temp] : 'null' },
        ],
      });
      prevId = curId;
      curId = temp;
    }

    steps.push({
      explanation: `current is null — reversal done. prev (node ${shVal[prevId!]}) is the new head of the second half: [${reversedSecond.join('→')}].`,
      highlightLine: 31,
      state: {
        type: 'linked-list',
        nodes: [...firstHalfNodes(), ...renderReverse(prevId, null)],
        pointers: [
          { nodeId: 'n0', label: 'head (firstHalf)' },
          { nodeId: prevId, label: 'prev (secondHalf)' },
        ],
      },
      variables: [
        { name: 'firstHalf', value: firstHalfVals.join('→') },
        { name: 'secondHalf', value: reversedSecond.join('→'), highlight: true },
      ],
    });
  }

  // ── Phase 3: Interleave Merge ──────────────────────────────────────────────
  steps.push({
    explanation:
      'Phase 3 — Interleave merge. firstHalf = [1→2→3], secondHalf = [5→4]. We alternate: take one from firstHalf, then one from secondHalf, repeating until secondHalf is exhausted.',
    highlightLine: 37,
    state: {
      type: 'linked-list',
      nodes: [
        ...firstHalfVals.map((v, i) => ({
          id: `n${i}`,
          value: v,
          nextId: i < firstHalfVals.length - 1 ? `n${i + 1}` : null,
          state: i === 0 ? ('curr' as const) : ('default' as const),
        })),
        ...reversedSecond.map((v, i) => ({
          id: `r${i}`,
          value: v,
          nextId: i < reversedSecond.length - 1 ? `r${i + 1}` : null,
          state: i === 0 ? ('next-node' as const) : ('default' as const),
        })),
      ],
      pointers: [
        { nodeId: 'n0', label: 'firstHalf' },
        { nodeId: 'r0', label: 'secondHalf' },
      ],
    },
    variables: [
      { name: 'firstHalf', value: firstHalfVals.join('→') },
      { name: 'secondHalf', value: reversedSecond.join('→') },
    ],
  });

  // Simulate merge steps
  // merge: 1→5→2→4→3
  const mergeOrder = [1, 5, 2, 4, 3];
  const mergeSteps = [
    { done: [1, 5], f: 2, s: 4, explanation: 'Place 1, then 5 after it (1→5). Advance firstHalf to 2, secondHalf to 4.' },
    { done: [1, 5, 2, 4], f: 3, s: null, explanation: 'Place 2, then 4 after it (…→2→4). Advance firstHalf to 3, secondHalf exhausted.' },
    { done: [1, 5, 2, 4, 3], f: null, s: null, explanation: 'secondHalf is null — loop ends. firstHalf (3) remains as the tail. Result: [1→5→2→4→3].' },
  ];

  for (const ms of mergeSteps) {
    const allVals = ms.done.concat(ms.f !== null ? [ms.f] : []).concat(ms.s !== null ? [ms.s] : []);
    const doneSet = new Set(ms.done);

    steps.push({
      explanation: ms.explanation,
      highlightLine: 46,
      state: {
        type: 'linked-list',
        nodes: mergeOrder.map((v, i) => ({
          id: `m${i}`,
          value: v,
          nextId: i < mergeOrder.length - 1 ? `m${i + 1}` : null,
          state: doneSet.has(v)
            ? ('done' as const)
            : v === ms.f
            ? ('curr' as const)
            : v === ms.s
            ? ('next-node' as const)
            : ('default' as const),
        })),
        pointers: [
          ...(ms.f !== null ? [{ nodeId: `m${mergeOrder.indexOf(ms.f)}`, label: 'firstHalf' }] : []),
          ...(ms.s !== null ? [{ nodeId: `m${mergeOrder.indexOf(ms.s)}`, label: 'secondHalf' }] : []),
        ],
      },
      variables: [
        { name: 'firstHalf', value: ms.f ?? 'null' },
        { name: 'secondHalf', value: ms.s ?? 'null' },
      ],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Find Middle + Reverse + Merge',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const reorderListMeta: AlgorithmMeta = {
  id: 'reorder-list',
  lcNumber: 143,
  title: 'Reorder List',
  difficulty: 'Medium',
  category: 'linked-list',
  tags: ['Linked List', 'Two Pointers', 'Stack'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'You are given the head of a singly linked-list L0 → L1 → … → Ln-1 → Ln. Reorder it to: L0 → Ln → L1 → Ln-1 → L2 → Ln-2 → … You may not modify the values in the nodes — only nodes themselves may be changed.',
  examples: [
    { input: 'head = [1,2,3,4]', output: '[1,4,2,3]' },
    { input: 'head = [1,2,3,4,5]', output: '[1,5,2,4,3]' },
  ] as ProblemExample[],
  constraints: [
    'The number of nodes in the list is in the range [1, 5×10⁴].',
    '1 ≤ Node.val ≤ 1000',
  ],
  hint: 'Three-phase O(n) approach: (1) find the middle with slow/fast pointers — slow ends at the midpoint; (2) reverse the second half in-place; (3) interleave-merge first half with reversed second half, always advancing secondHalf until it is null.',
  solutions: [solution],
};
