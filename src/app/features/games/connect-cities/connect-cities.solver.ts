// Pure helpers for the "Connect the Cities" game: point generation, the
// candidate edge set, an immutable-style union-find (mirrors LC 684's
// find/union), and Prim's MST (mirrors the learner's own
// minCostConnectPoints_20260811 — distance array + visited set + O(n^2)
// getCandidate/relax — with only a `parent`-pointer addition so the tree
// edges can be drawn).

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Edge {
  readonly a: number;
  readonly b: number;
  readonly weight: number;
}

/** One tick of Prim's growth: the edge it just added, plus the best known
 * candidate edge to every still-unvisited city at that moment (for the
 * optional faint "current candidates" rendering during solver playback). */
export interface PrimStep {
  readonly edge: Edge;
  readonly frontier: readonly Edge[];
}

export interface PrimResult {
  readonly edges: readonly Edge[];
  readonly totalCost: number;
  readonly steps: readonly PrimStep[];
}

// ── Board generation ─────────────────────────────────────────────────────────

export const PLANE_SIZE = 400;
export const POINT_MARGIN = 24;
export const MIN_POINT_COUNT = 8;
export const MAX_POINT_COUNT = 12;
export const MIN_PAIRWISE_DISTANCE = 60;
export const MAX_GENERATION_ATTEMPTS = 500;

/** rng defaults to Math.random but is injectable so generation is testable. */
export function generatePoints(rng: () => number = Math.random): Point[] {
  const count = randomInt(rng, MIN_POINT_COUNT, MAX_POINT_COUNT);
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    points.push(generateOnePoint(rng, points));
  }
  return points;
}

function generateOnePoint(rng: () => number, existing: readonly Point[]): Point {
  let candidate = randomPoint(rng);
  let attempts = 0;
  while (attempts < MAX_GENERATION_ATTEMPTS && !isFarEnough(candidate, existing)) {
    candidate = randomPoint(rng);
    attempts++;
  }
  // Fallback: accept the last candidate even if MAX_GENERATION_ATTEMPTS was
  // exhausted, so generation always terminates.
  return candidate;
}

function randomPoint(rng: () => number): Point {
  const span = PLANE_SIZE - 2 * POINT_MARGIN;
  return {
    x: POINT_MARGIN + Math.floor(rng() * span),
    y: POINT_MARGIN + Math.floor(rng() * span),
  };
}

function isFarEnough(candidate: Point, existing: readonly Point[]): boolean {
  return existing.every((p) => manhattanDistance(p, candidate) >= MIN_PAIRWISE_DISTANCE);
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ── Edges ─────────────────────────────────────────────────────────────────────

export function manhattanDistance(p1: Point, p2: Point): number {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
}

export function buildEdges(points: readonly Point[]): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      edges.push({ a: i, b: j, weight: manhattanDistance(points[i], points[j]) });
    }
  }
  return edges;
}

export function edgeKey(edge: Edge): string {
  const lo = Math.min(edge.a, edge.b);
  const hi = Math.max(edge.a, edge.b);
  return `${lo}-${hi}`;
}

export function totalWeight(edges: readonly Edge[]): number {
  return edges.reduce((sum, e) => sum + e.weight, 0);
}

// ── Union-Find (immutable) ────────────────────────────────────────────────────
// Same find/union shape as LC 684's findRedundantConnection, minus rank (the
// board is tiny — at most 12 nodes — so plain path-free find is plenty).

export function createParent(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

export function find(parent: readonly number[], x: number): number {
  let root = x;
  while (parent[root] !== root) {
    root = parent[root];
  }
  return root;
}

/** Returns a new parent array with a/b unioned, or null when a and b are
 * already connected (unioning them would close a cycle). Never mutates the
 * input array. */
export function union(parent: readonly number[], a: number, b: number): number[] | null {
  const rootA = find(parent, a);
  const rootB = find(parent, b);
  if (rootA === rootB) return null;

  const next = [...parent];
  next[rootA] = rootB;
  return next;
}

/** Rebuilds a union-find parent array from scratch from an edge list — a DSU
 * can't un-union, so undo (and the solver's board reset) always rebuilds
 * rather than mutating a running structure. */
export function buildUnionFind(n: number, edges: readonly Edge[]): number[] {
  return edges.reduce<number[]>((parent, edge) => union(parent, edge.a, edge.b) ?? parent, createParent(n));
}

// ── Prim's MST ────────────────────────────────────────────────────────────────

const NO_PARENT = -1;

export function primMST(points: readonly Point[]): PrimResult {
  const n = points.length;
  if (n === 0) return { edges: [], totalCost: 0, steps: [] };

  const distance = Array<number>(n).fill(Infinity);
  distance[0] = 0;
  const treeParent = Array<number>(n).fill(NO_PARENT);
  const visited = new Set<number>();
  const edges: Edge[] = [];
  const steps: PrimStep[] = [];

  while (visited.size !== n) {
    const frontier = collectFrontier(distance, treeParent, visited);
    const candidate = getCandidate(distance, visited);
    visited.add(candidate);

    if (treeParent[candidate] !== NO_PARENT) {
      const edge: Edge = { a: treeParent[candidate], b: candidate, weight: distance[candidate] };
      edges.push(edge);
      steps.push({ edge, frontier });
    }

    relax(candidate, points, distance, treeParent, visited);
  }

  return { edges, totalCost: totalWeight(edges), steps };
}

/** O(n^2) min-distance unvisited index — mirrors getCandidate() in
 * minCostConnectPoints_20260811. */
function getCandidate(distance: readonly number[], visited: ReadonlySet<number>): number {
  let candidate = -1;
  let candidateValue = Infinity;
  for (let i = 0; i < distance.length; i++) {
    if (visited.has(i)) continue;
    if (distance[i] < candidateValue) {
      candidate = i;
      candidateValue = distance[i];
    }
  }
  return candidate;
}

/** Relaxes every unvisited index against the newly-added candidate —
 * mirrors relax() in minCostConnectPoints_20260811. The only addition is
 * recording treeParent so the tree edges can be drawn. */
function relax(
  candidate: number,
  points: readonly Point[],
  distance: number[],
  treeParent: number[],
  visited: ReadonlySet<number>,
): void {
  for (let i = 0; i < distance.length; i++) {
    if (visited.has(i)) continue;
    const dist = manhattanDistance(points[candidate], points[i]);
    if (dist < distance[i]) {
      distance[i] = dist;
      treeParent[i] = candidate;
    }
  }
}

function collectFrontier(
  distance: readonly number[],
  treeParent: readonly number[],
  visited: ReadonlySet<number>,
): Edge[] {
  const frontier: Edge[] = [];
  for (let i = 0; i < distance.length; i++) {
    if (visited.has(i) || treeParent[i] === NO_PARENT || !Number.isFinite(distance[i])) continue;
    frontier.push({ a: treeParent[i], b: i, weight: distance[i] });
  }
  return frontier;
}
