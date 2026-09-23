import { AlgorithmMeta, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's two attempts verbatim:
// - BFS variant → countComponents_20260706: fully inlined (no separate bfs() helper).
//   numOfComponents is incremented THE MOMENT an unvisited node is found — before BFS
//   even starts — not after the traversal returns. visited is only ever marked at
//   enqueue time, never re-marked at dequeue.
// - Union Find variant → countComponents_20260619_UnionFind: same parentMap/rankMap/
//   findParent/unionByRank structure already traced below — only anchors change.

// n=5, edges=[[0,1],[1,2],[3,4]]
// adj: 0->[1], 1->[0,2], 2->[1], 3->[4], 4->[3]
// Component 1: {0,1,2}  Component 2: {3,4}

function generateSteps(): Step[] {
  const n = 5;
  const edgeList: [number, number][] = [[0, 1], [1, 2], [3, 4]];
  const steps: Step[] = [];

  const NODE_POS = [
    { id: 0, x: 60,  y: 130 },
    { id: 1, x: 160, y: 130 },
    { id: 2, x: 260, y: 130 },
    { id: 3, x: 375, y: 90  },
    { id: 4, x: 375, y: 170 },
  ];

  type NS = 'default' | 'active' | 'visited' | 'found';
  type ES = 'default' | 'active' | 'visited' | 'found';
  const ns: NS[] = new Array(n).fill('default');
  const es: ES[] = new Array(edgeList.length).fill('default');
  let comp = 0;

  const mkState = (queue: number[]) => ({
    type: 'graph' as const,
    nodes: NODE_POS.map((p, i) => ({ ...p, state: ns[i] })),
    edges: edgeList.map(([from, to], i) => ({ from, to, state: es[i] })),
    stackItems: queue.map(String),
    stackLabel: 'queue',
    counters: [{ label: 'components', value: comp }],
  });

  // Step 1: Build adjMap (fully inlined attempt — no separate bfs() helper)
  steps.push({
    explanation: 'Build adjMap from edges. 0→[1], 1→[0,2], 2→[1], 3→[4], 4→[3]. Then scan nodes 0..4: each unvisited node is a NEW component — increment numOfComponents immediately, before BFS even starts.',
    anchor: { match: 'for node1, node2 in edges:', to: { match: 'adjMap[node2].append(node1)' } },
    state: mkState([]),
    variables: [
      { name: 'n', value: 5 },
      { name: 'edges', value: '[[0,1],[1,2],[3,4]]' },
      { name: 'numOfComponents', value: 0 },
    ],
  });

  // Step 2: i=0 unvisited → new component. numOfComponents+=1 BEFORE the BFS runs.
  ns[0] = 'found'; comp = 1;
  steps.push({
    explanation: 'i=0 not in visited → new component! numOfComponents+=1 → 1. Enqueue node 0 and mark it visited — the increment happens right here, before BFS traverses anything.',
    anchor: { match: 'numOfComponents+=1', to: { match: 'visited.add(i)' } },
    state: mkState([0]),
    variables: [
      { name: 'i', value: 0, highlight: true },
      { name: 'numOfComponents', value: 1, highlight: true },
      { name: 'queue', value: '[0]' },
    ],
  });

  // Step 3: Pop 0, discover 1
  ns[0] = 'active'; ns[1] = 'found'; es[0] = 'active';
  steps.push({
    explanation: 'Pop node 0. adjMap[0]=[1]. Node 1 unvisited → mark visited and enqueue.',
    anchor: { match: 'node = queue.popleft()', to: { match: 'queue.append(nb)' } },
    state: mkState([1]),
    variables: [
      { name: 'node', value: 0, highlight: true },
      { name: 'adjMap[0]', value: '[1]' },
      { name: 'queue', value: '[1]' },
    ],
  });

  // Step 4: Pop 1, discover 2
  ns[0] = 'visited'; ns[1] = 'active'; ns[2] = 'found'; es[0] = 'visited'; es[1] = 'active';
  steps.push({
    explanation: 'Pop node 1. adjMap[1]=[0,2]. Node 0 already visited — skip. Node 2 unvisited → mark visited and enqueue.',
    anchor: { match: 'node = queue.popleft()', to: { match: 'queue.append(nb)' } },
    state: mkState([2]),
    variables: [
      { name: 'node', value: 1, highlight: true },
      { name: 'adjMap[1]', value: '[0, 2]' },
      { name: 'queue', value: '[2]' },
    ],
  });

  // Step 5: Pop 2, queue empty
  ns[1] = 'visited'; ns[2] = 'active'; es[1] = 'visited';
  steps.push({
    explanation: 'Pop node 2. adjMap[2]=[1]. Node 1 already visited — nothing to enqueue. Queue empty — component {0,1,2} fully explored.',
    anchor: { match: 'node = queue.popleft()', to: { match: 'queue.append(nb)' } },
    state: mkState([]),
    variables: [
      { name: 'node', value: 2, highlight: true },
      { name: 'adjMap[2]', value: '[1]' },
      { name: 'queue', value: '∅' },
    ],
  });

  // Step 6: i=1,2 already visited; i=3 unvisited → new component.
  ns[2] = 'visited'; ns[3] = 'found'; comp = 2;
  steps.push({
    explanation: 'i=1,2 already visited — skip. i=3 not in visited → new component! numOfComponents+=1 → 2. Enqueue node 3 and mark it visited.',
    anchor: { match: 'numOfComponents+=1', to: { match: 'visited.add(i)' } },
    state: mkState([3]),
    variables: [
      { name: 'i', value: 3, highlight: true },
      { name: 'numOfComponents', value: 2, highlight: true },
      { name: 'queue', value: '[3]' },
    ],
  });

  // Step 7: Pop 3, discover 4
  ns[3] = 'active'; ns[4] = 'found'; es[2] = 'active';
  steps.push({
    explanation: 'Pop node 3. adjMap[3]=[4]. Node 4 unvisited → mark visited and enqueue.',
    anchor: { match: 'node = queue.popleft()', to: { match: 'queue.append(nb)' } },
    state: mkState([4]),
    variables: [
      { name: 'node', value: 3, highlight: true },
      { name: 'adjMap[3]', value: '[4]' },
      { name: 'queue', value: '[4]' },
    ],
  });

  // Step 8: Pop 4, queue empty
  ns[3] = 'visited'; ns[4] = 'active'; es[2] = 'visited';
  steps.push({
    explanation: 'Pop node 4. adjMap[4]=[3]. Node 3 already visited — nothing to enqueue. Queue empty — component {3,4} fully explored.',
    anchor: { match: 'node = queue.popleft()', to: { match: 'queue.append(nb)' } },
    state: mkState([]),
    variables: [
      { name: 'node', value: 4, highlight: true },
      { name: 'adjMap[4]', value: '[3]' },
      { name: 'queue', value: '∅' },
    ],
  });

  // Step 9: return
  ns[4] = 'visited';
  steps.push({
    explanation: 'i=4 already visited — outer loop ends. Return numOfComponents = 2: two connected components, {0–1–2} and {3–4}. Every node and edge visited exactly once — O(n + e) time, O(n + e) space.',
    anchor: { match: 'return numOfComponents' },
    state: mkState([]),
    variables: [
      { name: 'result', value: 2, highlight: true },
    ],
  });

  return steps;
}

function generateStepsUF(): Step[] {
  const n = 5;
  const edgeList: [number, number][] = [[0, 1], [1, 2], [3, 4]];
  const steps: Step[] = [];

  const NODE_POS = [
    { id: 0, x: 60,  y: 130 },
    { id: 1, x: 160, y: 130 },
    { id: 2, x: 260, y: 130 },
    { id: 3, x: 375, y: 90  },
    { id: 4, x: 375, y: 170 },
  ];

  type NS = 'default' | 'active' | 'visited' | 'found';
  type ES = 'default' | 'active' | 'visited' | 'found';
  const ns: NS[] = new Array(n).fill('default');
  const es: ES[] = new Array(edgeList.length).fill('default');
  const parent = [0, 1, 2, 3, 4];
  const rank = [0, 0, 0, 0, 0];
  let comp = 5;

  const mkState = () => ({
    type: 'graph' as const,
    nodes: NODE_POS.map((p, i) => ({ ...p, state: ns[i] })),
    edges: edgeList.map(([from, to], i) => ({ from, to, state: es[i] })),
    hashmapLabel: 'parentMap',
    hashmap: Object.fromEntries(parent.map((p, i) => [String(i), p])) as Record<string | number, number>,
    hashmap2Label: 'rankMap',
    hashmap2: Object.fromEntries(rank.map((r, i) => [String(i), r])) as Record<string | number, number>,
    counters: [{ label: 'components', value: comp }],
  });

  // Step 1: Init
  steps.push({
    explanation: 'componentCounter=5 (n=5 isolated nodes). parentMap[i]=i, rankMap[i]=0 — each node is its own root. Each successful union decrements the count.',
    anchor: { match: 'for i in range(n):', to: { match: 'rankMap[i] = 0' } },
    state: mkState(),
    variables: [
      { name: 'n', value: 5 },
      { name: 'componentCounter', value: 5 },
    ],
  });

  // Edge [0,1]: find
  ns[0] = 'active'; ns[1] = 'active'; es[0] = 'active';
  steps.push({
    explanation: 'Edge [0,1]: findParent(0)=0 (own root), findParent(1)=1 (own root). Roots differ — no cycle, safe to union.',
    anchor: { match: 'node1Root = findParent(node1)', to: { match: 'node2Root = findParent(node2)' } },
    state: mkState(),
    variables: [
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 1 },
    ],
  });

  // Edge [0,1]: union — equal ranks
  parent[1] = 0; rank[0] = 1; comp = 4;
  ns[0] = 'visited'; ns[1] = 'found'; es[0] = 'visited';
  steps.push({
    explanation: 'Ranks equal → else branch: parentMap[1]=0, rankMap[0]→1. componentCounter→4. Node 1 is now a child of root 0.',
    // nth 2: the 1st 'parentMap[node2Root] = node1Root' is the if-branch's line, used below.
    anchor: { match: 'parentMap[node2Root] = node1Root', nth: 2, to: { match: 'rankMap[node1Root] += 1' } },
    state: mkState(),
    variables: [
      { name: 'componentCounter', value: 4, highlight: true },
    ],
  });

  // Edge [1,2]: find
  ns[1] = 'active'; ns[2] = 'active'; es[1] = 'active';
  steps.push({
    explanation: 'Edge [1,2]: findParent(1)→parentMap[1]=0→parentMap[0]=0 (path compression). findParent(2)=2. Roots 0 vs 2 — safe to union.',
    anchor: { match: 'node1Root = findParent(node1)', to: { match: 'node2Root = findParent(node2)' } },
    state: mkState(),
    variables: [
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 2 },
    ],
  });

  // Edge [1,2]: union — rank[0]=1 > rank[2]=0
  parent[2] = 0; comp = 3;
  ns[1] = 'found'; ns[2] = 'found'; es[1] = 'visited';
  steps.push({
    explanation: 'rankMap[0]=1 > rankMap[2]=0 → if branch: parentMap[2]=0. componentCounter→3. All of {0,1,2} share root 0.',
    // nth 1: the if-branch's line; the 2nd hit is the else-branch (equal ranks).
    anchor: { match: 'parentMap[node2Root] = node1Root', nth: 1 },
    state: mkState(),
    variables: [
      { name: 'componentCounter', value: 3, highlight: true },
    ],
  });

  // Edge [3,4]: find
  ns[3] = 'active'; ns[4] = 'active'; es[2] = 'active';
  steps.push({
    explanation: 'Edge [3,4]: findParent(3)=3, findParent(4)=4. Both self-roots — safe to union.',
    anchor: { match: 'node1Root = findParent(node1)', to: { match: 'node2Root = findParent(node2)' } },
    state: mkState(),
    variables: [
      { name: 'node1Root', value: 3 },
      { name: 'node2Root', value: 4 },
    ],
  });

  // Edge [3,4]: union — equal ranks
  parent[4] = 3; rank[3] = 1; comp = 2;
  ns[3] = 'visited'; ns[4] = 'found'; es[2] = 'visited';
  steps.push({
    explanation: 'Ranks equal → else branch: parentMap[4]=3, rankMap[3]→1. componentCounter→2. {3,4} share root 3.',
    // nth 2: the 1st 'parentMap[node2Root] = node1Root' is the if-branch's line, used above.
    anchor: { match: 'parentMap[node2Root] = node1Root', nth: 2, to: { match: 'rankMap[node1Root] += 1' } },
    state: mkState(),
    variables: [
      { name: 'componentCounter', value: 2, highlight: true },
    ],
  });

  // Final
  steps.push({
    explanation: 'All edges processed. Two distinct roots — 0 (for {0,1,2}) and 3 (for {3,4}). Return 2. O(n·α(n)) time.',
    anchor: { match: 'return componentCounter' },
    state: mkState(),
    variables: [
      { name: 'result', value: 2, highlight: true },
    ],
  });

  return steps;
}

