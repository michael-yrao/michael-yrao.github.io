// Solution + comments sourced from cse-progress: dsa/leetcode/graphs/1584_min_cost_to_connect_all_points.py
import { AlgorithmMeta, SolutionVariant, Step, GraphNode, GraphEdge, ProblemExample } from '../../core/models/algorithm.model';

const HEAP_PYTHON = `class Solution:
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        # Prim's MST via a min-heap of (edge cost, node); complete graph, no adj map
        numberOfNodes = len(points)
        totalCost = 0
        visited = set()

        def manhattanDistance(a, b):
            return abs(a[0] - b[0]) + abs(a[1] - b[1])

        minHeap = []
        heapq.heappush(minHeap, (0, 0))       # start at node 0, cost 0

        while len(visited) < numberOfNodes:
            cost, node = heapq.heappop(minHeap)
            if node in visited:               # already in the tree — skip
                continue
            totalCost += cost
            visited.add(node)
            for neighbor in range(numberOfNodes):
                if neighbor not in visited:
                    distance = manhattanDistance(points[node], points[neighbor])
                    heapq.heappush(minHeap, (distance, neighbor))
        return totalCost`;

const ARRAY_PYTHON = `class Solution:
    # O(n^2) Prim's — no heap; scan for the closest unvisited node each round
    def minCostConnectPoints(self, points: List[List[int]]) -> int:
        visited = set()
        distance = [math.inf] * len(points)
        distance[0] = 0

        def getClosestNode():
            closestDistance, closestNode = math.inf, -1
            for i in range(len(points)):
                if i not in visited and distance[i] < closestDistance:
                    closestDistance, closestNode = distance[i], i
            return closestNode

        def relax(index):
            for i in range(len(points)):
                if i not in visited and i != index:
                    manhattan = abs(points[i][0] - points[index][0]) + abs(points[i][1] - points[index][1])
                    distance[i] = min(distance[i], manhattan)

        while len(visited) < len(points):
            nextNode = getClosestNode()
            if nextNode == -1:
                return -1
            relax(nextNode)
            visited.add(nextNode)
        return sum(distance)`;

