import { AlgorithmMeta, Step, ProblemExample } from '../../core/models/algorithm.model';

// Solutions + comments sourced verbatim from cse-progress:
// dsa/leetcode/graphs/261_graph_valid_tree.py  (validTree = DFS, validTree_20260619_UnionFind = Union Find)

const PYTHON_CODE_DFS = `def validTree(self, n: int, edges: List[List[int]]) -> bool:
    # so we basically need to return whether or not this has a cycle
    # [[0,1],[1,2],[2,0]] would be invalid because 2 leads back to 0
    # so we can have a visited set and do adjacency map based on the input
    # we also need to verify all nodes are traversed since a disconnected node also means not a tree

    # visited means we have already gone this route
    # so we need to dfs on currentNode, parentNode
    # this way we know which direction we went
    visited = set()

    adjMap = collections.defaultdict(list)

    # notice that this is bidirectional
    # so we have to do adjMap both ways
    for firstNode, secondNode in edges:
        adjMap[firstNode].append(secondNode)
        adjMap[secondNode].append(firstNode)

    def dfs(currentNode, parentNode):
        # if we have seen this node, we are in a cycle thus return False
        if currentNode in visited:
            return False

        # if we haven't seen this node yet
        # let's add it to visited
        visited.add(currentNode)

        # now let's take a look at its neighbors
        for neighbor in adjMap[currentNode]:
            # neighbor will always have the same pair the opposite way
            # so we need to ignore that one
            if neighbor == parentNode:
                continue
            if not dfs(neighbor, currentNode):
                return False
        return True

    return dfs(0,-1) and len(visited) == n`;

const PYTHON_CODE_UF = `def validTree(self, n: int, edges: List[List[int]]) -> bool:
    # a tree is non-cyclic and is connected to every node
    # so we need to make sure we traversed through all nodes
    # so we should have a counter for how many nodes we've visited
    # we can actually use union find here
    # so we need parent map and rank map
    # from graph theory, we know that given n nodes
    # there will always be n - 1 edges

    if len(edges) != n - 1:
        return False

    parentMap = {}
    rankMap = {}

    # initialization phase
    # set parent to self
    # set rank to 0
    for i in range(n):
        parentMap[i] = i
        rankMap[i] = 0

    # find the root of node
    # this is path compression
    def find(node):
        # base case
        if parentMap[node] == node:
            return parentMap[node]
        # if we have an actual parent, let's find the root parent
        parentMap[node] = find(parentMap[node])
        return parentMap[node]

    # see if we can merge two nodes without making a cycle
    def union(node1, node2):
        # we first find the root parent of both nodes
        node1Root = find(node1)
        node2Root = find(node2)
        # if the root parents are the same, we are in a cycle
        if node1Root == node2Root:
            return False
        # otherwise, we check the rank of each and merge them

        if rankMap[node1Root] > rankMap[node2Root]:
            parentMap[node2Root] = node1Root
        elif rankMap[node2Root] > rankMap[node1Root]:
            parentMap[node1Root] = node2Root
        else:
            # if equal rank, then pick a random one to be parent and promote rank
            parentMap[node2Root] = node1Root
            rankMap[node1Root] += 1
        return True

    for node1, node2 in edges:
        if not union(node1, node2):
            return False

    return True`;

const N = 5;
const EDGE_LIST: [number, number][] = [[0, 1], [0, 2], [0, 3], [1, 4]];
const NODE_POS = [
  { id: 0, x: 220, y: 90 },
  { id: 1, x: 100, y: 190 },
  { id: 2, x: 220, y: 240 },
  { id: 3, x: 340, y: 190 },
  { id: 4, x: 40, y: 290 },
];