export const numberOfConnectedComponentsMeta: AlgorithmMeta = {
  id: 'number-of-connected-components',
  lcNumber: 323,
  title: 'Number of Connected Components in an Undirected Graph',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['BFS', 'Union Find'],
  timeComplexity: 'O(n + e)',
  spaceComplexity: 'O(n + e)',
  description:
    'Given n nodes (0 to n−1) and a list of undirected edges, return the number of connected components in the graph.',
  examples: [
    {
      input: 'n = 5, edges = [[0,1],[1,2],[3,4]]',
      output: '2',
      explanation: 'Nodes {0,1,2} form one component; {3,4} form another.',
    },
    {
      input: 'n = 5, edges = [[0,1],[1,2],[2,3],[3,4]]',
      output: '1',
      explanation: 'All nodes are connected in a single chain.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ n ≤ 2000',
    '1 ≤ edges.length ≤ 5000',
    'edges[i].length == 2',
    '0 ≤ aᵢ ≤ bᵢ < n',
    'No repeated edges',
  ],
  hint: 'Start with n components. For each edge, union the two endpoints — if they share a root, skip; otherwise merge and decrement the count. Union Find with path compression and union by rank runs in near-constant time per operation.',
  solutions: [
    { label: 'Union Find', variant: 'union-find', generateSteps: generateStepsUF, timeComplexity: 'O(n · α(n))', spaceComplexity: 'O(n)' },
    { label: 'BFS', variant: 'bfs', generateSteps, timeComplexity: 'O(n + e)', spaceComplexity: 'O(n + e)' },
  ],
};
