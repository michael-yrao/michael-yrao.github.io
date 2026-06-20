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

  type NS = 'default' | 'active' | 'visited' | 'found';
  const ns: NS[] = new Array(n).fill('default');

  const parentMap: Record<number, number> = {};
  const rankMap: Record<number, number> = {};
  for (let i = 0; i < n; i++) { parentMap[i] = i; rankMap[i] = 0; }

  const mkParentDisplay = (): Record<string, string> => {
    const d: Record<string, string> = {};
    for (let i = 0; i < n; i++) d[String(i)] = String(parentMap[i]);
    return d;
  };

  const mkState = (currentEdge: string) => ({
    type: 'array' as const,
    cells: ns.map((state, i) => ({ value: i, state: state as import('../../core/models/algorithm.model').CellState })),
    pointers: [] as import('../../core/models/algorithm.model').Pointer[],
    stackItems: currentEdge ? [currentEdge] : [],
    counters: [] as { label: string; value: number }[],
    hashmap: mkParentDisplay() as Record<string | number, string>,
  });

  // Step 1: edge count check
  steps.push({
    explanation: 'A valid tree with n nodes must have exactly n−1 edges. len(edges)=4, n−1=4 → check passes. If this fails we can return False immediately without doing any work.',
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
    explanation: 'Initialize Union Find. parentMap[i]=i (every node is its own root — each is an isolated component). rankMap[i]=0 (all trees of height 0).',
    highlightLine: 8,
    state: mkState(''),
    variables: [
      { name: 'parentMap', value: '{0:0, 1:1, 2:2, 3:3, 4:4}' },
      { name: 'rankMap', value: '{0:0, 1:0, 2:0, 3:0, 4:0}' },
    ],
  });

  // Edge [0,1]: find
  ns[0] = 'active'; ns[1] = 'active';
  steps.push({
    explanation: 'Edge [0,1]: find(0)=0 (own root), find(1)=1 (own root). Different roots → no cycle, safe to union.',
    highlightLine: 19,
    state: mkState('[0, 1]'),
    variables: [
      { name: 'edge', value: '[0, 1]', highlight: true },
      { name: 'find(0)', value: 0 },
      { name: 'find(1)', value: 1 },
    ],
  });

  // Edge [0,1]: union — equal ranks, node1Root wins
  parentMap[1] = 0; rankMap[0] = 1;
  ns[0] = 'visited'; ns[1] = 'found';
  steps.push({
    explanation: 'Union [0,1]: ranks equal (both 0) → parentMap[1]=0, rankMap[0]++ → 1. Node 1 now under root 0.',
    highlightLine: 28,
    state: mkState('[0, 1]'),
    variables: [
      { name: 'parentMap[1]', value: 0, highlight: true },
      { name: 'rankMap[0]', value: 1, highlight: true },
    ],
  });

  // Edge [0,2]: find
  ns[2] = 'active';
  steps.push({
    explanation: 'Edge [0,2]: find(0)=0, find(2)=2. Different roots → no cycle.',
    highlightLine: 19,
    state: mkState('[0, 2]'),
    variables: [
      { name: 'edge', value: '[0, 2]', highlight: true },
      { name: 'find(0)', value: 0 },
      { name: 'find(2)', value: 2 },
    ],
  });

  // Edge [0,2]: union — rank[0]=1 > rank[2]=0
  parentMap[2] = 0;
  ns[2] = 'found';
  steps.push({
    explanation: 'Union [0,2]: rank[0]=1 > rank[2]=0 → parentMap[2]=0. Node 2 joins root 0. Component: {0,1,2}.',
    highlightLine: 24,
    state: mkState('[0, 2]'),
    variables: [
      { name: 'parentMap[2]', value: 0, highlight: true },
    ],
  });

  // Edge [0,3]: find
  ns[3] = 'active';
  steps.push({
    explanation: 'Edge [0,3]: find(0)=0, find(3)=3. Different roots → no cycle.',
    highlightLine: 19,
    state: mkState('[0, 3]'),
    variables: [
      { name: 'edge', value: '[0, 3]', highlight: true },
      { name: 'find(0)', value: 0 },
      { name: 'find(3)', value: 3 },
    ],
  });

  // Edge [0,3]: union — rank[0]=1 > rank[3]=0
  parentMap[3] = 0;
  ns[3] = 'found';
  steps.push({
    explanation: 'Union [0,3]: rank[0]=1 > rank[3]=0 → parentMap[3]=0. Node 3 joins root 0. Component: {0,1,2,3}.',
    highlightLine: 24,
    state: mkState('[0, 3]'),
    variables: [
      { name: 'parentMap[3]', value: 0, highlight: true },
    ],
  });

  // Edge [1,4]: find — path compression on node 1
  ns[4] = 'active'; ns[1] = 'active';
  steps.push({
    explanation: 'Edge [1,4]: find(1) → parentMap[1]=0 → find(0)=0. Path compression: parentMap[1] confirmed as 0. find(4)=4. Different roots → no cycle.',
    highlightLine: 19,
    state: mkState('[1, 4]'),
    variables: [
      { name: 'edge', value: '[1, 4]', highlight: true },
      { name: 'find(1)', value: '0 (via path compression)' },
      { name: 'find(4)', value: 4 },
    ],
  });

  // Edge [1,4]: union — rank[0]=1 > rank[4]=0
  parentMap[4] = 0;
  ns[1] = 'found'; ns[4] = 'found';
  steps.push({
    explanation: 'Union [1,4]: rank[0]=1 > rank[4]=0 → parentMap[4]=0. All 5 nodes now under root 0. Every edge merged without a cycle.',
    highlightLine: 24,
    state: mkState('[1, 4]'),
    variables: [
      { name: 'parentMap[4]', value: 0, highlight: true },
      { name: 'parentMap', value: '{0:0, 1:0, 2:0, 3:0, 4:0}' },
    ],
  });

  // Final: return True
  steps.push({
    explanation: 'All edges processed, no union returned False. The graph is connected (all nodes under one root) and acyclic → return True.',
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
  tags: ['Union Find', 'DFS', 'Graph'],
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
