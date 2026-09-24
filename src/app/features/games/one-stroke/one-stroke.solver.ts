// One-Stroke Tour — pure graph functions: board generation and iterative
// Hierholzer solving. No DOM, no Angular, no mutation of any input parameter.

export interface OneStrokeNode {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

export interface OneStrokeEdge {
  readonly id: number;
  readonly from: number;
  readonly to: number;
}

export interface OneStrokeBoard {
  readonly nodes: readonly OneStrokeNode[];
  readonly edges: readonly OneStrokeEdge[];
  readonly directed: boolean;
}

export interface EulerDiagnosis {
  /** Node ids the player may legally start from. */
  readonly validStartIds: readonly number[];
  /** Odd-degree nodes (undirected) or imbalanced start/end nodes (directed). */
  readonly problemNodeIds: readonly number[];
}

export interface AdjacencyMove {
  readonly edgeId: number;
  readonly other: number;
}

export interface HierholzerStep {
  readonly type: 'push' | 'pop';
  readonly nodeId: number;
  readonly edgeId: number | null;
  readonly stack: readonly number[];
}

export interface HierholzerResult {
  readonly tourNodeIds: readonly number[];
  readonly tourEdgeIds: readonly number[];
  readonly steps: readonly HierholzerStep[];
}

export interface GenerateBoardOptions {
  readonly rng?: () => number;
}

// ── Tunables (named constants, no magic numbers) ─────────────────────────────
export const MIN_NODES = 5;
export const MAX_NODES = 7;
export const MIN_EDGES = 7;
export const MAX_EDGES = 11;
export const MAX_PARALLEL_EDGES = 2;
export const DIRECTED_PROBABILITY = 0.3;
const MAX_EDGE_PICK_ATTEMPTS = 20;
const MAX_GENERATION_ATTEMPTS = 30;
const CIRCLE_RADIUS = 140;
const CIRCLE_CENTER = 160;
const JITTER_RADIUS = 18;
const START_OUT_MINUS_IN = 1;

// ── Euler diagnosis (degree rule) ─────────────────────────────────────────────

export function diagnoseEuler(board: OneStrokeBoard): EulerDiagnosis {
  return board.directed ? diagnoseDirected(board) : diagnoseUndirected(board);
}

function diagnoseUndirected(board: OneStrokeBoard): EulerDiagnosis {
  const degrees = new Map<number, number>(board.nodes.map((n) => [n.id, 0]));
  for (const edge of board.edges) {
    degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1);
    degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1);
  }

  const allIds = board.nodes.map((n) => n.id);
  const oddIds = allIds.filter((id) => (degrees.get(id) ?? 0) % 2 !== 0);
  return { validStartIds: oddIds.length > 0 ? oddIds : allIds, problemNodeIds: oddIds };
}

function diagnoseDirected(board: OneStrokeBoard): EulerDiagnosis {
  const balances = new Map<number, number>(board.nodes.map((n) => [n.id, 0]));
  for (const edge of board.edges) {
    balances.set(edge.from, (balances.get(edge.from) ?? 0) + 1);
    balances.set(edge.to, (balances.get(edge.to) ?? 0) - 1);
  }

  const allIds = board.nodes.map((n) => n.id);
  const startIds = allIds.filter((id) => balances.get(id) === START_OUT_MINUS_IN);
  const endIds = allIds.filter((id) => balances.get(id) === -START_OUT_MINUS_IN);
  return {
    validStartIds: startIds.length > 0 ? startIds : allIds,
    problemNodeIds: [...startIds, ...endIds],
  };
}

// ── Moves (edges are consumed by id, never by popping a neighbour list) ──────

export function availableMoves(
  board: OneStrokeBoard,
  nodeId: number,
  usedEdgeIds: ReadonlySet<number>,
): AdjacencyMove[] {
  const moves: AdjacencyMove[] = [];
  for (const edge of board.edges) {
    if (usedEdgeIds.has(edge.id)) continue;
    if (edge.from === nodeId) moves.push({ edgeId: edge.id, other: edge.to });
    else if (!board.directed && edge.to === nodeId) moves.push({ edgeId: edge.id, other: edge.from });
  }
  return moves;
}

function buildAdjacency(board: OneStrokeBoard): Map<number, AdjacencyMove[]> {
  const adjacency = new Map<number, AdjacencyMove[]>(board.nodes.map((n) => [n.id, []]));
  for (const edge of board.edges) {
    adjacency.get(edge.from)?.push({ edgeId: edge.id, other: edge.to });
    if (!board.directed) {
      adjacency.get(edge.to)?.push({ edgeId: edge.id, other: edge.from });
    }
  }
  return adjacency;
}

function findUnusedMove(moves: readonly AdjacencyMove[], usedEdgeIds: ReadonlySet<number>): AdjacencyMove | null {
  return moves.find((move) => !usedEdgeIds.has(move.edgeId)) ?? null;
}

// ── Hierholzer, iterative stack form — mirrors findItinerary_stack_20260915 ──
// Seed the stack with the start node. While the stack is non-empty: if the top
// has an unused edge, consume it (by id) and push the other endpoint; else pop
// the top into the result. Reverse the result at the end.

