import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `# Definition for a Node.
class Node:
    def __init__(self, val = 0, neighbors = None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

class Solution:
    def cloneGraph(self, node: Optional['Node']) -> Optional['Node']:
        # ok so to do a deep copy, we need to do completely new nodes of each
        # and then after we do copy with newNode = Node(old.val, old.neighbors)
        # we need to be able to traverse through old.neighbors and give them to the newNode
        # so we have to a visited set?
        # or we have a map of old -> new node so that we can track neighbors
        # so what is our dfs going to accomplish
        #

        oldToNew = {}

        def dfs(oldNode):
            # if we already visited and created a copy of this node, exit
            if oldNode in oldToNew:
                return oldToNew[oldNode]

            # now that we know we are visiting a new node
            # we need to create a copy
            newNode = Node(oldNode.val)

            # map oldNode to newNode
            oldToNew[oldNode] = newNode

            # create copies of oldNode's neighbors and put them as newNode's neighbors
            for neighbor in oldNode.neighbors:
                newNode.neighbors.append(dfs(neighbor))

            return newNode

        return dfs(node)`;

// The graph: 1—2—3—4—1 (1 connects to 2,4; 2 connects to 1,3; 3 connects to 2,4; 4 connects to 1,3)
// We simulate DFS starting from node 1: 1 → 2 → 1(cached) → 3 → 2(cached) → 4 → 1(cached) → 3(cached) → back
// DFS order of first visits: 1, 2, 3, 4
const nodeValues = [1, 2, 3, 4];
const adjacency: Record<number, number[]> = {
  1: [2, 4],
  2: [1, 3],
  3: [2, 4],
  4: [1, 3],
};

