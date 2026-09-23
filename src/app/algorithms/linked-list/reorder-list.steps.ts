import { AlgorithmMeta, SolutionVariant, Step, LinkedListNode, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's reorderList_20260725 verbatim: phase 1 (find middle) is the same
// slow/fast walk as the earlier hand simulation, but phase 2 renames current/temp to
// traversal/nextNode and explicitly reassigns secondHead = prev after reversing, and phase 3
// merges by mutating `head`/`secondHead` themselves (no separate firstHalf/secondHalf
// variables) under `while head and secondHead:` — a condition that checks BOTH pointers,
// not just secondHead.

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
    anchor: { match: 'def reorderList_20260725(self, head: Optional[ListNode]) -> None:' },
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
      'Phase 1 — Find Middle. slow, fast = head, head. slow advances 1 step, fast advances 2 steps per iteration. When fast (or fast.next) is None, slow is at the middle.',
    anchor: { match: 'slow, fast = head, head' },
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
      explanation: `slow = slow.next → ${vals[slow]}. fast = fast.next.next → ${fast < vals.length ? vals[fast] : 'null'} (moved 2 steps). fast and fast.next still truthy — continue.`,
      anchor: { match: 'while fast and fast.next:', to: { match: 'fast = fast.next.next' } },
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
    explanation: `fast (or fast.next) is None — slow is at the middle (node ${vals[slow]}). secondHead = slow.next (node ${vals[slow + 1]}), then slow.next = None cuts the two halves apart.`,
    anchor: { match: 'secondHead = slow.next', to: { match: 'slow.next = None' } },
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
      `Phase 2 — Reverse second half [${secondHalfVals.join('→')}]. traversal = secondHead, prev = None; we reverse in-place using traversal/prev pointers. Result will be [${[...secondHalfVals].reverse().join('→')}].`,
    anchor: { match: 'traversal = secondHead', to: { match: 'prev = None' } },
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
        { nodeId: 's0', label: 'traversal' },
        { nodeId: null, label: 'prev' },
      ],
    },
    variables: [
      { name: 'traversal.val', value: secondHalfVals[0] },
      { name: 'prev', value: 'None' },
    ],
  });

  const reversedSecond = [...secondHalfVals].reverse(); // [5, 4]

  // Reverse the second half in-place, ONE step per iteration of the while loop
  // (nextNode = traversal.next; traversal.next = prev; prev = traversal; traversal = nextNode).
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
        explanation: `Reverse iteration ${it}: nextNode = traversal.next = ${temp ? shVal[temp] : 'null'}. Point traversal (${curVal}).next back to prev (${prevId ? shVal[prevId] : 'None'}). Then advance: prev → ${curVal}, traversal → ${temp ? shVal[temp] : 'null'}.`,
        anchor: { match: 'while traversal:', to: { match: 'traversal = nextNode' } },
        state: {
          type: 'linked-list',
          nodes: [...firstHalfNodes(), ...renderReverse(curId, temp)],
          pointers: [
            { nodeId: curId, label: 'prev (new head)' },
            { nodeId: temp, label: 'traversal' },
          ],
        },
        variables: [
          { name: 'traversal', value: curVal, highlight: true },
          { name: 'prev', value: prevId ? shVal[prevId] : 'None' },
          { name: 'nextNode', value: temp ? shVal[temp] : 'null' },
        ],
      });
      prevId = curId;
      curId = temp;
    }

    steps.push({
      explanation: `traversal is None — reversal done. secondHead = prev (node ${shVal[prevId!]}) becomes the new head of the second half: [${reversedSecond.join('→')}].`,
      anchor: { match: 'secondHead = prev' },
      state: {
        type: 'linked-list',
        nodes: [...firstHalfNodes(), ...renderReverse(prevId, null)],
        pointers: [
          { nodeId: 'n0', label: 'head (firstHalf)' },
          { nodeId: prevId, label: 'secondHead' },
        ],
      },
      variables: [
        { name: 'firstHalf', value: firstHalfVals.join('→') },
        { name: 'secondHead', value: reversedSecond.join('→'), highlight: true },
      ],
    });
  }

  // ── Phase 3: Interleave Merge ──────────────────────────────────────────────
  steps.push({
    explanation:
      'Phase 3 — Interleave merge. head = [1→2→3], secondHead = [5→4] — the SAME head pointer is reused, not a separate firstHalf variable. while head and secondHead: checks BOTH are still set (secondHead runs out first since it is never longer).',
    anchor: { match: 'while head and secondHead:' },
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
        { nodeId: 'n0', label: 'head' },
        { nodeId: 'r0', label: 'secondHead' },
      ],
    },
    variables: [
      { name: 'head', value: firstHalfVals.join('→') },
      { name: 'secondHead', value: reversedSecond.join('→') },
    ],
  });

  // Simulate merge steps
  // merge: 1→5→2→4→3
  const mergeOrder = [1, 5, 2, 4, 3];
  const mergeSteps = [
    {
      done: [1, 5], f: 2, s: 4,
      explanation: 'head and secondHead both truthy → enter. headNext=2, secondHeadNext=4. head.next=secondHead (1→5), secondHead.next=headNext (5→2). head=headNext (2), secondHead=secondHeadNext (4).',
    },
    {
      done: [1, 5, 2, 4], f: 3, s: null,
      explanation: 'head and secondHead both truthy → enter. headNext=3, secondHeadNext=None. head.next=secondHead (2→4), secondHead.next=headNext (4→3). head=headNext (3), secondHead=secondHeadNext (None).',
    },
  ];

  for (const ms of mergeSteps) {
    const doneSet = new Set(ms.done);

    steps.push({
      explanation: ms.explanation,
      anchor: { match: 'headNext = head.next', to: { match: 'secondHead = secondHeadNext' } },
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
          ...(ms.f !== null ? [{ nodeId: `m${mergeOrder.indexOf(ms.f)}`, label: 'head' }] : []),
          ...(ms.s !== null ? [{ nodeId: `m${mergeOrder.indexOf(ms.s)}`, label: 'secondHead' }] : []),
        ],
      },
      variables: [
        { name: 'head', value: ms.f ?? 'null' },
        { name: 'secondHead', value: ms.s ?? 'null' },
      ],
    });
  }

  steps.push({
    explanation: 'head=3 is truthy but secondHead=None is falsy — while head and secondHead: fails, loop ends. head (3) remains as the tail, already linked from the last iteration. Result: [1→5→2→4→3]. No return statement — head is reordered in place.',
    anchor: { match: 'while head and secondHead:' },
    state: {
      type: 'linked-list',
      nodes: mergeOrder.map((v, i) => ({
        id: `m${i}`,
        value: v,
        nextId: i < mergeOrder.length - 1 ? `m${i + 1}` : null,
        state: 'done' as const,
      })),
      pointers: [],
    },
    variables: [{ name: 'result', value: mergeOrder.join('→'), highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Find Middle + Reverse + Merge',
  variant: 'mid-reverse-merge',
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
