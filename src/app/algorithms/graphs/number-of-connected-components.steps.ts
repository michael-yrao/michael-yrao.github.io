import { AlgorithmMeta, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def countComponents(self, n: int, edges: List[List[int]]) -> int:
        componentCounter = 0

        visited = set()

        adjMap = collections.defaultdict(list)

        for node1, node2 in edges:
            adjMap[node1].append(node2)
            adjMap[node2].append(node1)

        def bfs(node):
            queue = collections.deque()

            queue.append(node)

            visited.add(node)

            while queue:
                # pop node from queue
                currentNode = queue.popleft()
                # mark node as visited
                visited.add(currentNode)
                # add neighbors to the queue
                for neighbor in adjMap[currentNode]:
                    if neighbor not in visited:
                        queue.append(neighbor)

        for i in range(n):
            if i not in visited:
                bfs(i)
                componentCounter+=1

        return componentCounter`;

// n=5, edges=[[0,1],[1,2],[3,4]]
// adj: 0->[1], 1->[0,2], 2->[1], 3->[4], 4->[3]
// Component 1: {0,1,2}  Component 2: {3,4}

function generateSteps(): Step[] {
  const n = 5;
  const edgeList: [number, number][] = [[0, 1], [1, 2], [3, 4]];
  const steps: Step[] = [];

  const adj: Record<number, number[]> = {};
  for (let i = 0; i < n; i++) adj[i] = [];
  for (const [a, b] of edgeList) {
    adj[a].push(b);
    adj[b].push(a);
  }

  const adjDisplay: Record<string, string> = {};
  for (let i = 0; i < n; i++) {
    adjDisplay[String(i)] = `[${adj[i].join(', ')}]`;
  }

  type NS = 'default' | 'active' | 'visited' | 'found';
  const ns: NS[] = new Array(n).fill('default');
  const visited = new Set<number>();
  let comp = 0;

  const mkState = (queue: number[]) => ({
    type: 'array' as const,
    cells: ns.map((state, i) => ({ value: i, state: state as import('../../core/models/algorithm.model').CellState })),
    pointers: [] as import('../../core/models/algorithm.model').Pointer[],
    stackItems: queue.map(String),
    counters: [{ label: 'components', value: comp }],
    hashmap: adjDisplay as Record<string | number, string>,
  });

  // ── Step 1: Build adjMap ──────────────────────────────────────────────────

  steps.push({
    explanation:
      "Build the adjacency map. Each edge [a,b] adds b→adj[a] and a→adj[b] (undirected). adj: 0→[1], 1→[0,2], 2→[1], 3→[4], 4→[3]. Then scan nodes 0..4: each unvisited node starts one BFS, which marks an entire connected component.",
    highlightLine: 9,
    state: mkState([]),
    variables: [
      { name: 'n', value: 5 },
      { name: 'edges', value: '[[0,1],[1,2],[3,4]]' },
      { name: 'componentCounter', value: 0 },
    ],
  });

  // ── BFS Component 1: {0,1,2} ─────────────────────────────────────────────

  visited.add(0);
  ns[0] = 'found';
  steps.push({
    explanation:
      "Outer loop: i=0, not in visited → call bfs(0). Enqueue node 0 and immediately add it to visited so no neighbor re-enqueues it.",
    highlightLine: 31,
    state: mkState([0]),
    variables: [
      { name: 'i', value: 0, highlight: true },
      { name: 'queue', value: '[0]' },
      { name: 'visited', value: '{0}' },
    ],
  });

  ns[0] = 'active';
  ns[1] = 'found';
  visited.add(1);
  steps.push({
    explanation:
      "BFS: pop node 0. adj[0] = [1]. Node 1 is unvisited → enqueue it and mark visited.",
    highlightLine: 22,
    state: mkState([1]),
    variables: [
      { name: 'currentNode', value: 0, highlight: true },
      { name: 'adj[0]', value: '[1]' },
      { name: 'queue', value: '[1]' },
      { name: 'visited', value: '{0, 1}' },
    ],
  });

  ns[0] = 'visited';
  ns[1] = 'active';
  ns[2] = 'found';
  visited.add(2);
  steps.push({
    explanation:
      "BFS: pop node 1. adj[1] = [0, 2]. Node 0 is visited → skip. Node 2 is unvisited → enqueue.",
    highlightLine: 22,
    state: mkState([2]),
    variables: [
      { name: 'currentNode', value: 1, highlight: true },
      { name: 'adj[1]', value: '[0, 2]' },
      { name: 'queue', value: '[2]' },
      { name: 'visited', value: '{0, 1, 2}' },
    ],
  });

  ns[1] = 'visited';
  ns[2] = 'active';
  steps.push({
    explanation:
      "BFS: pop node 2. adj[2] = [1]. Node 1 is visited → skip. Queue is empty — the entire component {0, 1, 2} is explored.",
    highlightLine: 22,
    state: mkState([]),
    variables: [
      { name: 'currentNode', value: 2, highlight: true },
      { name: 'adj[2]', value: '[1]' },
      { name: 'queue', value: '∅' },
    ],
  });

  ns[2] = 'visited';
  comp = 1;
  steps.push({
    explanation:
      "bfs(0) returned. Increment componentCounter → 1. Component {0, 1, 2} discovered as one connected subgraph.",
    highlightLine: 33,
    state: mkState([]),
    variables: [
      { name: 'componentCounter', value: 1, highlight: true },
      { name: 'component 1', value: '{0, 1, 2}' },
    ],
  });

  // ── BFS Component 2: {3,4} ───────────────────────────────────────────────

  visited.add(3);
  ns[3] = 'found';
  steps.push({
    explanation:
      "Outer loop: i=1 visited → skip. i=2 visited → skip. i=3 not in visited → call bfs(3). Enqueue node 3.",
    highlightLine: 31,
    state: mkState([3]),
    variables: [
      { name: 'i', value: 3, highlight: true },
      { name: 'queue', value: '[3]' },
      { name: 'visited', value: '{0, 1, 2, 3}' },
    ],
  });

  ns[3] = 'active';
  ns[4] = 'found';
  visited.add(4);
  steps.push({
    explanation:
      "BFS: pop node 3. adj[3] = [4]. Node 4 is unvisited → enqueue.",
    highlightLine: 22,
    state: mkState([4]),
    variables: [
      { name: 'currentNode', value: 3, highlight: true },
      { name: 'adj[3]', value: '[4]' },
      { name: 'queue', value: '[4]' },
      { name: 'visited', value: '{0, 1, 2, 3, 4}' },
    ],
  });

  ns[3] = 'visited';
  ns[4] = 'active';
  steps.push({
    explanation:
      "BFS: pop node 4. adj[4] = [3]. Node 3 is visited → skip. Queue empty — component {3, 4} fully explored.",
    highlightLine: 22,
    state: mkState([]),
    variables: [
      { name: 'currentNode', value: 4, highlight: true },
      { name: 'adj[4]', value: '[3]' },
      { name: 'queue', value: '∅' },
    ],
  });

  ns[4] = 'visited';
  comp = 2;
  steps.push({
    explanation:
      "bfs(3) returned. Increment componentCounter → 2. Component {3, 4} discovered. i=4 is now visited; outer loop ends.",
    highlightLine: 33,
    state: mkState([]),
    variables: [
      { name: 'componentCounter', value: 2, highlight: true },
      { name: 'component 2', value: '{3, 4}' },
    ],
  });

  steps.push({
    explanation:
      "Return 2. Two connected components: {0–1–2} and {3–4}. Every node and edge is touched exactly once — O(n + e) time. O(n + e) space for the adjacency map and visited set.",
    highlightLine: 35,
    state: mkState([]),
    variables: [
      { name: 'result', value: 2, highlight: true },
    ],
  });

  return steps;
}

const PYTHON_CODE_UF = `def countComponents(self, n: int, edges: List[List[int]]) -> int:
    parentMap, rankMap = {}, {}
    componentCounter = n

    for i in range(n):
        parentMap[i] = i
        rankMap[i] = 0

    def findParent(node):
        if node == parentMap[node]:
            return parentMap[node]
        parentMap[node] = findParent(parentMap[node])
        return parentMap[node]

    def unionByRank(node1, node2):
        node1Root = findParent(node1)
        node2Root = findParent(node2)
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
        if unionByRank(node1, node2):
            componentCounter -= 1

    return componentCounter`;

function generateStepsUF(): Step[] {
  const n = 5;
  const edgeList: [number, number][] = [[0, 1], [1, 2], [3, 4]];
  const steps: Step[] = [];

  type NS = 'default' | 'active' | 'visited' | 'found';
  const ns: NS[] = new Array(n).fill('default');
  const parent = [0, 1, 2, 3, 4];
  const rank = [0, 0, 0, 0, 0];
  let comp = 5;

  const mkState = (edge?: [number, number]) => ({
    type: 'array' as const,
    cells: ns.map((state, i) => ({ value: i, state: state as import('../../core/models/algorithm.model').CellState })),
    pointers: [] as import('../../core/models/algorithm.model').Pointer[],
    stackItems: edge ? [`[${edge[0]}, ${edge[1]}]`] : [],
    counters: [{ label: 'components', value: comp }],
    hashmap: Object.fromEntries(parent.map((p, i) => [String(i), String(p)])) as Record<string | number, string>,
  });

  // Step 1: Init
  steps.push({
    explanation:
      'Start with componentCounter = n = 5. Every node begins as its own isolated component. parentMap: {0:0, 1:1, 2:2, 3:3, 4:4}. Each successful union will decrement the counter.',
    highlightLine: 4,
    state: mkState(),
    variables: [
      { name: 'n', value: 5 },
      { name: 'componentCounter', value: 5 },
      { name: 'parentMap', value: '{0:0, 1:1, 2:2, 3:3, 4:4}' },
      { name: 'rankMap', value: '{0:0, 1:0, 2:0, 3:0, 4:0}' },
    ],
  });

  // Edge [0,1]
  ns[0] = 'active'; ns[1] = 'active';
  steps.push({
    explanation:
      'Edge [0,1]: findParent(0)→0, findParent(1)→1. Different roots — safe to union.',
    highlightLine: 13,
    state: mkState([0, 1]),
    variables: [
      { name: 'node1', value: 0, highlight: true },
      { name: 'node2', value: 1, highlight: true },
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 1 },
    ],
  });

  parent[1] = 0; rank[0] = 1; comp = 4;
  ns[0] = 'visited'; ns[1] = 'found';
  steps.push({
    explanation:
      'Ranks equal → parentMap[1]=0, rankMap[0]→1. componentCounter→4. Node 1 merges into component rooted at 0.',
    highlightLine: 17,
    state: mkState([0, 1]),
    variables: [
      { name: 'parentMap[1]', value: 0, highlight: true },
      { name: 'rankMap[0]', value: 1, highlight: true },
      { name: 'componentCounter', value: 4, highlight: true },
    ],
  });

  // Edge [1,2]
  ns[1] = 'active'; ns[2] = 'active';
  steps.push({
    explanation:
      'Edge [1,2]: findParent(1)→parentMap[1]=0→findParent(0)=0 (path compression). findParent(2)=2. Roots 0 and 2 differ — safe to union.',
    highlightLine: 13,
    state: mkState([1, 2]),
    variables: [
      { name: 'node1', value: 1, highlight: true },
      { name: 'node2', value: 2, highlight: true },
      { name: 'node1Root', value: 0 },
      { name: 'node2Root', value: 2 },
    ],
  });

  parent[2] = 0; comp = 3;
  ns[1] = 'found'; ns[2] = 'found';
  steps.push({
    explanation:
      'rankMap[0]=1 > rankMap[2]=0 → parentMap[2]=0. componentCounter→3. Nodes {0,1,2} now share root 0.',
    highlightLine: 15,
    state: mkState([1, 2]),
    variables: [
      { name: 'parentMap[2]', value: 0, highlight: true },
      { name: 'componentCounter', value: 3, highlight: true },
    ],
  });

  // Edge [3,4]
  ns[3] = 'active'; ns[4] = 'active';
  steps.push({
    explanation:
      'Edge [3,4]: findParent(3)=3, findParent(4)=4. Different roots — safe to union.',
    highlightLine: 13,
    state: mkState([3, 4]),
    variables: [
      { name: 'node1', value: 3, highlight: true },
      { name: 'node2', value: 4, highlight: true },
      { name: 'node1Root', value: 3 },
      { name: 'node2Root', value: 4 },
    ],
  });

  parent[4] = 3; rank[3] = 1; comp = 2;
  ns[3] = 'visited'; ns[4] = 'found';
  steps.push({
    explanation:
      'Ranks equal → parentMap[4]=3, rankMap[3]→1. componentCounter→2. Nodes {3,4} merge into component rooted at 3.',
    highlightLine: 17,
    state: mkState([3, 4]),
    variables: [
      { name: 'parentMap[4]', value: 3, highlight: true },
      { name: 'rankMap[3]', value: 1, highlight: true },
      { name: 'componentCounter', value: 2, highlight: true },
    ],
  });

  steps.push({
    explanation:
      'All edges processed. Two components remain: {0,1,2} under root 0 and {3,4} under root 3. Return 2. O(n·α(n)) time — near-constant per union/find with path compression and union by rank.',
    highlightLine: 22,
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
  tags: ['BFS', 'Graph', 'Union Find'],
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
  hint: 'Each call to BFS from an unvisited node marks exactly one connected component. Count how many times you launch BFS.',
  solutions: [
    { label: 'BFS', pythonCode: PYTHON_CODE, generateSteps },
    { label: 'Union Find', pythonCode: PYTHON_CODE_UF, generateSteps: generateStepsUF },
  ],
};
