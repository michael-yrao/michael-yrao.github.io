// Solution + comments sourced from cse-progress: dsa/leetcode/linked_list/138_copy_list_with_random_pointer.py
import { AlgorithmMeta, SolutionVariant, Step, GraphNode, GraphEdge, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def copyRandomList(self, head: 'Optional[Node]') -> 'Optional[Node]':
        # we can do an old to new mapping like how we do tree copies

        if not head:
            return None

        oldToNew = {}

        node = head
        while node:
            newNode = Node(node.val)
            oldToNew[node] = newNode
            node = node.next

        node = head
        while node:
            copy = oldToNew[node]
            if node.next:
                copy.next = oldToNew[node.next]
            if node.random:
                copy.random = oldToNew[node.random]
            node = node.next
        return oldToNew[head]`;

// Example list: [[val, randomIndex], ...] from the LeetCode prompt.
const VALS = [7, 13, 11, 10, 1];
const RANDOM: (number | null)[] = [null, 0, 4, 2, 0]; // random target index per node

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const n = VALS.length;

  // Layout: originals on the top row (y=0), copies on the bottom row (y=1).
  const OX = (i: number) => 60 + i * 90;
  const origNode = (i: number, state: GraphNode['state']): GraphNode => ({
    id: `o${i}`, x: OX(i), y: 60, state, label: `${VALS[i]}` });
  const copyNode = (i: number, state: GraphNode['state']): GraphNode => ({
    id: `c${i}`, x: OX(i), y: 190, state, label: `${VALS[i]}'` });

  // Original next-edges (default) + random-edges (marked 'visited' to distinguish).
  const origNextEdges: GraphEdge[] = [];
  for (let i = 0; i < n - 1; i++) origNextEdges.push({ from: `o${i}`, to: `o${i + 1}`, state: 'default' });
  const origRandomEdges: GraphEdge[] = [];
  RANDOM.forEach((t, i) => {
    if (t !== null) origRandomEdges.push({ from: `o${i}`, to: `o${t}`, state: 'visited' });
  });

  // Mutable copy-side edges, appended during pass 2.
  const copyNextEdges: GraphEdge[] = [];
  const copyRandomEdges: GraphEdge[] = [];

  const mapEntries: Record<string | number, string> = {}; // val → val' as we build oldToNew

  const buildState = (
    origStates: Record<number, GraphNode['state']>,
    copyIdx: Set<number>,
    copyActive: number | null,
    extraCounters: { label: string; value: number | string }[]
  ): Step['state'] => ({
    type: 'graph',
    directed: true,
    nodes: [
      ...VALS.map((_, i) => origNode(i, origStates[i] ?? 'default')),
      ...VALS.map((_, i) =>
        copyIdx.has(i) ? copyNode(i, i === copyActive ? 'active' : 'found') : null
      ).filter((x): x is GraphNode => x !== null),
    ],
    edges: [
      ...origNextEdges,
      ...origRandomEdges,
      ...copyNextEdges,
      ...copyRandomEdges,
    ],
    hashmap: { ...mapEntries },
    hashmapLabel: 'oldToNew',
    counters: extraCounters,
  });

  // ── Intro ──────────────────────────────────────────────────────────────────
  steps.push({
    explanation:
      'Deep-copy a list where each node also has a random pointer (anywhere / null). Curved edges are random pointers, straight edges are next. Strategy (like copying a tree): a hashmap oldToNew from each original node to its fresh copy, built in two passes.',
    highlightLine: 3,
    state: buildState({}, new Set(), null, [{ label: 'oldToNew', value: 'empty' }]),
    variables: [],
  });

  // ── Pass 1: create copies, fill oldToNew ────────────────────────────────────
  steps.push({
    explanation:
      'Pass 1 — walk the list; for each original node create a bare copy (value only, no pointers yet) and store oldToNew[node] = newNode.',
    highlightLine: 11,
    state: buildState({ 0: 'active' }, new Set(), null, [{ label: 'pass', value: 1 }]),
    variables: [{ name: 'node.val', value: VALS[0] }],
  });

  const copied = new Set<number>();
  for (let i = 0; i < n; i++) {
    copied.add(i);
    mapEntries[VALS[i]] = `${VALS[i]}'`;
    steps.push({
      explanation: `Create copy ${VALS[i]}' for original ${VALS[i]}. Record oldToNew[${VALS[i]}] = ${VALS[i]}'. Advance node = node.next.`,
      highlightLine: 13,
      state: buildState({ [i]: 'active' }, new Set(copied), i, [
        { label: 'pass', value: 1 },
        { label: 'copies made', value: copied.size },
      ]),
      variables: [
        { name: 'node.val', value: VALS[i], highlight: true },
        { name: 'newNode.val', value: `${VALS[i]}'` },
      ],
    });
  }

  // ── Pass 2: wire next + random on the copies ────────────────────────────────
  steps.push({
    explanation:
      'Pass 2 — walk the list again. For each original, look up its copy, then set copy.next = oldToNew[node.next] and copy.random = oldToNew[node.random]. The map guarantees every referenced copy already exists.',
    highlightLine: 17,
    state: buildState({ 0: 'active' }, new Set(copied), 0, [{ label: 'pass', value: 2 }]),
    variables: [],
  });

  for (let i = 0; i < n; i++) {
    if (i < n - 1) copyNextEdges.push({ from: `c${i}`, to: `c${i + 1}`, state: 'default' });
    const r = RANDOM[i];
    if (r !== null) copyRandomEdges.push({ from: `c${i}`, to: `c${r}`, state: 'found' });
    const nextTxt = i < n - 1 ? `${VALS[i + 1]}'` : 'None';
    const randTxt = r === null ? 'None' : `${VALS[r]}'`;
    steps.push({
      explanation: `Copy ${VALS[i]}': set .next → ${nextTxt} (oldToNew[node.next]) and .random → ${randTxt} (oldToNew[node.random]). Both pulled straight from the map — no dangling pointers to originals.`,
      highlightLine: 20,
      state: buildState({ [i]: 'active' }, new Set(copied), i, [
        { label: 'pass', value: 2 },
        { label: 'copy.next', value: nextTxt },
        { label: 'copy.random', value: randTxt },
      ]),
      variables: [
        { name: 'copy', value: `${VALS[i]}'`, highlight: true },
        { name: 'copy.next', value: nextTxt },
        { name: 'copy.random', value: randTxt },
      ],
    });
  }

  steps.push({
    explanation: `Both passes done. Return oldToNew[head] = ${VALS[0]}' — the head of a fully independent deep copy. Time O(n), space O(n) for the map.`,
    highlightLine: 26,
    state: buildState({}, new Set(copied), 0, [{ label: 'return', value: `${VALS[0]}'` }]),
    variables: [{ name: 'return', value: `${VALS[0]}'`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two-Pass HashMap (oldToNew)',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
};

export const copyListWithRandomPointerMeta: AlgorithmMeta = {
  id: 'copy-list-with-random-pointer',
  lcNumber: 138,
  title: 'Copy List with Random Pointer',
  difficulty: 'Medium',
  category: 'linked-list',
  tags: ['Linked List', 'Hash Table'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'A linked list of length n is given where each node has an extra random pointer that can point to any node or null. Construct a deep copy: n brand-new nodes whose next and random pointers mirror the original structure but reference only the new nodes.',
  examples: [
    { input: 'head = [[7,null],[13,0],[11,4],[10,2],[1,0]]', output: '[[7,null],[13,0],[11,4],[10,2],[1,0]]' },
  ] as ProblemExample[],
  constraints: ['0 ≤ n ≤ 1000', '-10⁴ ≤ Node.val ≤ 10⁴', 'Node.random is null or points to a node in the list.'],
  hint: 'Copy it like a tree: a hashmap from each original node to its fresh copy. Pass 1 creates all the bare copies and fills the map; pass 2 wires each copy.next and copy.random by looking the target up in the map — so every reference already resolves to a copy, never an original.',
  solutions: [solution],
};