// ── Solution 1: DFS (adjacency map + visited-set cycle detection) ─────────────
function generateStepsDFS(): Step[] {
  const steps: Step[] = [];

  type ES = 'default' | 'active' | 'visited' | 'found';
  const es: ES[] = new Array(EDGE_LIST.length).fill('default');
  const adj: Record<number, number[]> = {};
  for (let i = 0; i < N; i++) adj[i] = [];
  for (const [a, b] of EDGE_LIST) { adj[a].push(b); adj[b].push(a); }
  const edgeIdx = (a: number, b: number) =>
    EDGE_LIST.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a));

  const visited = new Set<number>();
  const callStack: string[] = [];
  let depth = 0;

  const mkState = (current: number | null, done = false) => ({
    type: 'graph' as const,
    nodes: NODE_POS.map((p, i) => ({
      ...p,
      state: done
        ? ('found' as const)
        : i === current
        ? ('active' as const)
        : visited.has(i)
        ? ('visited' as const)
        : ('default' as const),
    })),
    edges: EDGE_LIST.map(([from, to], i) => ({ from, to, state: done ? ('found' as const) : es[i] })),
    hashmapLabel: 'visited',
    hashmap: Object.fromEntries([...visited].sort((a, b) => a - b).map((v) => [String(v), '✓'])) as Record<string | number, string>,
    stackLabel: 'call stack',
    stackItems: [...callStack],
    counters: [{ label: 'len(visited)', value: visited.size }],
  });

  steps.push({
    explanation:
      "DFS approach: a graph is a valid tree iff it has no cycle AND every node is reachable. Build a bidirectional adjacency map, then DFS from node 0 while remembering the parent we came from. If we ever reach an already-visited node that isn't the parent, that's a cycle. At the end, len(visited) == n confirms everything is connected.",
    highlightLine: 16,
    state: mkState(null),
    variables: [
      { name: 'n', value: N },
      { name: 'edges', value: '[[0,1],[0,2],[0,3],[1,4]]' },
      { name: 'adjMap', value: '{0:[1,2,3], 1:[0,4], 2:[0], 3:[0], 4:[1]}' },
    ],
  });

  function dfs(node: number, parent: number): boolean {
    depth++;
    callStack.push(`dfs(${node}, p=${parent})`);

    if (visited.has(node)) {
      steps.push({
        explanation: `dfs(${node}, parent=${parent}): node ${node} is ALREADY in visited, and we didn't get here via its parent — that means a cycle. Return False.`,
        highlightLine: 22,
        state: mkState(node),
        variables: [
          { name: 'currentNode', value: node },
          { name: 'in visited?', value: 'YES → cycle', highlight: true },
        ],
      });
      depth--; callStack.pop();
      return false;
    }

    visited.add(node);
    steps.push({
      explanation: `Call dfs(${node}, parent=${parent}) — push on the call stack (depth ${depth}). ${node} isn't in visited, so add it → visited = {${[...visited].sort((a, b) => a - b).join(', ')}}. Now look at ${node}'s neighbors: [${adj[node].join(', ')}].`,
      highlightLine: 27,
      state: mkState(node),
      variables: [
        { name: 'currentNode', value: node, highlight: true },
        { name: 'parentNode', value: parent },
        { name: 'len(visited)', value: visited.size },
      ],
    });

    for (const nb of adj[node]) {
      if (nb === parent) {
        steps.push({
          explanation: `Neighbor ${nb} == parentNode ${parent} → skip it. This is just the undirected edge we arrived on, not a new path.`,
          highlightLine: 33,
          state: mkState(node),
          variables: [
            { name: 'neighbor', value: nb },
            { name: 'action', value: 'skip (is parent)' },
          ],
        });
        continue;
      }
      const ei = edgeIdx(node, nb);
      es[ei] = 'active';
      steps.push({
        explanation: `Neighbor ${nb} ≠ parentNode ${parent} → recurse into dfs(${nb}, ${node}).`,
        highlightLine: 35,
        state: mkState(node),
        variables: [
          { name: 'currentNode', value: node },
          { name: 'recurse into', value: nb, highlight: true },
        ],
      });
      const ok = dfs(nb, node);
      es[ei] = ok ? 'visited' : 'active';
      if (!ok) { depth--; callStack.pop(); return false; }
      steps.push({
        explanation: `Back at node ${node}: dfs(${nb}) returned True (no cycle down that branch). Continue with ${node}'s remaining neighbors.`,
        highlightLine: 35,
        state: mkState(node),
        variables: [{ name: 'back at', value: node, highlight: true }],
      });
    }

    depth--; callStack.pop();
    steps.push({
      explanation: `Node ${node} fully explored — no cycle among its neighbors. Return True and pop it off the call stack (depth now ${depth}).`,
      highlightLine: 37,
      state: mkState(node),
      variables: [
        { name: 'return', value: 'True', highlight: true },
        { name: 'from node', value: node },
      ],
    });
    return true;
  }

  const ok = dfs(0, -1);
  const valid = ok && visited.size === N;
  steps.push({
    explanation: valid
      ? `dfs(0, -1) returned True (no cycle) AND len(visited) = ${visited.size} == n = ${N} (every node was reached → connected). Both conditions hold → it IS a valid tree. Return True.`
      : `Result fails: no-cycle=${ok}, len(visited)=${visited.size} vs n=${N}. Not a valid tree.`,
    highlightLine: 39,
    state: mkState(null, valid),
    variables: [
      { name: 'no cycle', value: String(ok) },
      { name: 'len(visited) == n', value: `${visited.size} == ${N} → ${visited.size === N}` },
      { name: 'result', value: String(valid), highlight: true },
    ],
  });

  return steps;
}

