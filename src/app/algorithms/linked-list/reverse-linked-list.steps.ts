import { AlgorithmMeta, Step, LinkedListNode } from '../../core/models/algorithm.model';

// Traces cse-progress's reverseListIterative and reverseListRecursion verbatim —
// both already match this walkthrough's variable names (prev/current/temp,
// head/returnNode), so only the anchors change here, not the control flow.

// ── Solution 1: Iterative ─────────────────────────────────────────────────────

function generateIterativeSteps(): Step[] {
  const vals = [1, 2, 3, 4, 5];
  const steps: Step[] = [];

  const makeNodes = (
    prevIdx: number | null,
    currIdx: number | null,
    reversed: number
  ): LinkedListNode[] =>
    vals.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: i < vals.length - 1 ? `n${i + 1}` : null,
      state:
        i < reversed
          ? 'done'
          : i === prevIdx
          ? 'prev'
          : i === currIdx
          ? 'curr'
          : 'default',
    }));

  steps.push({
    explanation:
      "prev, current = None, head — one assignment, two pointers. prev starts at None (the new tail's next will be None). current starts at head. We'll move one step at a time, redirecting each node's next pointer.",
    anchor: { match: 'prev, current = None, head' },
    state: {
      type: 'linked-list',
      nodes: makeNodes(null, 0, 0),
      pointers: [
        { nodeId: null, label: 'prev' },
        { nodeId: 'n0', label: 'current' },
      ],
    },
    variables: [
      { name: 'prev', value: 'null' },
      { name: 'current', value: vals[0] },
    ],
  });

  let prev: number | null = null;
  let curr = 0;
  let reversed = 0;

  while (curr < vals.length) {
    const next = curr + 1 < vals.length ? curr + 1 : null;

    steps.push({
      explanation: `temp = current.next (node ${next !== null ? vals[next] : 'null'}) — saved before we overwrite current.next, or we'd lose our forward reference.`,
      anchor: { match: 'temp = current.next' },
      state: {
        type: 'linked-list',
        nodes: makeNodes(prev, curr, reversed),
        pointers: [
          { nodeId: prev !== null ? `n${prev}` : null, label: 'prev' },
          { nodeId: `n${curr}`, label: 'current' },
          { nodeId: next !== null ? `n${next}` : null, label: 'temp' },
        ],
      },
      variables: [
        { name: 'prev', value: prev !== null ? vals[prev] : 'null' },
        { name: 'current', value: vals[curr], highlight: true },
        { name: 'temp', value: next !== null ? vals[next] : 'null', highlight: true },
      ],
    });

    steps.push({
      explanation: `current.next = prev — node ${vals[curr]} now points backward. This is the reversal: one arrow flipped at a time.`,
      anchor: { match: 'current.next = prev' },
      state: {
        type: 'linked-list',
        nodes: vals.map((v, i) => ({
          id: `n${i}`,
          value: v,
          nextId: i < reversed ? (i > 0 ? `n${i - 1}` : null) : i < vals.length - 1 ? `n${i + 1}` : null,
          state:
            i < reversed
              ? 'done'
              : i === curr
              ? 'curr'
              : i === (prev ?? -1)
              ? 'prev'
              : 'default',
        })),
        pointers: [
          { nodeId: prev !== null ? `n${prev}` : null, label: 'prev' },
          { nodeId: `n${curr}`, label: 'current' },
        ],
      },
      variables: [
        { name: 'current', value: vals[curr], highlight: true },
        { name: 'current.next', value: prev !== null ? vals[prev] : 'null', highlight: true },
        { name: 'prev', value: prev !== null ? vals[prev] : 'null' },
      ],
    });

    steps.push({
      explanation: `prev = current, then current = temp. This reversal is committed — the window moves one step forward.`,
      anchor: { match: 'prev = current', to: { match: 'current = temp' } },
      state: {
        type: 'linked-list',
        nodes: makeNodes(curr, next, curr + 1),
        pointers: [
          { nodeId: `n${curr}`, label: 'prev' },
          { nodeId: next !== null ? `n${next}` : null, label: 'current' },
        ],
      },
      variables: [
        { name: 'prev', value: vals[curr], highlight: true },
        { name: 'current', value: next !== null ? vals[next] : 'null', highlight: true },
      ],
    });

    reversed = curr + 1;
    prev = curr;
    curr = next !== null ? next : vals.length;
  }

  steps.push({
    explanation: `current is None — while current is not None exits. return prev, which now points to the new head (${vals[vals.length - 1]}). The list is fully reversed with O(1) space.`,
    anchor: { match: 'return prev' },
    state: {
      type: 'linked-list',
      nodes: vals.map((v, i) => ({
        id: `n${i}`,
        value: v,
        nextId: i > 0 ? `n${i - 1}` : null,
        state: 'done' as const,
      })).reverse(),
      pointers: [{ nodeId: `n${vals.length - 1}`, label: 'head' }],
    },
    variables: [
      { name: 'prev', value: vals[vals.length - 1], highlight: true },
      { name: 'current', value: 'null' },
    ],
  });

  return steps;
}

// ── Solution 2: Recursive ─────────────────────────────────────────────────────