function generateSteps(): Step[] {
  const steps: Step[] = [];
  // Track cloned map: key = "node N" → "clone N"
  const cloned: Record<string, string> = {};

  const snap = (activeVal: number | null, visitedVals: Set<number>) =>
    nodeValues.map(v => ({
      value: v,
      state:
        v === activeVal
          ? ('active' as const)
          : visitedVals.has(v)
          ? ('visited' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation: `Clone a connected undirected graph with 4 nodes. Adjacency: 1↔{2,4}, 2↔{1,3}, 3↔{2,4}, 4↔{1,3}. Strategy: DFS from node 1, maintaining a map oldToNew. When we visit a node for the first time, create its clone and record it. When we re-encounter a node, return the cached clone to avoid infinite loops.`,
    highlightLine: 17,
    state: {
      type: 'array',
      cells: nodeValues.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
      counters: [{ label: 'nodes cloned', value: 0 }],
    },
    variables: [
      { name: 'graph', value: 'adjList = [[2,4],[1,3],[2,4],[1,3]]' },
      { name: 'start', value: 'node 1' },
    ],
  });

  // Simulate DFS: 1 → 2 → 3 → 4
  const visited = new Set<number>();
  const dfsOrder = [1, 2, 3, 4]; // first-visit order in this graph

  for (const val of dfsOrder) {
    // Visit node val
    steps.push({
      explanation: `dfs(node ${val}): node ${val} not in oldToNew. Create clone of node ${val}. Map node${val} → clone${val} in oldToNew.`,
      highlightLine: 26,
      state: {
        type: 'array',
        cells: snap(val, new Set(visited)),
        pointers: [{ index: val - 1, label: 'visiting' }],
        hashmap: { ...cloned },
        counters: [{ label: 'nodes cloned', value: visited.size }],
      },
      variables: [
        { name: 'oldNode', value: `node ${val}` },
        { name: 'newNode', value: `clone ${val}` },
      ],
    });

    cloned[`node ${val}`] = `clone ${val}`;
    visited.add(val);

    // Show after mapping
    const neighbors = adjacency[val];
    steps.push({
      explanation: `node ${val} cloned and mapped. Now iterate over neighbors of node ${val}: [${neighbors.join(', ')}]. For each neighbor, call dfs(neighbor) and append result to clone${val}.neighbors.`,
      highlightLine: 32,
      state: {
        type: 'array',
        cells: snap(val, new Set(visited)),
        pointers: [{ index: val - 1, label: `clone ${val}` }],
        hashmap: { ...cloned },
        counters: [{ label: 'nodes cloned', value: visited.size }],
      },
      variables: [
        { name: 'node', value: val },
        { name: 'neighbors', value: `[${neighbors.join(', ')}]` },
      ],
    });

    // Show cached lookups for already-visited neighbors
    const cachedNeighbors = neighbors.filter(nb => visited.has(nb));
    if (cachedNeighbors.length > 0) {
      steps.push({
        explanation: `Processing neighbors of node ${val}: ${cachedNeighbors.map(nb => `node ${nb} already in oldToNew → return clone ${nb} (cached)`).join('; ')}. No re-clone needed — the map prevents infinite recursion on graph cycles.`,
        highlightLine: 22,
        state: {
          type: 'array',
          cells: nodeValues.map(v => ({
            value: v,
            state:
              cachedNeighbors.includes(v)
                ? ('found' as const)
                : v === val
                ? ('active' as const)
                : visited.has(v)
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [{ index: val - 1, label: `node ${val}` }],
          hashmap: { ...cloned },
          counters: [{ label: 'nodes cloned', value: visited.size }],
        },
        variables: [
          { name: 'cached lookups', value: cachedNeighbors.map(nb => `node ${nb}`).join(', ') },
        ],
      });
    }
  }

  // Final step: all nodes cloned
  steps.push({
    explanation: `DFS complete. All 4 nodes cloned and all neighbor references wired. oldToNew = {${Object.entries(cloned).map(([k, v]) => `${k}→${v}`).join(', ')}}. Return clone 1 as the entry point of the cloned graph. O(V+E) time (visit each node and edge once), O(V) space for oldToNew.`,
    highlightLine: 37,
    state: {
      type: 'array',
      cells: nodeValues.map(v => ({ value: v, state: 'found' as const })),
      pointers: [{ index: 0, label: 'return' }],
      hashmap: { ...cloned },
      counters: [{ label: 'nodes cloned', value: 4 }],
    },
    variables: [{ name: 'return', value: 'clone 1 (deep copy)', highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'DFS + HashMap (oldToNew)',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const cloneGraphMeta: AlgorithmMeta = {
  id: 'clone-graph',
  lcNumber: 133,
  title: 'Clone Graph',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['DFS', 'BFS', 'Hash Map'],
  timeComplexity: 'O(V+E)',
  spaceComplexity: 'O(V)',
  description:
    'Given a reference to a node in a connected undirected graph, return a deep copy (clone) of the graph. Each node contains an integer value and a list of its neighbors.',
  examples: [
    {
      input: 'adjList = [[2,4],[1,3],[2,4],[1,3]]',
      output: '[[2,4],[1,3],[2,4],[1,3]]',
      explanation: '4 nodes: 1↔{2,4}, 2↔{1,3}, 3↔{2,4}, 4↔{1,3}.',
    },
    {
      input: 'adjList = [[]]',
      output: '[[]]',
      explanation: 'Single node with no neighbors.',
    },
    {
      input: 'adjList = []',
      output: '[]',
      explanation: 'Empty graph.',
    },
  ] as ProblemExample[],
  constraints: [
    '0 ≤ number of nodes ≤ 100',
    '1 ≤ Node.val ≤ 100',
    'Node.val is unique for each node.',
    'No repeated edges, no self-loops.',
    'Graph is connected.',
  ],
  hint: 'Use DFS with a hashmap oldToNew. When you first visit a node, create its clone and store the mapping. When you encounter a node already in the map, return the cached clone — this is what breaks infinite loops on cycles. Then recurse into each neighbor and append the returned clone to the new node\'s neighbor list.',
  solutions: [solution],
};
