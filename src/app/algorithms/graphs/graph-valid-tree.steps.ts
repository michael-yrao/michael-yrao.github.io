import { AlgorithmMeta, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `def validTree(self, n: int, edges: List[List[int]]) -> bool:
    if len(edges) != n - 1:
        return False

    parentMap = {}
    rankMap = {}

    for i in range(n):
        parentMap[i] = i
        rankMap[i] = 0

    def find(node):
        if parentMap[node] == node:
            return parentMap[node]
        parentMap[node] = find(parentMap[node])
        return parentMap[node]

    def union(node1, node2):
        node1Root = find(node1)
        node2Root = find(node2)
        if node1Root == node2Root:
            return False
        if rankMap[node1Root] > rankMap[node2Root]:
            parentMap[node2Root] = node1Root
        elif rankMap[node2Root] > rankMap[node1Root]:
            parentMap[node1Root] = node2Root
        else:
            parentMap[node2Root] = node1Root
            rankMap[node1Root] += 1
        return True

    for node1, node2 in edges:
        if not union(node1, node2):
            return False

    return True`;

function generateSteps(): Step[] {
  const n = 5;
  const edgeList: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 4]];
  const steps: Step[] = [];

  const NODE_POS = [
    { id: 0, x: 220, y: 90  },
    { id: 1, x: 100, y: 190 },
    { id: 2, x: 220, y: 240 },
    { id: 3, x: 340, y: 190 },
    { id: 4, x: 40,  y: 290 },
  ];

  type NS = 'default' | 'active' | 'visited' | 'found';
  type ES = 'default' | 'active' | 'visited' | 'found';
  const ns: NS[] = new Array(n).fill('default');
  const es: ES[] = new Array(edgeList.length).fill('default');
  const parent = [0, 1, 2, 3, 4];
  const rank = [0, 0, 0, 0, 0];

  const mkState = (currentEdge: string) => ({
    type: 'graph' as const,
    nodes: NODE_POS.map((p, i) => ({ ...p, state: ns[i] })),
    edges: edgeList.map(([from, to], i) => ({ from, to, state: es[i] })),
    hashmapLabel: 'parent',
    hashmap: Object.fromEntries(parent.map((p, i) => [String(i), p])) as Record<string | number, number>,
    hashmap2Label: 'rank',
    hashmap2: Object.fromEntries(rank.map((r, i) => [String(i), r])) as Record<string | number, number>,
    stackItems: currentEdge ? [currentEdge] : [],
  });

  // Step 1: edge count check
  steps.push({
    explanation: 'A valid tree with n nodes must have exactly n−1 edges. len(edges)=4, n−1=4 → check passes.',
    highlightLine: 2,
    state: mkState(''),
    variables: [
      { name: 'n', value: 5 },
      { name: 'edges', value: '[[0,1],[0,2],[0,3],[1,4]]' },
      { name: 'len(edges)', value: 4 },
      { name: 'n − 1', value: 4 },
    ],
  });

  // Step 2: init
  steps.push({
    explanation: 'Initialize Union Find. parent[i]=i, rank[i]=0 — every node is its own root.',
    highlightLine: 8,
    state: mkState(''),
    variables: [
      { name: 'parent', value: '[0,1,2,3,4]' },
      { name: 'rank', value: '[0,0,0,0,0]' },
    ],
  });

  // Edge [0,1]: find
  ns[0] = 'active'; ns[1] = 'active'; es[0] = 'active';
  steps.push({
    explanation: 'Edge [0,1]: find(0)=0, find(1)=1. Different roots → no cycle, safe to union.',
    highlightLine: 19,
    state: mkState('[0, 1]'),
    variables: [
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 1 },
    ],
  });

  // Edge [0,1]: union — equal ranks
  parent[1] = 0; rank[0] = 1;
  ns[0] = 'visited'; ns[1] = 'found'; es[0] = 'visited';
  steps.push({
    explanation: 'Ranks equal → parent[1]=0, rank[0]→1. Node 1 is a child of root 0.',
    highlightLine: 28,
    state: mkState('[0, 1]'),
    variables: [
      { name: 'parent[1]', value: 0, highlight: true },
      { name: 'rank[0]', value: 1, highlight: true },
    ],
  });

  // Edge [0,2]: find
  ns[2] = 'active'; es[1] = 'active';
  steps.push({
    explanation: 'Edge [0,2]: find(0)=0, find(2)=2. Different roots → no cycle.',
    highlightLine: 19,
    state: mkState('[0, 2]'),
    variables: [
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 2 },
    ],
  });

  // Edge [0,2]: union — rank[0]=1 > rank[2]=0
  parent[2] = 0;
  ns[2] = 'found'; es[1] = 'visited';
  steps.push({
    explanation: 'rank[0]=1 > rank[2]=0 → parent[2]=0. Component: {0,1,2} under root 0.',
    highlightLine: 24,
    state: mkState('[0, 2]'),
    variables: [
      { name: 'parent[2]', value: 0, highlight: true },
    ],
  });

  // Edge [0,3]: find
  ns[3] = 'active'; es[2] = 'active';
  steps.push({
    explanation: 'Edge [0,3]: find(0)=0, find(3)=3. Different roots → no cycle.',
    highlightLine: 19,
    state: mkState('[0, 3]'),
    variables: [
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 3 },
    ],
  });

  // Edge [0,3]: union — rank[0]=1 > rank[3]=0
  parent[3] = 0;
  ns[3] = 'found'; es[2] = 'visited';
  steps.push({
    explanation: 'rank[0]=1 > rank[3]=0 → parent[3]=0. Component: {0,1,2,3} under root 0.',
    highlightLine: 24,
    state: mkState('[0, 3]'),
    variables: [
      { name: 'parent[3]', value: 0, highlight: true },
    ],
  });

  // Edge [1,4]: find — path compression
  ns[1] = 'active'; ns[4] = 'active'; es[3] = 'active';
  steps.push({
    explanation: 'Edge [1,4]: find(1)→parent[1]=0→parent[0]=0 (path compression). find(4)=4. Roots 0 vs 4 → no cycle.',
    highlightLine: 19,
    state: mkState('[1, 4]'),
    variables: [
      { name: 'node1Root', value: '0 (path compression)' },
      { name: 'node2Root', value: 4 },
    ],
  });

  // Edge [1,4]: union — rank[0]=1 > rank[4]=0
  parent[4] = 0;
  ns[1] = 'found'; ns[4] = 'found'; es[3] = 'visited';
  steps.push({
    explanation: 'rank[0]=1 > rank[4]=0 → parent[4]=0. All 5 nodes under root 0.',
    highlightLine: 24,
    state: mkState('[1, 4]'),
    variables: [
      { name: 'parent[4]', value: 0, highlight: true },
    ],
  });

  // Final: return True
  steps.push({
    explanation: 'All edges processed — no cycle detected. All nodes share root 0 (connected). Acyclic + connected → return True.',
    highlightLine: 36,
    state: mkState(''),
    variables: [
      { name: 'result', value: 'True', highlight: true },
    ],
  });

  return steps;
}

export const graphValidTreeMeta: AlgorithmMeta = {
  id: 'graph-valid-tree',
  lcNumber: 261,
  title: 'Graph Valid Tree',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Union Find', 'DFS'],
  timeComplexity: 'O(n · α(n))',
  spaceComplexity: 'O(n)',
  description: 'Given n nodes labeled 0 to n−1 and a list of undirected edges, determine if the edges form a valid tree (connected, no cycles).',
  examples: [
    {
      input: 'n = 5, edges = [[0,1],[0,2],[0,3],[1,4]]',
      output: 'true',
      explanation: 'All nodes connected, no cycles.',
    },
    {
      input: 'n = 5, edges = [[0,1],[1,2],[2,3],[1,3],[1,4]]',
      output: 'false',
      explanation: 'len(edges)=5 ≠ n−1=4 — cycle present.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ n ≤ 2000',
    '0 ≤ edges.length ≤ 5000',
    'edges[i].length == 2',
    'No duplicate edges',
    'Edges are undirected',
  ],
  hint: 'A valid tree has exactly n−1 edges. Use Union Find: if any edge connects two nodes already in the same component, a cycle exists.',
  solutions: [
    { label: 'Union Find', pythonCode: PYTHON_CODE, generateSteps },
  ],
};
