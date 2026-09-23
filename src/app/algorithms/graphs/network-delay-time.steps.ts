// Traces cse-progress's networkDelayTime_20260715 verbatim: Dijkstra with a min-heap of
// (cumulative time, node); a node is marked visited at POP time (skip a repeat pop), and
// minTime is folded as max(minTime, currentCumulativeTime) — the heap's sorted pop order
// makes that equivalent to always taking the latest pop, but the attempt writes it as max().
import { AlgorithmMeta, SolutionVariant, Step, GraphNode, GraphEdge, ProblemExample } from '../../core/models/algorithm.model';

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
  const adjMap: Record<number, [number, number][]> = {};
  for (const [source, target, time] of TIMES) (adjMap[source] ??= []).push([target, time]);

  const visited = new Set<number>();
  let minTime = 0;
  const minHeap: [number, number][] = []; // (currentCumulativeTime, node), kept sorted ascending

  const pushHeap = (cumulativeTime: number, node: number): void => {
    minHeap.push([cumulativeTime, node]);
    minHeap.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  };

  const nodes = (active: number | null): GraphNode[] =>
    [1, 2, 3, 4].map((id) => ({
      id,
      x: POS[id].x,
      y: POS[id].y,
      state: (id === active ? 'active' : visited.has(id) ? 'found' : 'default') as GraphNode['state'],
      label: `${id}`,
    }));

  const edges = (activeFrom: number | null, activeTo: number | null): GraphEdge[] =>
    TIMES.map(([s, t]) => ({
      from: s,
      to: t,
      state: (s === activeFrom && t === activeTo ? 'active' : visited.has(s) && visited.has(t) ? 'found' : 'default') as GraphEdge['state'],
    }));

  const heapItems = (): (string | number)[] => minHeap.map(([time, node]) => `(${time}, n${node})`);

  pushHeap(0, K);
  steps.push({
    explanation:
      `Dijkstra from k=${K}. Build adjMap from times, then push (0, ${K}) — it costs 0 to reach the start. Edges are always positive, so cumulative distance only increases as we pop; minTime tracks the largest cumulative time seen so far (the slowest node to hear the signal).`,
    anchor: { match: 'heapq.heappush(minHeap,(0,k))' },
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

  while (minHeap.length > 0) {
    const [currentCumulativeTime, currentNode] = minHeap.shift()!;
    if (visited.has(currentNode)) {
      steps.push({
        explanation: `Pop (${currentCumulativeTime}, ${currentNode}): currentNode ${currentNode} is already visited → skip (we already calculated the shortest way here).`,
        anchor: { match: 'if currentNode in visited:' },
        state: {
          type: 'graph',
          directed: true,
          nodes: nodes(currentNode),
          edges: edges(null, null),
          stackItems: heapItems(),
          stackLabel: 'minHeap (time, node)',
          counters: [{ label: 'minTime', value: minTime }, { label: 'settled', value: `${visited.size} / ${N}` }],
        },
        variables: [{ name: 'currentNode', value: currentNode }, { name: 'currentCumulativeTime', value: currentCumulativeTime }],
      });
      continue;
    }
    visited.add(currentNode);
    minTime = Math.max(minTime, currentCumulativeTime);
    steps.push({
      explanation: `Pop (${currentCumulativeTime}, ${currentNode}): mark currentNode ${currentNode} visited. minTime = max(minTime, ${currentCumulativeTime}) = ${minTime} — problem says minimum but since values only increase, minTime ends up holding the largest value we've popped. Now relax its neighbors.`,
      anchor: { match: 'visited.add(currentNode)', to: { match: 'minTime = max(minTime, currentCumulativeTime)' } },
      state: {
        type: 'graph',
        directed: true,
        nodes: nodes(currentNode),
        edges: edges(null, null),
        stackItems: heapItems(),
        stackLabel: 'minHeap (time, node)',
        counters: [{ label: 'minTime', value: minTime }, { label: 'settled', value: `${visited.size} / ${N}` }],
      },
      variables: [{ name: 'currentNode', value: currentNode, highlight: true }, { name: 'minTime', value: minTime, highlight: true }],
    });

    for (const [neighborNode, neighborTime] of adjMap[currentNode] ?? []) {
      if (!visited.has(neighborNode)) {
        const neighborCumulativeTime = currentCumulativeTime + neighborTime;
        pushHeap(neighborCumulativeTime, neighborNode);
        steps.push({
          explanation: `Edge ${currentNode}→${neighborNode} (weight ${neighborTime}): neighborNode not yet visited → push (${currentCumulativeTime} + ${neighborTime} = ${neighborCumulativeTime}, ${neighborNode}) onto minHeap.`,
          anchor: { match: 'if neighborNode not in visited:', to: { match: 'heapq.heappush(minHeap, (neighborCumulativeTime, neighborNode))' } },
          state: {
            type: 'graph',
            directed: true,
            nodes: nodes(currentNode),
            edges: edges(currentNode, neighborNode),
            stackItems: heapItems(),
            stackLabel: 'minHeap (time, node)',
            counters: [{ label: 'minTime', value: minTime }, { label: 'settled', value: `${visited.size} / ${N}` }],
          },
          variables: [{ name: 'neighborNode', value: neighborNode }, { name: 'neighborCumulativeTime', value: neighborCumulativeTime, highlight: true }],
        });
      }
    }
  }

  const answer = visited.size === N ? minTime : -1;
  steps.push({
    explanation:
      answer === -1
        ? `minHeap empty but len(visited) = ${visited.size} ≠ n = ${N} → some node never gets the signal. Return -1.`
        : `minHeap empty and len(visited) = ${N} == n → every node received the signal. Return minTime = ${minTime}.`,
    anchor: answer === -1 ? { match: 'return -1' } : { match: 'return minTime' },
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
  variant: 'dijkstra',
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
