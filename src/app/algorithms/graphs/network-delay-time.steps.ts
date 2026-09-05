// Solution + comments sourced from cse-progress: dsa/leetcode/graphs/743_network_delay_time.py
import { AlgorithmMeta, SolutionVariant, Step, GraphNode, GraphEdge, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        # Dijkstra = BFS with a min-heap instead of a queue (weighted edges)
        adjMap = collections.defaultdict(list)
        hasShortest = set()
        minTime = 0

        for source, target, weight in times:
            adjMap[source].append((target, weight))

        minHeap = []
        heapq.heappush(minHeap, (0, k))   # 0 time to reach start k

        while minHeap:
            cumulativeWeightToNode, node = heapq.heappop(minHeap)
            if node in hasShortest:        # already finalized — skip
                continue
            hasShortest.add(node)
            # popped in increasing order, so this is the shortest to 'node'
            minTime = cumulativeWeightToNode

            for neighborNode, neighborWeight in adjMap[node]:
                if neighborNode not in hasShortest:
                    heapq.heappush(minHeap, (neighborWeight + cumulativeWeightToNode, neighborNode))

        if len(hasShortest) == n:
            return minTime
        return -1`;

const TIMES: [number, number, number][] = [
  [2, 1, 1],
  [2, 3, 1],
  [3, 4, 1],
];
const N = 4;
const K = 2;

const POS: Record<number, { x: number; y: number }> = {
  2: { x: 60, y: 120 },
  1: { x: 175, y: 55 },
  3: { x: 175, y: 190 },
  4: { x: 300, y: 120 },
};

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const adj: Record<number, [number, number][]> = {};
  for (const [s, t, w] of TIMES) (adj[s] ??= []).push([t, w]);

  const hasShortest = new Set<number>();
  let minTime = 0;
  const heap: [number, number][] = []; // (dist, node), kept sorted ascending

  const pushHeap = (d: number, node: number) => {
    heap.push([d, node]);
    heap.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };

  const nodes = (active: number | null): GraphNode[] =>
    [1, 2, 3, 4].map((id) => ({
      id,
      x: POS[id].x,
      y: POS[id].y,
      state: (id === active ? 'active' : hasShortest.has(id) ? 'found' : 'default') as GraphNode['state'],
      label: `${id}`,
    }));

  const edges = (activeFrom: number | null, activeTo: number | null): GraphEdge[] =>
    TIMES.map(([s, t]) => ({
      from: s,
      to: t,
      state: (s === activeFrom && t === activeTo ? 'active' : hasShortest.has(s) && hasShortest.has(t) ? 'found' : 'default') as GraphEdge['state'],
    }));

  const heapItems = (): (string | number)[] => heap.map(([d, node]) => `(${d}, n${node})`);

  pushHeap(0, K);
  steps.push({
    explanation:
      `Dijkstra from k=${K}. Build adjacency map from times, then push (0, ${K}) — it costs 0 to reach the start. We pop the smallest cumulative time each step; because edge weights are non-negative, the first time we pop a node it is via its shortest path. minTime tracks the largest such time (the slowest node to hear the signal).`,
    highlightLine: 13,
    state: {
      type: 'graph',
      directed: true,
      nodes: nodes(null),
      edges: edges(null, null),
      stackItems: heapItems(),
      stackLabel: 'minHeap (time, node)',
      counters: [{ label: 'minTime', value: minTime }, { label: 'settled', value: `0 / ${N}` }],
    },
    variables: [],
  });

  while (heap.length > 0) {
    const [dist, node] = heap.shift()!;
    if (hasShortest.has(node)) {
      steps.push({
        explanation: `Pop (${dist}, ${node}): node ${node} is already settled → skip (a shorter path to it was popped earlier).`,
        highlightLine: 18,
        state: {
          type: 'graph',
          directed: true,
          nodes: nodes(node),
          edges: edges(null, null),
          stackItems: heapItems(),
          stackLabel: 'minHeap (time, node)',
          counters: [{ label: 'minTime', value: minTime }, { label: 'settled', value: `${hasShortest.size} / ${N}` }],
        },
        variables: [{ name: 'popped', value: `(${dist}, ${node})` }, { name: 'action', value: 'skip' }],
      });
      continue;
    }
    hasShortest.add(node);
    minTime = dist;
    steps.push({
      explanation: `Pop (${dist}, ${node}): first time settling node ${node} → this is its shortest arrival time. Set minTime = ${dist}. Now relax its outgoing edges.`,
      highlightLine: 21,
      state: {
        type: 'graph',
        directed: true,
        nodes: nodes(node),
        edges: edges(null, null),
        stackItems: heapItems(),
        stackLabel: 'minHeap (time, node)',
        counters: [{ label: 'minTime', value: minTime }, { label: 'settled', value: `${hasShortest.size} / ${N}` }],
      },
      variables: [{ name: 'node', value: node, highlight: true }, { name: 'minTime', value: minTime, highlight: true }],
    });

    for (const [nb, w] of adj[node] ?? []) {
      if (!hasShortest.has(nb)) {
        pushHeap(dist + w, nb);
        steps.push({
          explanation: `Edge ${node}→${nb} (weight ${w}): push (${dist} + ${w} = ${dist + w}, ${nb}) onto the heap. It will only settle ${nb} if nothing cheaper reaches it first.`,
          highlightLine: 25,
          state: {
            type: 'graph',
            directed: true,
            nodes: nodes(node),
            edges: edges(node, nb),
            stackItems: heapItems(),
            stackLabel: 'minHeap (time, node)',
            counters: [{ label: 'minTime', value: minTime }, { label: 'settled', value: `${hasShortest.size} / ${N}` }],
          },
          variables: [{ name: 'neighbor', value: nb }, { name: 'new dist', value: dist + w, highlight: true }],
        });
      }
    }
  }

  const answer = hasShortest.size === N ? minTime : -1;
  steps.push({
    explanation:
      answer === -1
        ? `Heap empty but only ${hasShortest.size}/${N} nodes were reached → some node never gets the signal. Return -1.`
        : `Heap empty and all ${N} nodes settled → every node received the signal. The slowest arrival is minTime = ${minTime}. Return ${minTime}.`,
    highlightLine: answer === -1 ? 30 : 29,
    state: {
      type: 'graph',
      directed: true,
      nodes: nodes(null),
      edges: edges(null, null),
      stackItems: [],
      counters: [{ label: 'answer', value: answer }],
    },
    variables: [{ name: 'return', value: answer, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Dijkstra (min-heap)',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(E log V)',
  spaceComplexity: 'O(V + E)',
};

export const networkDelayTimeMeta: AlgorithmMeta = {
  id: 'network-delay-time',
  lcNumber: 743,
  title: 'Network Delay Time',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Graph', 'Shortest Path', 'Dijkstra', 'Heap'],
  timeComplexity: 'O(E log V)',
  spaceComplexity: 'O(V + E)',
  description:
    'n nodes (1..n) with directed travel times times[i] = (u, v, w). Send a signal from node k; return the minimum time for all nodes to receive it, or -1 if some node never does.',
  examples: [
    { input: 'times = [[2,1,1],[2,3,1],[3,4,1]], n = 4, k = 2', output: '2' },
    { input: 'times = [[1,2,1]], n = 2, k = 2', output: '-1' },
  ] as ProblemExample[],
  constraints: ['1 ≤ k ≤ n ≤ 100', '1 ≤ times.length ≤ 6000', '0 ≤ w ≤ 100', 'All (u, v) pairs are unique.'],
  hint: 'Dijkstra from k. Pop the smallest cumulative time; the first pop of a node is its shortest arrival (non-negative weights guarantee this). The answer is the maximum shortest-arrival across all nodes — or -1 if any node is never settled.',
  solutions: [solution],
};
