import { AlgorithmMeta, SolutionVariant, Step, GraphNode, GraphEdge, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's copyRandomList_20260804 verbatim: THREE passes over oldToNewMap
// (not two) — pass 1 builds the map, pass 2 wires .next only, pass 3 walks
// oldToNewMap.items() to wire .random — and the `if not head` guard sits at the very end,
// right before the return, not as an early return at the top.

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
      'Deep-copy a list where each node also has a random pointer (anywhere / null). Curved edges are random pointers, straight edges are next. Strategy (like copying a tree): a hashmap oldToNewMap from each original node to its fresh copy, built and wired in THREE passes — create copies, wire .next, then wire .random.',
    anchor: { match: 'oldToNewMap = {}' },
    state: buildState({}, new Set(), null, [{ label: 'oldToNewMap', value: 'empty' }]),
    variables: [],
  });

  // ── Pass 1: create copies, fill oldToNewMap ─────────────────────────────────
  steps.push({
    explanation:
      'Pass 1 — walk the list from head; for each original node create a bare copy (value only, no pointers yet) and store oldToNewMap[traversal] = newNode.',
    anchor: { match: '# construct the map' },
    state: buildState({ 0: 'active' }, new Set(), null, [{ label: 'pass', value: 1 }]),
    variables: [{ name: 'traversal.val', value: VALS[0] }],
  });

  const copied = new Set<number>();
  for (let i = 0; i < n; i++) {
    copied.add(i);
    mapEntries[VALS[i]] = `${VALS[i]}'`;
    steps.push({
      explanation: `Create copy ${VALS[i]}' for original ${VALS[i]}. Record oldToNewMap[${VALS[i]}] = ${VALS[i]}'. Advance traversal = traversal.next.`,
      anchor: { match: 'newNode = Node(traversal.val)', to: { match: 'oldToNewMap[traversal] = newNode' } },
      state: buildState({ [i]: 'active' }, new Set(copied), i, [
        { label: 'pass', value: 1 },
        { label: 'copies made', value: copied.size },
      ]),
      variables: [
        { name: 'traversal.val', value: VALS[i], highlight: true },
        { name: 'newNode.val', value: `${VALS[i]}'` },
      ],
    });
  }

  // ── Pass 2: wire .next on the copies ─────────────────────────────────────────
  steps.push({
    explanation:
      'Pass 2 — walk the list again from head. For each original, look up its copy, then set copy.next = oldToNewMap[traversal.next] (or None at the tail). .random is not touched here — that is pass 3.',
    anchor: { match: '# map next' },
    state: buildState({ 0: 'active' }, new Set(copied), 0, [{ label: 'pass', value: 2 }]),
    variables: [],
  });

  for (let i = 0; i < n; i++) {
    if (i < n - 1) copyNextEdges.push({ from: `c${i}`, to: `c${i + 1}`, state: 'default' });
    const nextTxt = i < n - 1 ? `${VALS[i + 1]}'` : 'None';
    steps.push({
      explanation: `Copy ${VALS[i]}': traversal.next ${i < n - 1 ? 'exists' : 'is None'}, so newNext = ${nextTxt}${i < n - 1 ? ' (oldToNewMap[traversal.next])' : ''}. oldToNewMap[traversal].next = ${nextTxt}.`,
      anchor: { match: 'newNext = None', to: { match: 'oldToNewMap[traversal].next = newNext' } },
      state: buildState({ [i]: 'active' }, new Set(copied), i, [
        { label: 'pass', value: 2 },
        { label: 'copy.next', value: nextTxt },
      ]),
      variables: [
        { name: 'copy', value: `${VALS[i]}'`, highlight: true },
        { name: 'copy.next', value: nextTxt },
      ],
    });
  }

  // ── Pass 3: wire .random by walking oldToNewMap.items() ─────────────────────
  steps.push({
    explanation:
      'Pass 3 — a THIRD pass, this time over oldToNewMap.items() (not the original list): for each (old, new) pair, if old.random is set, look it up in the map and assign new.random. The map guarantees every referenced copy already exists.',
    anchor: { match: '# go through the map and set the random' },
    state: buildState({}, new Set(copied), null, [{ label: 'pass', value: 3 }]),
    variables: [],
  });

  for (let i = 0; i < n; i++) {
    const r = RANDOM[i];
    const randTxt = r === null ? 'None' : `${VALS[r]}'`;
    if (r !== null) {
      copyRandomEdges.push({ from: `c${i}`, to: `c${r}`, state: 'found' });
      steps.push({
        explanation: `(old, new) = (${VALS[i]}, ${VALS[i]}'). old.random is set → newRandom = oldToNewMap[old.random] = ${randTxt}. new.random = ${randTxt}.`,
        anchor: { match: 'if old.random:', to: { match: 'new.random = newRandom' } },
        state: buildState({}, new Set(copied), i, [
          { label: 'pass', value: 3 },
          { label: 'copy.random', value: randTxt },
        ]),
        variables: [
          { name: 'old', value: VALS[i], highlight: true },
          { name: 'copy.random', value: randTxt },
        ],
      });
    } else {
      steps.push({
        explanation: `(old, new) = (${VALS[i]}, ${VALS[i]}'). old.random is None → the if old.random branch is skipped, new.random stays unset.`,
        anchor: { match: 'if old.random:' },
        state: buildState({}, new Set(copied), i, [
          { label: 'pass', value: 3 },
          { label: 'copy.random', value: randTxt },
        ]),
        variables: [
          { name: 'old', value: VALS[i], highlight: true },
          { name: 'copy.random', value: randTxt },
        ],
      });
    }
  }

  steps.push({
    explanation: `All three passes done. head is not None, so the guard falls through and we return oldToNewMap[head] = ${VALS[0]}' — the head of a fully independent deep copy. Time O(n), space O(n) for the map.`,
    anchor: { match: 'if not head:', to: { match: 'return oldToNewMap[head]' } },
    state: buildState({}, new Set(copied), 0, [{ label: 'return', value: `${VALS[0]}'` }]),
    variables: [{ name: 'return', value: `${VALS[0]}'`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Three-Pass HashMap (oldToNewMap)',
  variant: 'two-pass-map',
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
  hint: 'Copy it like a tree: a hashmap from each original node to its fresh copy. Pass 1 creates all the bare copies and fills the map; pass 2 wires each copy.next by looking the target up in the map; pass 3 walks the map itself to wire copy.random — so every reference already resolves to a copy, never an original.',
  solutions: [solution],
};