function generateRecursiveSteps(): Step[] {
  const vals = [1, 2, 3, 4, 5];
  const n = vals.length;
  const steps: Step[] = [];

  // Mutable nextIds array — updated at each unwind step to show pointer changes
  const nextIds: (string | null)[] = vals.map((_, i) => i < n - 1 ? `n${i + 1}` : null);

  const makeNodes = (
    stateMap: Record<number, LinkedListNode['state']>
  ): LinkedListNode[] =>
    vals.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: nextIds[i],
      state: stateMap[i] ?? 'default' as const,
    }));

  // ── Intro ──────────────────────────────────────────────────────
  steps.push({
    explanation:
      "Recursive approach: dive to the end of the list first, then reverse pointers on the way back. Two key lines on unwind: head.next.next = head (flip the arrow) and head.next = None (sever the forward link).",
    anchor: { match: 'def reverseListRecursion(self, head: Optional[ListNode]) -> Optional[ListNode]:' },
    state: {
      type: 'linked-list',
      nodes: makeNodes({}),
      pointers: [{ nodeId: 'n0', label: 'head' }],
    },
    variables: [
      { name: 'head', value: vals[0] },
    ],
  });

  // ── Recursive descent ─────────────────────────────────────────
  steps.push({
    explanation: `Recursion dives right: reverseListRecursion(1) → reverseListRecursion(2) → … → reverseListRecursion(5). Node 5 has head.next is None — base case: if head is None or head.next is None: return head. Return node 5 as returnNode. No work done on the way in, only on the way back.`,
    anchor: { match: 'if head is None or head.next is None:', to: { match: 'return head' } },
    state: {
      type: 'linked-list',
      nodes: makeNodes({ 0: 'active', 1: 'active', 2: 'active', 3: 'active', 4: 'curr' }),
      pointers: [
        { nodeId: `n${n - 1}`, label: 'head' },
        { nodeId: `n${n - 1}`, label: 'returnNode' },
      ],
    },
    variables: [
      { name: 'head', value: vals[n - 1], highlight: true },
      { name: 'head.next', value: 'None → base case!', highlight: true },
      { name: 'returnNode', value: vals[n - 1] },
    ],
  });

  // ── Unwind: reverse one pointer at each level ─────────────────
  for (let headIdx = n - 2; headIdx >= 0; headIdx--) {
    const oldHead = vals[headIdx];
    const oldNext = vals[headIdx + 1];

    // Apply the two reversal lines:
    // head.next.next = head  →  nextIds[headIdx + 1] = `n${headIdx}`
    // head.next = None       →  nextIds[headIdx] = null
    nextIds[headIdx + 1] = `n${headIdx}`;
    nextIds[headIdx] = null;

    const stateMap: Record<number, LinkedListNode['state']> = {};
    for (let i = 0; i < headIdx; i++) stateMap[i] = 'active';
    stateMap[headIdx] = 'curr';
    for (let i = headIdx + 1; i < n; i++) stateMap[i] = 'done';

    steps.push({
      explanation: `Returning with head=${oldHead}: head.next.next = head → ${oldNext}.next = ${oldHead} (arrow flipped). head.next = None → ${oldHead}.next = None (forward link severed). Reversed so far: ${vals.slice(headIdx).reverse().join('→')}.`,
      anchor: { match: 'head.next.next = head', to: { match: 'head.next = None' } },
      state: {
        type: 'linked-list',
        nodes: makeNodes(stateMap),
        pointers: [
          { nodeId: `n${headIdx}`, label: 'head' },
          { nodeId: `n${n - 1}`, label: 'returnNode' },
        ],
      },
      variables: [
        { name: 'head', value: oldHead, highlight: true },
        { name: 'head.next.next', value: `→ ${oldHead}`, highlight: true },
        { name: 'head.next', value: 'None', highlight: true },
        { name: 'returnNode', value: vals[n - 1] },
      ],
    });
  }

  // ── Final ──────────────────────────────────────────────────────
  steps.push({
    explanation: `All pointers reversed. returnNode (${vals[n - 1]}) bubbles up through every stack frame as the new head. O(n) time, O(n) space for the call stack (one frame per node).`,
    anchor: { match: 'return returnNode' },
    state: {
      type: 'linked-list',
      nodes: vals.map((v, i) => ({
        id: `n${i}`,
        value: v,
        nextId: nextIds[i],
        state: 'done' as const,
      })).reverse(),
      pointers: [{ nodeId: `n${n - 1}`, label: 'head' }],
    },
    variables: [
      { name: 'returnNode', value: vals[n - 1], highlight: true },
    ],
  });

  return steps;
}

// ── Export ────────────────────────────────────────────────────────────────────

export const reverseLinkedListMeta: AlgorithmMeta = {
  id: 'reverse-linked-list',
  lcNumber: 206,
  title: 'Reverse Linked List',
  difficulty: 'Easy',
  category: 'linked-list',
  tags: ['Linked List', 'Two Pointers', 'Recursion'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
  examples: [
    { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' },
    { input: 'head = [1,2]', output: '[2,1]' },
    { input: 'head = []', output: '[]' },
  ],
  constraints: [
    'The number of nodes in the list is in the range [0, 5000].',
    '-5000 <= Node.val <= 5000',
  ],
  hint: 'To reverse a node\'s pointer, you need to know both where it currently points AND what was behind it. How many pointers do you need to track those things?',
  solutions: [
    { label: 'Iterative', variant: 'iterative', generateSteps: generateIterativeSteps },
    { label: 'Recursive', variant: 'recursive', generateSteps: generateRecursiveSteps },
  ],
};
