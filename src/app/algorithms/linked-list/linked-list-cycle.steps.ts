import { AlgorithmMeta, SolutionVariant, Step, LinkedListNode, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's hasCycle_20260701 verbatim: slow and fast are assigned on
// separate lines (not slow = fast = head), the loop condition is just `while fast:`,
// and the fast.next null check is an explicit early return INSIDE the loop body —
// not folded into the loop condition.

// [3,2,0,-4] where -4 (index 3) points back to index 1 (node 2)
const VALS = [3, 2, 0, -4];
const LAST_INDEX = VALS.length - 1;
const CYCLE_TARGET_INDEX = 1;

// next index for a given index; this fixed example always has a next (the list
// cycles), so the `if not fast.next: return False` branch never fires here.
const nextIndexOf = (i: number): number => (i === LAST_INDEX ? CYCLE_TARGET_INDEX : i + 1);

function generateFloydsSteps(): Step[] {
  const steps: Step[] = [];

  const makeNodes = (slowIdx: number, fastIdx: number): LinkedListNode[] =>
    VALS.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: i < VALS.length - 1 ? `n${i + 1}` : null,
      state:
        i === slowIdx && i === fastIdx
          ? ('active' as const)
          : i === slowIdx
          ? ('curr' as const)
          : i === fastIdx
          ? ('next-node' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation:
      "Floyd's cycle detection: slow = head, then fast = head — two separate assignments. slow moves 1 step per loop, fast moves 2. List: [3→2→0→-4→(back to 2)]. The -4 node's next pointer goes back to node 2.",
    anchor: { match: 'slow = head', to: { match: 'fast = head' } },
    state: {
      type: 'linked-list',
      nodes: makeNodes(0, 0),
      pointers: [
        { nodeId: 'n0', label: 'slow' },
        { nodeId: 'n0', label: 'fast' },
      ],
    },
    variables: [
      { name: 'slow.val', value: VALS[0] },
      { name: 'fast.val', value: VALS[0] },
    ],
  });

  let slow = 0;
  let fast = 0;

  // while fast: (fast is never null for this fixed cyclic example, so the loop
  // always re-enters; the `if not fast.next: return False` early return inside
  // never triggers here, but its check still runs every pass)
  while (true) {
    const newSlow = nextIndexOf(slow);
    const midFast = nextIndexOf(fast);
    const newFast = nextIndexOf(midFast);

    const met = newSlow === newFast;
    steps.push({
      explanation: `while fast: true → check if not fast.next: fast.next exists, so no early return. slow(${VALS[slow]}) = slow.next → slow(${VALS[newSlow]}). fast(${VALS[fast]}) = fast.next.next → fast(${VALS[newFast]}) via ${VALS[midFast]}. ${met ? 'slow == fast! Cycle confirmed → return True.' : 'slow != fast — loop continues.'}`,
      anchor: { match: 'while fast:', to: { match: 'fast = fast.next.next' } },
      state: {
        type: 'linked-list',
        nodes: makeNodes(newSlow, newFast),
        pointers: [
          { nodeId: `n${newSlow}`, label: 'slow' },
          { nodeId: `n${newFast}`, label: 'fast' },
        ],
      },
      variables: [
        { name: 'slow.val', value: VALS[newSlow], highlight: met },
        { name: 'fast.val', value: VALS[newFast], highlight: met },
        { name: 'slow == fast?', value: met ? 'YES → cycle!' : 'no', highlight: met },
      ],
    });

    slow = newSlow;
    fast = newFast;

    if (met) {
      steps.push({
        explanation: `if slow == fast: True — slow(${VALS[slow]}) and fast(${VALS[fast]}) are the same node. return True.`,
        anchor: { match: 'if slow == fast:', to: { match: 'return True', nth: 2 } }, // 2nd hit: the actual return (the 1st is the leading comment "# if slow == fast at any point, return True")
        state: {
          type: 'linked-list',
          nodes: makeNodes(slow, fast),
          pointers: [
            { nodeId: `n${slow}`, label: 'slow' },
            { nodeId: `n${fast}`, label: 'fast' },
          ],
        },
        variables: [{ name: 'return', value: 'True', highlight: true }],
      });
      break;
    }
  }

  return steps;
}

// ── Solution variant ────────────────────────────────────────────────────────

const floydsSolution: SolutionVariant = {
  label: "Floyd's Cycle Detection",
  variant: 'floyd',
  generateSteps: generateFloydsSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
};

export const linkedListCycleMeta: AlgorithmMeta = {
  id: 'linked-list-cycle',
  lcNumber: 141,
  title: 'Linked List Cycle',
  difficulty: 'Easy',
  category: 'linked-list',
  tags: ['Linked List', 'Two Pointers', "Floyd's"],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given head, the head of a linked list, determine if the linked list has a cycle in it. Return true if there is a cycle in the linked list, otherwise return false.',
  examples: [
    {
      input: 'head = [3,2,0,-4], pos = 1',
      output: 'true',
      explanation: 'There is a cycle where the tail connects to the node at index 1.',
    },
    {
      input: 'head = [1,2], pos = 0',
      output: 'true',
      explanation: 'There is a cycle where the tail connects to the node at index 0.',
    },
    {
      input: 'head = [1], pos = -1',
      output: 'false',
      explanation: 'There is no cycle in the linked list.',
    },
  ] as ProblemExample[],
  constraints: [
    'The number of nodes in the list is in the range [0, 10⁴].',
    '-10⁵ ≤ Node.val ≤ 10⁵',
    'pos is -1 or a valid index in the linked list.',
  ],
  hint: "Floyd's cycle detection: use two pointers — slow moves 1 step, fast moves 2 steps. If fast ever equals slow (after the start), there's a cycle. This runs in O(n) time and O(1) space.",
  solutions: [floydsSolution],
};
