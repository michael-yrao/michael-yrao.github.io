import { AlgorithmMeta, Step, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced verbatim from cse-progress:
// dsa/leetcode/graphs/684_redundant_connection.py (findRedundantConnection = Union Find)

const PYTHON_CODE = `def findRedundantConnection(self, edges: List[List[int]]) -> List[int]:
    # trees are connected and have no cycles
    # so we are trying to find an edge to remove that makes this graph a tree
    # if multiple are found, we found the latest in the list
    # we are basically just doing cycle finding and then remove last edge that causes the cycle
    # disjoint sets / union find to find cycles in a graph
    # since we know we started with a tree with n edges, we know we started with n - 1 nodes
    # we added one edge to make a cycle, so we know this problem has n edges and n nodes
    # union find: for all the nodes, we connect the nodes to the root parent
    # (union by rank and path compression) - Time complexity of O(α(n)), inverse Ackerman function
    # Union by Rank and Path Compression both aim to compress the linked list from naive union find
    # Union by Rank - pre-emptively attacks the linked list problem
    # Path Compression - reacts to the linked list problem after the fact

    numberOfNodes = len(edges)

    # node -> parent mapping
    # start by setting the current node's parent to itself
    # base case for union find before we go through each edge
    # the node is its own isolated component
    parentMap = {}
    rankMap = {}

    # 1 -> numberOfNodes + 1 since the problem starts with node 1 and not node 0
    for i in range(1,numberOfNodes+1):
        parentMap[i] = i

    # union by rank, start with a rank of 0 for everything
    # node -> rank mapping
    for i in range(1,numberOfNodes+1):
        rankMap[i] = 0

    # find the root of node
    def find(node):
        # if node is its own parent
        # we return parent node, this is base case of union find
        if node == parentMap[node]:
            return parentMap[node]
        # otherwise, we find the root of this node until we get to the starting root
        parentMap[node] = find(parentMap[node])
        return parentMap[node]

    # merges two nodes together
    # returns True for successful merge
    # returns False for bad merge, e.g. cycle found
    def union(node1, node2):
        node1Root = find(node1)
        node2Root = find(node2)
        if node1Root == node2Root:
            return False

        # if either ranks higher, we will compress by
        # setting the parent of the lower rank to the higher rank
        if rankMap[node1Root] < rankMap[node2Root]:
            parentMap[node1Root] = node2Root
        elif rankMap[node2Root] < rankMap[node1Root]:
            parentMap[node2Root] = node1Root
        else:
            # same level, we'll just preemptively set one higher rank
            parentMap[node2Root] = node1Root
            rankMap[node1Root] += 1
        return True

    for node1, node2 in edges:
        # if union was unsuccessful
        if not union(node1, node2):
            return [node1, node2]

    return []`;

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
    explanation: 'numberOfNodes=3. Initialize parentMap[i]=i (each node is its own root) and rankMap[i]=0. Nodes are 1-indexed, so we range from 1 to numberOfNodes.',
    highlightLine: 25,
    state: mkState(''),
    variables: [
      { name: 'numberOfNodes', value: 3 },
      { name: 'parentMap', value: '{1:1, 2:2, 3:3}' },
      { name: 'rankMap', value: '{1:0, 2:0, 3:0}' },
    ],
  });

  // Edge [1,2]: find
  ns[0] = 'active'; ns[1] = 'active'; es[0] = 'active';
  steps.push({
    explanation: 'Edge [1,2]: find(1)=1, find(2)=2. Different roots → no cycle, safe to union.',
    highlightLine: 47,
    state: mkState('[1, 2]'),
    variables: [
      { name: 'node1Root', value: 1 },
      { name: 'node2Root', value: 2 },
    ],
  });

  // Edge [1,2]: union — equal ranks
  parent[2] = 1; rank[1] = 1;
  ns[0] = 'visited'; ns[1] = 'found'; es[0] = 'visited';
  steps.push({
    explanation: 'Ranks equal → else branch: parentMap[2]=1, rankMap[1]→1. Node 2 is now a child of root 1.',
    highlightLine: 60,
    state: mkState('[1, 2]'),
    variables: [
      { name: 'parentMap[2]', value: 1, highlight: true },
      { name: 'rankMap[1]', value: 1, highlight: true },
    ],
  });

  // Edge [1,3]: find
  ns[2] = 'active'; es[1] = 'active';
  steps.push({
    explanation: 'Edge [1,3]: find(1)=1, find(3)=3. Different roots → no cycle.',
    highlightLine: 47,
    state: mkState('[1, 3]'),
    variables: [
      { name: 'node1Root', value: 1 },
      { name: 'node2Root', value: 3 },
    ],
  });

  // Edge [1,3]: union — rank[3]=0 < rank[1]=1 → elif branch
  parent[3] = 1;
  ns[2] = 'found'; es[1] = 'visited';
  steps.push({
    explanation: 'rankMap[3]=0 < rankMap[1]=1 → elif branch: parentMap[3]=1. All nodes {1,2,3} under root 1.',
    highlightLine: 57,
    state: mkState('[1, 3]'),
    variables: [
      { name: 'parentMap[3]', value: 1, highlight: true },
    ],
  });

  // Edge [2,3]: find — same root
  ns[1] = 'active'; ns[2] = 'active'; es[2] = 'active';
  steps.push({
    explanation: 'Edge [2,3]: find(2)→parentMap[2]=1. find(3)→parentMap[3]=1. Same root (1) — adding [2,3] would create a cycle.',
    highlightLine: 49,
    state: mkState('[2, 3]'),
    variables: [
      { name: 'find(2)', value: '1 (path compression)' },
      { name: 'find(3)', value: '1 (path compression)' },
      { name: 'node1Root === node2Root', value: 'True', highlight: true },
    ],
  });

  // Return redundant edge
  steps.push({
    explanation: 'union(2,3) returns False — same root means [2,3] closes a cycle. Return [2,3] as the redundant edge. O(n·α(n)) time, O(n) space.',
    highlightLine: 67,
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
    { label: 'Union Find', pythonCode: PYTHON_CODE, generateSteps },
  ],
};
