import { AlgorithmMeta, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
    numberOfNodes = len(edges)
    parentMap = {}
    rankMap = {}

    for i in range(1, numberOfNodes + 1):
        parentMap[i] = i
        rankMap[i] = 0

    def find(node):
        if node == parentMap[node]:
            return parentMap[node]
        parentMap[node] = find(parentMap[node])
        return parentMap[node]

    def union(node1, node2):
        node1Root = find(node1)
        node2Root = find(node2)
        if node1Root == node2Root:
            return False
        if rankMap[node1Root] < rankMap[node2Root]:
            parentMap[node1Root] = node2Root
        elif rankMap[node2Root] < rankMap[node1Root]:
            parentMap[node2Root] = node1Root
        else:
            parentMap[node2Root] = node1Root
            rankMap[node1Root] += 1
        return True

    for node1, node2 in edges:
        if not union(node1, node2):
            return [node1, node2]

    return []`;

function generateSteps(): Step[] {
  // edges = [[1,2],[1,3],[2,3]], nodes are 1-indexed
  const edgeList: [number, number][] = [[1, 2], [1, 3], [2, 3]];
  const n = 3;
  const steps: Step[] = [];

  type NS = 'default' | 'active' | 'visited' | 'found';
  // cells are indices 0-2 representing nodes 1, 2, 3
  const ns: NS[] = new Array(n).fill('default');

  const parentMap: Record<number, number> = { 1: 1, 2: 2, 3: 3 };
  const rankMap: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  const mkParentDisplay = (): Record<string, string> => {
    const d: Record<string, string> = {};
    for (let i = 1; i <= n; i++) d[String(i)] = String(parentMap[i]);
    return d;
  };

  const mkState = (currentEdge: string) => ({
    type: 'array' as const,
    // cells represent nodes 1, 2, 3 (displayed as their node number)
    cells: ns.map((state, i) => ({ value: i + 1, state: state as import('../../core/models/algorithm.model').CellState })),
    pointers: [] as import('../../core/models/algorithm.model').Pointer[],
    stackItems: currentEdge ? [currentEdge] : [],
    counters: [] as { label: string; value: number }[],
    hashmap: mkParentDisplay() as Record<string | number, string>,
  });

  // Step 1: init
  steps.push({
    explanation: 'numberOfNodes=3 (edges.length). Initialize Union Find with 1-indexed nodes. parentMap[i]=i (each node is its own root), rankMap[i]=0.',
    highlightLine: 2,
    state: mkState(''),
    variables: [
      { name: 'numberOfNodes', value: 3 },
      { name: 'parentMap', value: '{1:1, 2:2, 3:3}' },
      { name: 'rankMap', value: '{1:0, 2:0, 3:0}' },
    ],
  });

  // Edge [1,2]: find
  ns[0] = 'active'; ns[1] = 'active';
  steps.push({
    explanation: 'Edge [1,2]: find(1)=1, find(2)=2. Different roots → no cycle, safe to union.',
    highlightLine: 17,
    state: mkState('[1, 2]'),
    variables: [
      { name: 'edge', value: '[1, 2]', highlight: true },
      { name: 'find(1)', value: 1 },
      { name: 'find(2)', value: 2 },
    ],
  });

  // Edge [1,2]: union — equal ranks, node2Root(2) → node1Root(1)
  parentMap[2] = 1; rankMap[1] = 1;
  ns[0] = 'visited'; ns[1] = 'found';
  steps.push({
    explanation: 'Union [1,2]: ranks equal → parentMap[2]=1, rankMap[1]++ → 1. Node 2 now under root 1.',
    highlightLine: 25,
    state: mkState('[1, 2]'),
    variables: [
      { name: 'parentMap[2]', value: 1, highlight: true },
      { name: 'rankMap[1]', value: 1, highlight: true },
    ],
  });

  // Edge [1,3]: find
  ns[2] = 'active';
  steps.push({
    explanation: 'Edge [1,3]: find(1)=1, find(3)=3. Different roots → no cycle.',
    highlightLine: 17,
    state: mkState('[1, 3]'),
    variables: [
      { name: 'edge', value: '[1, 3]', highlight: true },
      { name: 'find(1)', value: 1 },
      { name: 'find(3)', value: 3 },
    ],
  });

  // Edge [1,3]: union — rank[1]=1 > rank[3]=0
  parentMap[3] = 1;
  ns[2] = 'found';
  steps.push({
    explanation: 'Union [1,3]: rank[1]=1 > rank[3]=0 → parentMap[3]=1. Node 3 joins root 1. All nodes now in one component {1,2,3}.',
    highlightLine: 23,
    state: mkState('[1, 3]'),
    variables: [
      { name: 'parentMap[3]', value: 1, highlight: true },
    ],
  });

  // Edge [2,3]: find — same root detected
  ns[1] = 'active'; ns[2] = 'active';
  steps.push({
    explanation: 'Edge [2,3]: find(2) → parentMap[2]=1 → find(1)=1. find(3) → parentMap[3]=1 → find(1)=1. Same root! Adding this edge would create a cycle.',
    highlightLine: 19,
    state: mkState('[2, 3]'),
    variables: [
      { name: 'edge', value: '[2, 3]', highlight: true },
      { name: 'find(2)', value: '1 (via path compression)' },
      { name: 'find(3)', value: '1 (via path compression)' },
      { name: 'node1Root === node2Root', value: 'True' },
    ],
  });

  // Return redundant edge
  steps.push({
    explanation: 'union(2,3) returns False (same root). This is the redundant edge — return [2,3]. O(n·α(n)) time, O(n) space.',
    highlightLine: 31,
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
  tags: ['Union Find', 'Graph'],
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
    { label: 'Union Find', pythonCode: PYTHON_CODE, generateSteps },
  ],
};