// ── Solution 2: Union Find (n−1 edge check + cycle detection on union) ────────
function generateStepsUF(): Step[] {
  const steps: Step[] = [];

  type NS = 'default' | 'active' | 'visited' | 'found';
  type ES = 'default' | 'active' | 'visited' | 'found';
  const ns: NS[] = new Array(N).fill('default');
  const es: ES[] = new Array(EDGE_LIST.length).fill('default');
  const parent = [0, 1, 2, 3, 4];
  const rank = [0, 0, 0, 0, 0];

  const mkState = (currentEdge: string) => ({
    type: 'graph' as const,
    nodes: NODE_POS.map((p, i) => ({ ...p, state: ns[i] })),
    edges: EDGE_LIST.map(([from, to], i) => ({ from, to, state: es[i] })),
    hashmapLabel: 'parent',
    hashmap: Object.fromEntries(parent.map((p, i) => [String(i), p])) as Record<string | number, number>,
    hashmap2Label: 'rank',
    hashmap2: Object.fromEntries(rank.map((r, i) => [String(i), r])) as Record<string | number, number>,
    stackItems: currentEdge ? [currentEdge] : [],
  });

  steps.push({
    explanation: 'A valid tree with n nodes must have exactly n−1 edges. len(edges)=4, n−1=4 → check passes, continue.',
    highlightLine: 10,
    state: mkState(''),
    variables: [
      { name: 'n', value: 5 },
      { name: 'edges', value: '[[0,1],[0,2],[0,3],[1,4]]' },
      { name: 'len(edges)', value: 4 },
      { name: 'n − 1', value: 4 },
    ],
  });

  steps.push({
    explanation: 'Initialize Union Find. parentMap[i]=i, rankMap[i]=0 — every node is its own root.',
    highlightLine: 19,
    state: mkState(''),
    variables: [
      { name: 'parent', value: '[0,1,2,3,4]' },
      { name: 'rank', value: '[0,0,0,0,0]' },
    ],
  });

  ns[0] = 'active'; ns[1] = 'active'; es[0] = 'active';
  steps.push({
    explanation: 'Edge [0,1]: find(0)=0, find(1)=1. Different roots → no cycle, safe to union.',
    highlightLine: 36,
    state: mkState('[0, 1]'),
    variables: [
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 1 },
    ],
  });

  parent[1] = 0; rank[0] = 1;
  ns[0] = 'visited'; ns[1] = 'found'; es[0] = 'visited';
  steps.push({
    explanation: 'Ranks equal → parentMap[1]=0, rankMap[0]→1. Node 1 is a child of root 0.',
    highlightLine: 49,
    state: mkState('[0, 1]'),
    variables: [
      { name: 'parent[1]', value: 0, highlight: true },
      { name: 'rank[0]', value: 1, highlight: true },
    ],
  });

  ns[2] = 'active'; es[1] = 'active';
  steps.push({
    explanation: 'Edge [0,2]: find(0)=0, find(2)=2. Different roots → no cycle.',
    highlightLine: 36,
    state: mkState('[0, 2]'),
    variables: [
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 2 },
    ],
  });

  parent[2] = 0;
  ns[2] = 'found'; es[1] = 'visited';
  steps.push({
    explanation: 'rank[0]=1 > rank[2]=0 → parentMap[2]=0. Component: {0,1,2} under root 0.',
    highlightLine: 44,
    state: mkState('[0, 2]'),
    variables: [{ name: 'parent[2]', value: 0, highlight: true }],
  });

  ns[3] = 'active'; es[2] = 'active';
  steps.push({
    explanation: 'Edge [0,3]: find(0)=0, find(3)=3. Different roots → no cycle.',
    highlightLine: 36,
    state: mkState('[0, 3]'),
    variables: [
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 3 },
    ],
  });

  parent[3] = 0;
  ns[3] = 'found'; es[2] = 'visited';
  steps.push({
    explanation: 'rank[0]=1 > rank[3]=0 → parentMap[3]=0. Component: {0,1,2,3} under root 0.',
    highlightLine: 44,
    state: mkState('[0, 3]'),
    variables: [{ name: 'parent[3]', value: 0, highlight: true }],
  });

  ns[1] = 'active'; ns[4] = 'active'; es[3] = 'active';
  steps.push({
    explanation: 'Edge [1,4]: find(1) → parentMap[1]=0 → parentMap[0]=0, and it compresses the path. find(4)=4. Roots 0 vs 4 → no cycle.',
    highlightLine: 30,
    state: mkState('[1, 4]'),
    variables: [
      { name: 'node1Root', value: '0 (path compression)' },
      { name: 'node2Root', value: 4 },
    ],
  });

  parent[4] = 0;
  ns[1] = 'found'; ns[4] = 'found'; es[3] = 'visited';
  steps.push({
    explanation: 'rank[0]=1 > rank[4]=0 → parentMap[4]=0. All 5 nodes share root 0.',
    highlightLine: 44,
    state: mkState('[1, 4]'),
    variables: [{ name: 'parent[4]', value: 0, highlight: true }],
  });

  steps.push({
    explanation: 'All edges processed with no union ever hitting the same root — no cycle. With exactly n−1 edges and no cycle, the graph is connected. Return True.',
    highlightLine: 57,
    state: mkState(''),
    variables: [{ name: 'result', value: 'True', highlight: true }],
  });

  return steps;
}

export const graphValidTreeMeta: AlgorithmMeta = {
  id: 'graph-valid-tree',
  lcNumber: 261,
  title: 'Graph Valid Tree',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['DFS', 'Union Find'],
  timeComplexity: 'O(n + e)',
  spaceComplexity: 'O(n + e)',
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
  hint: 'A valid tree is connected with no cycles. DFS: walk from node 0 tracking the parent; revisiting a non-parent node means a cycle, and len(visited)==n proves connectivity. Union Find: exactly n−1 edges, and if any edge joins two nodes already in the same component there is a cycle.',
  solutions: [
    { label: 'DFS', pythonCode: PYTHON_CODE_DFS, generateSteps: generateStepsDFS },
    { label: 'Union Find', pythonCode: PYTHON_CODE_UF, generateSteps: generateStepsUF },
  ],
};
