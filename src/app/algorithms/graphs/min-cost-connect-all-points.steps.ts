// Traces cse-progress's two attempts verbatim:
// - heapVariant → minCostConnectPoints (2026-07-16): Prim's with a min-heap.
// - arrayVariant → minCostConnectPoints_20260811 (2026-08-11): O(n²) Prim's via
//   getCandidate()/relax(). This attempt has NO "candidate not found" sentinel branch —
//   getCandidate() always returns a real index for this connected input, so the array
//   variant below does not break out of its main loop.
import { AlgorithmMeta, SolutionVariant, Step, GraphNode, GraphEdge, ProblemExample } from '../../core/models/algorithm.model';

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
    anchor: { match: 'heapq.heappush(minHeap,(0,0))' },
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
        anchor: { match: 'if node in visited:' },
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
      anchor: { match: 'totalCost+=cost', to: { match: 'visited.add(node)' } },
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
        anchor: { match: 'heapq.heappush(minHeap, (distance, neighbor))' },
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
    anchor: { match: 'return totalCost' },
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
      "Same Prim's MST, but O(n²) with no heap. distance[i] = cheapest edge from the current tree to node i (∞ until reachable, 0 for the start). Each round: getCandidate() scans for the closest unvisited node, add it, and relax() every other node's distance against it.",
    anchor: { match: 'distance = [math.inf] * len(points)', to: { match: 'distance[0] = 0' } },
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
    // getCandidate(): no "not found" sentinel — this attempt trusts a candidate is
    // always found for a connected input, so there is no early-exit branch here.
    let closest = -1;
    let closestDist = Infinity;
    for (let i = 0; i < N; i++) {
      if (!visited.has(i)) {
        if (distance[i] < closestDist) {
          closest = i;
          closestDist = distance[i];
        }
      }
    }
    const activeEdge: [number, number] | null = parent[closest] >= 0 ? [parent[closest], closest] : null;
    if (activeEdge) treeEdges.push(activeEdge);
    visited.add(closest);
    steps.push({
      explanation: `getCandidate() → candidate ${closest} (candidateValue ${closestDist}${activeEdge ? `, via edge ${activeEdge[0]}–${activeEdge[1]}` : ' — the start'}). Add it to visited.`,
      anchor: { match: 'def getCandidate():', to: { match: 'return candidate' } },
      state: {
        type: 'graph',
        nodes: nodeList(visited, closest),
        edges: mstEdges(treeEdges, null),
        hashmap: distMap(closest),
        hashmapLabel: 'distance[]',
        counters: [{ label: 'in tree', value: `${visited.size} / ${N}` }, { label: 'added', value: closest }],
      },
      variables: [{ name: 'candidate', value: closest, highlight: true }, { name: 'candidateValue', value: closestDist }],
    });

    // relax(candidate): only checks "i not in visited" — candidate was just added to
    // visited above, so it's already excluded without a separate "i != candidate" check.
    const updates: string[] = [];
    for (let i = 0; i < N; i++) {
      if (!visited.has(i)) {
        const d = manhattan(POINTS[i], POINTS[closest]);
        if (d < distance[i]) {
          distance[i] = d;
          parent[i] = closest;
          updates.push(`${i}→${d}`);
        }
      }
    }
    steps.push({
      explanation: `relax(${closest}): for each i not in visited, distance[i] = min(distance[i], manhattanDistance(${closest}, i)). ${updates.length > 0 ? `Improved: ${updates.join(', ')}.` : 'No improvements this round.'}`,
      anchor: { match: 'def relax(candidate):', to: { match: 'distance[i] = min(distance[i], manhattanDistance)' } },
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
    anchor: { match: 'return sum(distance)' },
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
  variant: 'prims-heap',
  generateSteps: generateHeapSteps,
  timeComplexity: 'O(n² log n)',
  spaceComplexity: 'O(n²)',
};

const arrayVariant: SolutionVariant = {
  label: "Prim's — O(n²) array",
  variant: 'prims-array',
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
