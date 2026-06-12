import { AlgorithmMeta, SolutionVariant, Step, LinkedListNode, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Hash Set ───────────────────────────────────────────────────────

const HASH_SET_CODE = `class Solution:
    def hasCycleHashSet(self, head: Optional[ListNode]) -> bool:
        # store visited nodes in a set
        # if we see the same node again, cycle detected
        seen = set()
        current = head
        while current:
            if current in seen:
                return True
            seen.add(current)
            current = current.next
        return False`;

function generateHashSetSteps(): Step[] {
  // [3,2,0,-4] where -4 points back to index 1 (node 2)
  const vals = [3, 2, 0, -4];
  const steps: Step[] = [];

  const makeNodes = (activeIdx: number | null, visitedSet: Set<number>): LinkedListNode[] =>
    vals.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: i < vals.length - 1 ? `n${i + 1}` : null,
      state:
        i === activeIdx
          ? ('curr' as const)
          : visitedSet.has(i)
          ? ('done' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation:
      'Hash Set approach: traverse nodes and store each in a set. If we encounter a node already in the set, we have a cycle. List: [3→2→0→-4→(back to 2)]. The tail (-4) points back to index 1 (node 2).',
    highlightLine: 2,
    state: {
      type: 'linked-list',
      nodes: makeNodes(null, new Set()),
      pointers: [{ nodeId: 'n0', label: 'head' }],
    },
    variables: [{ name: 'seen', value: '{}' }],
  });

  const seen = new Set<number>();
  let curr = 0;

  while (curr < vals.length) {
    if (seen.has(curr)) {
      steps.push({
        explanation: `current = node(${vals[curr]}) is already in seen! Cycle detected. Return True.`,
        highlightLine: 8,
        state: {
          type: 'linked-list',
          nodes: makeNodes(curr, seen),
          pointers: [{ nodeId: `n${curr}`, label: 'current' }],
        },
        variables: [
          { name: 'current.val', value: vals[curr], highlight: true },
          { name: 'in seen?', value: 'YES → cycle!', highlight: true },
        ],
      });
      break;
    }

    steps.push({
      explanation: `current = node(${vals[curr]}). Not in seen — add it. seen = {${[...seen, curr].map(i => vals[i]).join(', ')}}.`,
      highlightLine: 9,
      state: {
        type: 'linked-list',
        nodes: makeNodes(curr, seen),
        pointers: [{ nodeId: `n${curr}`, label: 'current' }],
      },
      variables: [
        { name: 'current.val', value: vals[curr], highlight: true },
        { name: 'seen size', value: seen.size + 1 },
      ],
    });

    seen.add(curr);

    // Simulate cycle: after node 3 (-4 at index 3), next is node 1 (val 2)
    if (curr === vals.length - 1) {
      curr = 1; // tail points back to index 1
    } else {
      curr++;
    }
  }

  return steps;
}

// ── Solution 2: Floyd's Cycle Detection ──────────────────────────────────────

const FLOYDS_CODE = `class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        # floyd's cycle detection algorithm
        slow = fast = head

        # we should traverse if fast has reached the end, not slow
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
            # will eventually meet if cycle
            if slow == fast:
                return True

        return False`;

function generateFloydsSteps(): Step[] {
  // [3,2,0,-4] where -4 points back to index 1 (node 2)
  // Simulate as 6 steps with a virtual extension to represent the cycle
  const vals = [3, 2, 0, -4];
  const steps: Step[] = [];

  // next[i]: index of the next node (-1 = null)
  const nextOf = (i: number): number => {
    if (i === 3) return 1; // cycle: -4 → 2
    if (i < vals.length - 1) return i + 1;
    return -1;
  };

  const makeNodes = (slowIdx: number, fastIdx: number): LinkedListNode[] =>
    vals.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: i < vals.length - 1 ? `n${i + 1}` : null,
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
      "Floyd's tortoise and hare: slow moves 1 step, fast moves 2 steps. If there's a cycle, fast will lap slow and they'll meet. If no cycle, fast reaches null first. List: [3→2→0→-4→(back to 2)]. The cycle means -4's next pointer goes back to node 2.",
    highlightLine: 3,
    state: {
      type: 'linked-list',
      nodes: makeNodes(0, 0),
      pointers: [
        { nodeId: 'n0', label: 'slow' },
        { nodeId: 'n0', label: 'fast' },
      ],
    },
    variables: [
      { name: 'slow.val', value: vals[0] },
      { name: 'fast.val', value: vals[0] },
    ],
  });

  let slow = 0;
  let fast = 0;
  let iteration = 0;

  // We'll run until slow === fast after at least one move, or until fast hits null
  while (true) {
    const nextSlow = nextOf(slow);
    const nextFast1 = nextOf(fast);
    const nextFast = nextFast1 === -1 ? -1 : nextOf(nextFast1);

    if (nextSlow === -1 || nextFast === -1) {
      steps.push({
        explanation: `fast (or fast.next) is null — no cycle detected. Return False.`,
        highlightLine: 11,
        state: {
          type: 'linked-list',
          nodes: makeNodes(slow, fast),
          pointers: [
            { nodeId: `n${slow}`, label: 'slow' },
            { nodeId: fast !== -1 ? `n${fast}` : null, label: 'fast' },
          ],
        },
        variables: [{ name: 'return', value: 'False', highlight: true }],
      });
      break;
    }

    const newSlow = nextSlow;
    const newFast = nextFast;
    iteration++;

    steps.push({
      explanation: `Iteration ${iteration}: slow(${vals[slow]}) → slow(${vals[newSlow]}) [+1]. fast(${vals[fast]}) → fast(${vals[newFast]}) [+2 via ${vals[nextFast1]}]. ${newSlow === newFast ? 'slow == fast! Cycle confirmed → return True.' : 'No meeting yet.'}`,
      highlightLine: newSlow === newFast ? 9 : 6,
      state: {
        type: 'linked-list',
        nodes: makeNodes(newSlow, newFast),
        pointers: [
          { nodeId: `n${newSlow}`, label: 'slow' },
          { nodeId: `n${newFast}`, label: 'fast' },
        ],
      },
      variables: [
        { name: 'slow.val', value: vals[newSlow], highlight: newSlow === newFast },
        { name: 'fast.val', value: vals[newFast], highlight: newSlow === newFast },
        { name: 'slow == fast?', value: newSlow === newFast ? 'YES → cycle!' : 'no', highlight: newSlow === newFast },
      ],
    });

    slow = newSlow;
    fast = newFast;

    if (slow === fast) break;
  }

  return steps;
}

// ── Solution variants ──────────────────────────────────────────────────────────

const hashSetSolution: SolutionVariant = {
  label: 'Hash Set',
  pythonCode: HASH_SET_CODE,
  generateSteps: generateHashSetSteps,
};

const floydsSolution: SolutionVariant = {
  label: "Floyd's Cycle Detection",
  pythonCode: FLOYDS_CODE,
  generateSteps: generateFloydsSteps,
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
  hint: "Floyd's cycle detection: use two pointers — slow moves 1 step, fast moves 2 steps. If fast ever equals slow (after the start), there's a cycle. This runs in O(n) time and O(1) space, beating the hash set approach's O(n) space.",
  solutions: [hashSetSolution, floydsSolution],
};