const POINTS: [number, number][] = [
  [0, 0],
  [2, 2],
  [3, 10],
  [5, 2],
  [7, 0],
];
const N = POINTS.length;
const manhattan = (a: [number, number], b: [number, number]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

const POS = (i: number) => ({ x: 40 + POINTS[i][0] * 32, y: 30 + POINTS[i][1] * 18 });

function nodeList(visited: Set<number>, active: number | null): GraphNode[] {
  return POINTS.map((p, i) => ({
    id: i,
    x: POS(i).x,
    y: POS(i).y,
    state: (i === active ? 'active' : visited.has(i) ? 'found' : 'default') as GraphNode['state'],
    label: `${i}(${p[0]},${p[1]})`,
  }));
}

function mstEdges(edges: [number, number][], activeEdge: [number, number] | null): GraphEdge[] {
  const out: GraphEdge[] = edges.map(([a, b]) => ({ from: a, to: b, state: 'found' as const }));
  if (activeEdge) out.push({ from: activeEdge[0], to: activeEdge[1], state: 'active' });
  return out;
}

// ── Variant A: heap-based Prim's ──────────────────────────────────────────────
function generateHeapSteps(): Step[] {
  const steps: Step[] = [];
  const visited = new Set<number>();
  let totalCost = 0;
  const heap: [number, number, number][] = []; // (cost, node, parent)
  const treeEdges: [number, number][] = [];
  const pushHeap = (c: number, node: number, parent: number) => {
    heap.push([c, node, parent]);
    heap.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  };
  const heapItems = (): (string | number)[] => heap.map(([c, node]) => `(${c}, n${node})`);

  pushHeap(0, 0, -1);
  steps.push({
    explanation:
      "Prim's MST with a min-heap. The graph is complete (every pair of points is an edge with Manhattan-distance cost), so no adjacency map — we generate edges on the fly. Start by pushing (0, node 0). Each round pop the cheapest edge that reaches a NEW node.",
    highlightLine: 12,
    state: {
      type: 'graph',
      nodes: nodeList(visited, null),
      edges: mstEdges(treeEdges, null),
      stackItems: heapItems(),
      stackLabel: 'minHeap (cost, node)',
      counters: [{ label: 'totalCost', value: 0 }, { label: 'in tree', value: `0 / ${N}` }],
    },
    variables: [],
  });

  while (visited.size < N) {
    const [cost, node, parent] = heap.shift()!;
    if (visited.has(node)) {
      steps.push({
        explanation: `Pop (${cost}, ${node}): node ${node} is already in the tree → skip (a cheaper edge already connected it).`,
        highlightLine: 17,
        state: {
          type: 'graph',
          nodes: nodeList(visited, node),
          edges: mstEdges(treeEdges, null),
          stackItems: heapItems(),
          stackLabel: 'minHeap (cost, node)',
          counters: [{ label: 'totalCost', value: totalCost }, { label: 'in tree', value: `${visited.size} / ${N}` }],
        },
        variables: [{ name: 'popped', value: `(${cost}, ${node})` }, { name: 'action', value: 'skip' }],
      });
      continue;
    }
    visited.add(node);
    totalCost += cost;
    const activeEdge: [number, number] | null = parent >= 0 ? [parent, node] : null;
    if (activeEdge) treeEdges.push(activeEdge);
    steps.push({
      explanation: `Pop (${cost}, ${node}): node ${node} is new → add it to the tree via edge ${parent >= 0 ? `${parent}–${node}` : '(root)'} of cost ${cost}. totalCost = ${totalCost}.`,
      highlightLine: 20,
      state: {
        type: 'graph',
        nodes: nodeList(visited, node),
        edges: mstEdges(treeEdges, null),
        stackItems: heapItems(),
        stackLabel: 'minHeap (cost, node)',
        counters: [{ label: 'totalCost', value: totalCost }, { label: 'in tree', value: `${visited.size} / ${N}` }],
      },
      variables: [{ name: 'node', value: node, highlight: true }, { name: 'totalCost', value: totalCost, highlight: true }],
    });

    const pushed: string[] = [];
    for (let nb = 0; nb < N; nb++) {
      if (!visited.has(nb)) {
        const d = manhattan(POINTS[node], POINTS[nb]);
        pushHeap(d, nb, node);
        pushed.push(`${nb}:${d}`);
      }
    }
    if (pushed.length > 0) {
      steps.push({
        explanation: `From node ${node}, push an edge to every unvisited node: ${pushed.map((p) => `→${p.split(':')[0]} cost ${p.split(':')[1]}`).join(', ')}. The heap keeps the globally cheapest frontier edge on top.`,
        highlightLine: 24,
        state: {
          type: 'graph',
          nodes: nodeList(visited, node),
          edges: mstEdges(treeEdges, null),
          stackItems: heapItems(),
          stackLabel: 'minHeap (cost, node)',
          counters: [{ label: 'totalCost', value: totalCost }, { label: 'in tree', value: `${visited.size} / ${N}` }],
        },
        variables: [{ name: 'pushed edges', value: pushed.length }],
      });
    }
  }

  steps.push({
    explanation: `All ${N} points connected → return totalCost = ${totalCost}. The MST edges are highlighted.`,
    highlightLine: 25,
    state: {
      type: 'graph',
      nodes: nodeList(visited, null),
      edges: mstEdges(treeEdges, null),
      stackItems: [],
      counters: [{ label: 'answer', value: totalCost }],
    },
    variables: [{ name: 'return', value: totalCost, highlight: true }],
  });

  return steps;
}

// ── Variant B: O(n^2) array-based Prim's ──────────────────────────────────────
function generateArraySteps(): Step[] {
  const steps: Step[] = [];
  const visited = new Set<number>();
  const distance = new Array<number>(N).fill(Infinity);
  distance[0] = 0;
  const parent = new Array<number>(N).fill(-1);
  const treeEdges: [number, number][] = [];

  const distMap = (active: number | null): Record<string | number, string> => {
    const m: Record<string | number, string> = {};
    distance.forEach((d, i) => (m[i] = visited.has(i) ? '✓' : d === Infinity ? '∞' : `${d}`));
    return m;
  };

  steps.push({
    explanation:
      "Same Prim's MST, but O(n²) with no heap. distance[i] = cheapest edge from the current tree to node i (∞ until reachable, 0 for the start). Each round: scan for the closest unvisited node, add it, and relax every other node's distance against it.",
    highlightLine: 6,
    state: {
      type: 'graph',
      nodes: nodeList(visited, null),
      edges: mstEdges(treeEdges, null),
      hashmap: distMap(null),
      hashmapLabel: 'distance[]',
      counters: [{ label: 'in tree', value: `0 / ${N}` }],
    },
    variables: [{ name: 'distance', value: `[${distance.map((d) => (d === Infinity ? '∞' : d)).join(', ')}]` }],
  });

  while (visited.size < N) {
    // getClosestNode
    let closest = -1;
    let closestDist = Infinity;
    for (let i = 0; i < N; i++) {
      if (!visited.has(i) && distance[i] < closestDist) {
        closestDist = distance[i];
        closest = i;
      }
    }
    if (closest === -1) break;
    const activeEdge: [number, number] | null = parent[closest] >= 0 ? [parent[closest], closest] : null;
    if (activeEdge) treeEdges.push(activeEdge);
    visited.add(closest);
    steps.push({
      explanation: `getClosestNode → node ${closest} (distance ${closestDist}${activeEdge ? `, via edge ${activeEdge[0]}–${activeEdge[1]}` : ' — the start'}). Add it to the tree.`,
      highlightLine: 9,
      state: {
        type: 'graph',
        nodes: nodeList(visited, closest),
        edges: mstEdges(treeEdges, null),
        hashmap: distMap(closest),
        hashmapLabel: 'distance[]',
        counters: [{ label: 'in tree', value: `${visited.size} / ${N}` }, { label: 'added', value: closest }],
      },
      variables: [{ name: 'nextNode', value: closest, highlight: true }, { name: 'cost', value: closestDist }],
    });

    // relax
    const updates: string[] = [];
    for (let i = 0; i < N; i++) {
      if (!visited.has(i) && i !== closest) {
        const d = manhattan(POINTS[i], POINTS[closest]);
        if (d < distance[i]) {
          distance[i] = d;
          parent[i] = closest;
          updates.push(`${i}→${d}`);
        }
      }
    }
    steps.push({
      explanation: `relax(${closest}): for each unvisited node, distance[i] = min(distance[i], manhattan(i, ${closest})). ${updates.length > 0 ? `Improved: ${updates.join(', ')}.` : 'No improvements this round.'}`,
      highlightLine: 15,
      state: {
        type: 'graph',
        nodes: nodeList(visited, closest),
        edges: mstEdges(treeEdges, null),
        hashmap: distMap(closest),
        hashmapLabel: 'distance[]',
        counters: [{ label: 'in tree', value: `${visited.size} / ${N}` }],
      },
      variables: [{ name: 'distance', value: `[${distance.map((d, i) => (visited.has(i) ? '✓' : d === Infinity ? '∞' : d)).join(', ')}]`, highlight: updates.length > 0 }],
    });
  }

  const total = distance.reduce((a, b) => a + (b === Infinity ? 0 : b), 0);
  steps.push({
    explanation: `All nodes visited → return sum(distance) = ${total}. Each entry is the edge cost that first connected that node to the tree, so the sum is the MST weight.`,
    highlightLine: 25,
    state: {
      type: 'graph',
      nodes: nodeList(visited, null),
      edges: mstEdges(treeEdges, null),
      hashmap: distMap(null),
      hashmapLabel: 'distance[]',
      counters: [{ label: 'answer', value: total }],
    },
    variables: [{ name: 'return', value: total, highlight: true }],
  });

  return steps;
}

const heapVariant: SolutionVariant = {
  label: "Prim's — Min-Heap",
  pythonCode: HEAP_PYTHON,
  generateSteps: generateHeapSteps,
  timeComplexity: 'O(n² log n)',
  spaceComplexity: 'O(n²)',
};

const arrayVariant: SolutionVariant = {
  label: "Prim's — O(n²) array",
  pythonCode: ARRAY_PYTHON,
  generateSteps: generateArraySteps,
  timeComplexity: 'O(n²)',
  spaceComplexity: 'O(n)',
};

export const minCostConnectAllPointsMeta: AlgorithmMeta = {
  id: 'min-cost-connect-all-points',
  lcNumber: 1584,
  title: 'Min Cost to Connect All Points',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Graph', 'Minimum Spanning Tree', 'Prim', 'Heap'],
  timeComplexity: 'O(n²)',
  spaceComplexity: 'O(n)',
  description:
    'Given points on a 2D plane, connect all of them with minimum total cost, where the cost between two points is their Manhattan distance. All points are connected when exactly one simple path exists between any two.',
  examples: [
    { input: 'points = [[0,0],[2,2],[3,10],[5,2],[7,0]]', output: '20' },
    { input: 'points = [[3,12],[-2,5],[-4,1]]', output: '18' },
  ] as ProblemExample[],
  constraints: ['1 ≤ points.length ≤ 1000', '-10⁶ ≤ xi, yi ≤ 10⁶', 'All points are distinct.'],
  hint: "It's a Minimum Spanning Tree over a complete graph. Prim's grows one tree: repeatedly add the cheapest edge from the tree to a node outside it. Use a min-heap of frontier edges (O(n² log n)), or, since the graph is dense, an O(n²) distance-array scan.",
  solutions: [heapVariant, arrayVariant],
};
