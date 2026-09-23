import { AlgorithmMeta, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's findRedundantConnection_20260622 verbatim: parentMap and rankMap
// are initialized together in ONE loop, the root-finder is named findParent, and the
// rank-compare branch order is "if node1Root's rank is HIGHER" first, then the elif for
// node1Root's rank being lower, then the equal-rank else.

function generateSteps(): Step[] {
  // 1-indexed nodes: 1, 2, 3
  const edgeList: [number, number][] = [[1, 2], [1, 3], [2, 3]];
  const steps: Step[] = [];

  const NODE_POS = [
    { id: 1, x: 200, y: 65  },
    { id: 2, x: 90,  y: 215 },
    { id: 3, x: 310, y: 215 },
  ];

  type NS = 'default' | 'active' | 'visited' | 'found';
  type ES = 'default' | 'active' | 'visited' | 'found';
  // ns[0]=node1, ns[1]=node2, ns[2]=node3
  const ns: NS[] = ['default', 'default', 'default'];
  const es: ES[] = ['default', 'default', 'default'];
  const parent: Record<number, number> = { 1: 1, 2: 2, 3: 3 };
  const rank: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  const mkState = (currentEdge: string) => ({
    type: 'graph' as const,
    nodes: NODE_POS.map((p, i) => ({ ...p, state: ns[i] })),
    edges: edgeList.map(([from, to], i) => ({ from, to, state: es[i] })),
    hashmapLabel: 'parentMap',
    hashmap: { '1': parent[1], '2': parent[2], '3': parent[3] } as Record<string | number, number>,
    hashmap2Label: 'rankMap',
    hashmap2: { '1': rank[1], '2': rank[2], '3': rank[3] } as Record<string | number, number>,
    stackItems: currentEdge ? [currentEdge] : [],
  });

  // Step 1: init
  steps.push({
    explanation: 'parentMap[i]=i (each node is its own root) and rankMap[i]=0 are set together in one loop over 1..len(edges). Nodes are 1-indexed.',
    anchor: { match: 'for i in range(1,len(edges)+1):', to: { match: 'rankMap[i] = 0' } },
    state: mkState(''),
    variables: [
      { name: 'parentMap', value: '{1:1, 2:2, 3:3}' },
      { name: 'rankMap', value: '{1:0, 2:0, 3:0}' },
    ],
  });

  // Edge [1,2]: findParent
  ns[0] = 'active'; ns[1] = 'active'; es[0] = 'active';
  steps.push({
    explanation: 'Edge [1,2]: findParent(1)=1, findParent(2)=2. Different roots → no cycle, safe to union.',
    anchor: { match: 'node1Root = findParent(node1)', to: { match: 'node2Root = findParent(node2)' } },
    state: mkState('[1, 2]'),
    variables: [
      { name: 'node1Root', value: 1 },
      { name: 'node2Root', value: 2 },
    ],
  });

  // Edge [1,2]: union — equal ranks → else branch
  parent[2] = 1; rank[1] = 1;
  ns[0] = 'visited'; ns[1] = 'found'; es[0] = 'visited';
  steps.push({
    explanation: 'Ranks equal → else branch: parentMap[2]=1, rankMap[1]→1. Node 2 is now a child of root 1.',
    // nth 2: the 1st 'parentMap[node2Root] = node1Root' is the if-branch's line, used below.
    anchor: { match: 'parentMap[node2Root] = node1Root', nth: 2, to: { match: 'rankMap[node1Root]+=1' } },
    state: mkState('[1, 2]'),
    variables: [
      { name: 'parentMap[2]', value: 1, highlight: true },
      { name: 'rankMap[1]', value: 1, highlight: true },
    ],
  });

  // Edge [1,3]: findParent
  ns[2] = 'active'; es[1] = 'active';
  steps.push({
    explanation: 'Edge [1,3]: findParent(1)=1, findParent(3)=3. Different roots → no cycle.',
    anchor: { match: 'node1Root = findParent(node1)', to: { match: 'node2Root = findParent(node2)' } },
    state: mkState('[1, 3]'),
    variables: [
      { name: 'node1Root', value: 1 },
      { name: 'node2Root', value: 3 },
    ],
  });

  // Edge [1,3]: union — rank[1]=1 > rank[3]=0 → if branch (first check in this attempt)
  parent[3] = 1;
  ns[2] = 'found'; es[1] = 'visited';
  steps.push({
    explanation: 'rankMap[node1Root]=1 > rankMap[node2Root]=0 → if branch (the first check): parentMap[3]=1. All nodes {1,2,3} under root 1.',
    // nth 1: the if-branch's line; the 2nd hit is the else-branch (equal ranks).
    anchor: { match: 'parentMap[node2Root] = node1Root', nth: 1 },
    state: mkState('[1, 3]'),
    variables: [
      { name: 'parentMap[3]', value: 1, highlight: true },
    ],
  });

  // Edge [2,3]: findParent — same root
  ns[1] = 'active'; ns[2] = 'active'; es[2] = 'active';
  steps.push({
    explanation: 'Edge [2,3]: findParent(2)→parentMap[2]=1. findParent(3)→parentMap[3]=1. Same root (1) — adding [2,3] would create a cycle.',
    anchor: { match: 'if node1Root == node2Root:' },
    state: mkState('[2, 3]'),
    variables: [
      { name: 'findParent(2)', value: '1 (path compression)' },
      { name: 'findParent(3)', value: '1 (path compression)' },
      { name: 'node1Root === node2Root', value: 'True', highlight: true },
    ],
  });

  // Return redundant edge
  steps.push({
    explanation: 'union(2,3) returns False — same root means [2,3] closes a cycle. Return [2,3] as the redundant edge. O(n·α(n)) time, O(n) space.',
    anchor: { match: 'return [node1, node2]' },
    state: mkState('[2, 3]'),
    variables: [
      { name: 'result', value: '[2, 3]', highlight: true },
    ],
  });

  return steps;
}

export const redundantConnectionMeta: AlgorithmMeta = {
  id: 'redundant-connection',
  lcNumber: 684,
  title: 'Redundant Connection',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Union Find'],
  timeComplexity: 'O(n · α(n))',
  spaceComplexity: 'O(n)',
  description: 'Given a graph that started as a tree with one extra edge added, find and return the redundant edge. If multiple answers exist, return the last one in the input.',
  examples: [
    {
      input: 'edges = [[1,2],[1,3],[2,3]]',
      output: '[2,3]',
      explanation: '[2,3] is redundant — removing it leaves a valid tree.',
    },
    {
      input: 'edges = [[1,2],[2,3],[3,4],[1,4],[1,5]]',
      output: '[1,4]',
      explanation: '[1,4] closes the cycle 1→2→3→4→1.',
    },
  ] as ProblemExample[],
  constraints: [
    'n == edges.length',
    '3 ≤ n ≤ 1000',
    'edges[i].length == 2',
    '1 ≤ aᵢ < bᵢ ≤ n',
    'No repeated edges',
    'Graph is connected',
  ],
  hint: "Process edges one by one with Union Find. The first edge whose two endpoints share the same root creates the cycle — that's the redundant edge.",
  solutions: [
    { label: 'Union Find', variant: 'union-find', generateSteps },
  ],
};