export function solveOneStroke(board: OneStrokeBoard, startId: number): HierholzerResult {
  const adjacency = buildAdjacency(board);
  const usedEdgeIds = new Set<number>();
  const nodeStack: number[] = [startId];
  const arrivalEdgeStack: (number | null)[] = [null];
  const steps: HierholzerStep[] = [];
  const resultNodes: number[] = [];
  const resultEdges: (number | null)[] = [];

  while (nodeStack.length > 0) {
    const topNode = nodeStack[nodeStack.length - 1];
    const move = findUnusedMove(adjacency.get(topNode) ?? [], usedEdgeIds);

    if (move === null) {
      const poppedNode = nodeStack.pop() as number;
      const poppedEdge = arrivalEdgeStack.pop() as number | null;
      resultNodes.push(poppedNode);
      resultEdges.push(poppedEdge);
      steps.push({ type: 'pop', nodeId: poppedNode, edgeId: poppedEdge, stack: [...nodeStack] });
    } else {
      usedEdgeIds.add(move.edgeId);
      nodeStack.push(move.other);
      arrivalEdgeStack.push(move.edgeId);
      steps.push({ type: 'push', nodeId: move.other, edgeId: move.edgeId, stack: [...nodeStack] });
    }
  }

  const tourNodeIds = [...resultNodes].reverse();
  const tourEdgeIds = [...resultEdges].reverse().slice(1) as number[];
  return { tourNodeIds, tourEdgeIds, steps };
}

// ── Board generation — a random walk that uses every edge, so an Euler path ──
// exists by construction (the walk itself is one). Guards only rule out
// self-loops, excess parallel edges and isolated nodes; they never need to
// enforce the degree parity, which the walk already guarantees.

interface WalkStep {
  readonly from: number;
  readonly to: number;
}

export function generateOneStrokeBoard(options: GenerateBoardOptions = {}): OneStrokeBoard {
  const rng = options.rng ?? Math.random;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const board = tryGenerateBoard(rng);
    if (board) return board;
  }
  return buildFallbackBoard();
}

function tryGenerateBoard(rng: () => number): OneStrokeBoard | null {
  const nodeCount = randomInt(MIN_NODES, MAX_NODES, rng);
  const edgeTarget = randomInt(MIN_EDGES, MAX_EDGES, rng);
  const directed = rng() < DIRECTED_PROBABILITY;
  const nodeIds = Array.from({ length: nodeCount }, (_, i) => i);

  const walk = buildEdgeWalk(nodeIds, edgeTarget, rng);
  if (walk.length < MIN_EDGES) return null;

  const visitedIds = new Set<number>(walk.flatMap((step) => [step.from, step.to]));
  if (visitedIds.size < nodeCount) return null;

  return {
    nodes: layoutNodes(nodeIds, rng),
    edges: walk.map((step, id) => ({ id, from: step.from, to: step.to })),
    directed,
  };
}

function buildEdgeWalk(nodeIds: readonly number[], edgeTarget: number, rng: () => number): WalkStep[] {
  const visited = new Set<number>();
  const parallelCounts = new Map<string, number>();
  const steps: WalkStep[] = [];
  let current = nodeIds[Math.floor(rng() * nodeIds.length)];
  visited.add(current);

  for (let i = 0; i < edgeTarget; i++) {
    const next = pickNextNode(current, nodeIds, visited, parallelCounts, rng);
    if (next === null) break;

    steps.push({ from: current, to: next });
    parallelCounts.set(pairKey(current, next), (parallelCounts.get(pairKey(current, next)) ?? 0) + 1);
    visited.add(next);
    current = next;
  }

  return steps;
}

function pickNextNode(
  current: number,
  nodeIds: readonly number[],
  visited: ReadonlySet<number>,
  parallelCounts: ReadonlyMap<string, number>,
  rng: () => number,
): number | null {
  const unvisited = nodeIds.filter((id) => id !== current && !visited.has(id));
  const pool = unvisited.length > 0 ? unvisited : nodeIds.filter((id) => id !== current);

  for (let attempt = 0; attempt < MAX_EDGE_PICK_ATTEMPTS; attempt++) {
    const candidate = pool[Math.floor(rng() * pool.length)];
    if ((parallelCounts.get(pairKey(current, candidate)) ?? 0) < MAX_PARALLEL_EDGES) return candidate;
  }
  return null;
}

export function pairKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

function randomInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function layoutNodes(nodeIds: readonly number[], rng: () => number): OneStrokeNode[] {
  const angleStep = (2 * Math.PI) / nodeIds.length;
  return nodeIds.map((id) => {
    const angle = id * angleStep;
    const jitterX = (rng() - 0.5) * 2 * JITTER_RADIUS;
    const jitterY = (rng() - 0.5) * 2 * JITTER_RADIUS;
    return {
      id,
      x: CIRCLE_CENTER + Math.cos(angle) * CIRCLE_RADIUS + jitterX,
      y: CIRCLE_CENTER + Math.sin(angle) * CIRCLE_RADIUS + jitterY,
    };
  });
}

// Deterministic, always-valid board used only if generation exhausts its
// attempt budget (should not happen given MIN_EDGES > MAX_NODES - 1).
function buildFallbackBoard(): OneStrokeBoard {
  const nodeIds = [0, 1, 2, 3, 4];
  const walk: WalkStep[] = [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4 },
    { from: 4, to: 0 },
    { from: 0, to: 2 },
    { from: 2, to: 4 },
  ];
  return {
    nodes: layoutNodes(nodeIds, () => 0.5),
    edges: walk.map((step, id) => ({ id, from: step.from, to: step.to })),
    directed: false,
  };
}
