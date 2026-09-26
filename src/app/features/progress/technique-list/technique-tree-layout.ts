import { Technique } from '../../../core/models/progress.model';

/**
 * Pure, Angular-free layered-DAG layout for the Mastery tab's skill tree. `buildTechniqueGraph`
 * turns `techniques[]` (each carrying its own `buildsOn` prerequisite names) into a graph;
 * `layoutLayeredDag` assigns every node a row (by prerequisite depth) and an x position within
 * that row (barycenter-ordered to reduce edge crossings), then returns ready-to-draw pixel
 * geometry. No layout library — this is the whole algorithm.
 */

/** One prerequisite edge: `from` (the prerequisite) builds toward `to` (the dependent). */
export interface TechniqueEdge {
  readonly from: string;
  readonly to: string;
}

export interface TechniqueGraph {
  /** Every technique, keyed by name. */
  readonly techniques: ReadonlyMap<string, Technique>;
  /** Edges whose endpoints both exist. */
  readonly edges: readonly TechniqueEdge[];
  /** Count of `buildsOn` entries that named a technique not present in `techniques[]` —
   *  dropped rather than crashing, so a partial/older export still renders. */
  readonly droppedEdgeCount: number;
}

/** Builds the graph from a technique list: nodes keyed by name, edges from each technique's
 *  `buildsOn` (missing prerequisite names are dropped and counted, never thrown). Never
 *  mutates `techniques`. */
export function buildTechniqueGraph(techniques: readonly Technique[]): TechniqueGraph {
  const byName = new Map(techniques.map((t) => [t.name, t]));
  const edges: TechniqueEdge[] = [];
  let droppedEdgeCount = 0;

  for (const t of techniques) {
    for (const prereq of t.buildsOn ?? []) {
      if (byName.has(prereq)) {
        edges.push({ from: prereq, to: t.name });
      } else {
        droppedEdgeCount += 1;
      }
    }
  }

  return { techniques: byName, edges, droppedEdgeCount };
}

export interface TreeNode {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly depth: number;
}

export interface TreeEdge {
  readonly from: string;
  readonly to: string;
  /** A cubic Bézier `d` attribute from the parent's bottom-centre to the child's top-centre. */
  readonly path: string;
}

export interface TreeLayout {
  readonly nodes: readonly TreeNode[];
  readonly edges: readonly TreeEdge[];
  readonly width: number;
  readonly height: number;
  /** Back-edges the cycle guard broke while computing depth (0 for an acyclic graph, which
   *  is the expected shape — `techniques.yml` should never author a cycle). */
  readonly cycleBreakCount: number;
}

export const NODE_W = 132;
export const NODE_H = 44;
export const GAP_X = 14;
export const ROW_H = 84;

/** Marks a node whose depth is still being computed on the current DFS path — a parent
 *  pointing back to one of these is a cycle; the guard below treats that edge as contributing
 *  no depth instead of recursing forever. */
const IN_PROGRESS = -1;

interface DepthResult {
  readonly depths: ReadonlyMap<string, number>;
  readonly cycleBreakCount: number;
}

/** depth(root) = 0; depth(t) = 1 + max(depth(prereq)) over t's valid prerequisites. Memoized
 *  DFS, guarded against a cycle (which `techniques.yml` should never author, but a bad edit
 *  must not hang the page). */
function computeDepths(graph: TechniqueGraph): DepthResult {
  const parentsByName = new Map<string, string[]>();
  for (const name of graph.techniques.keys()) parentsByName.set(name, []);
  for (const edge of graph.edges) parentsByName.get(edge.to)!.push(edge.from);

  const depths = new Map<string, number>();
  let cycleBreakCount = 0;

  function depthOf(name: string): number {
    const cached = depths.get(name);
    if (cached === IN_PROGRESS) {
      cycleBreakCount += 1;
      return 0; // cycle guard: this back-edge contributes no extra depth
    }
    if (cached !== undefined) return cached;

    depths.set(name, IN_PROGRESS);
    const parents = parentsByName.get(name) ?? [];
    const maxParentDepth = parents.reduce((max, parent) => Math.max(max, depthOf(parent)), -1);
    const depth = maxParentDepth + 1;
    depths.set(name, depth);
    return depth;
  }

  for (const name of graph.techniques.keys()) depthOf(name);
  return { depths, cycleBreakCount };
}

/** Groups technique names by depth into rows 0..maxDepth, each seeded in family-then-name
 *  order (a stable, readable starting point for the barycenter passes below). */
function initialRows(graph: TechniqueGraph, depths: ReadonlyMap<string, number>): string[][] {
  const maxDepth = Math.max(0, ...depths.values());
  const rows: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const name of graph.techniques.keys()) {
    rows[depths.get(name)!].push(name);
  }
  return rows.map((row) =>
    [...row].sort((a, b) => {
      const ta = graph.techniques.get(a)!;
      const tb = graph.techniques.get(b)!;
      return ta.family.localeCompare(tb.family) || ta.name.localeCompare(tb.name);
    }),
  );
}

/** Reassigns x = index × (NODE_W + GAP_X) for a row, in its current order. */
function assignX(row: readonly string[]): Map<string, number> {
  const x = new Map<string, number>();
  row.forEach((name, index) => x.set(name, index * (NODE_W + GAP_X)));
  return x;
}

/** One barycenter sweep: reorders each row in `rows` by the mean x of its neighbors in
 *  `neighborsOf(name)` (parents for the down pass, children for the up pass), using
 *  `positions` (the adjacent row's already-assigned x) to compute the mean. A node with no
 *  such neighbors keeps its current position as its sort key, so it neither jumps to the
 *  front nor disturbs neighbors that do have one. Each row is then placed at its members'
 *  own barycenter x (not merely index × spacing), left-to-right, pushed right only far enough
 *  to keep NODE_W + GAP_X between neighbors — so an unshared node settles exactly under its
 *  single parent/child instead of on an arbitrary grid slot. Returns a fresh map of every
 *  row's reassigned x — never mutates `rows` or `positions`. */
function barycenterPass(
  rows: readonly (readonly string[])[],
  positions: ReadonlyMap<string, number>,
  neighborsOf: (name: string) => readonly string[],
  rowOrder: readonly number[],
): { rows: string[][]; positions: Map<string, number> } {
  const nextRows = rows.map((row) => [...row]);
  const nextPositions = new Map(positions);

  for (const rowIndex of rowOrder) {
    const row = nextRows[rowIndex];
    const keyOf = (name: string): number => {
      const neighbors = neighborsOf(name).filter((n) => nextPositions.has(n));
      if (neighbors.length === 0) return nextPositions.get(name) ?? 0;
      return neighbors.reduce((sum, n) => sum + nextPositions.get(n)!, 0) / neighbors.length;
    };
    const ordered = [...row].sort((a, b) => keyOf(a) - keyOf(b) || a.localeCompare(b));
    nextRows[rowIndex] = ordered;

    let minX = -Infinity;
    for (const name of ordered) {
      const placed = Math.max(keyOf(name), minX);
      nextPositions.set(name, placed);
      minX = placed + (NODE_W + GAP_X);
    }
  }

  return { rows: nextRows, positions: nextPositions };
}

/** A cubic Bézier from the parent's bottom-centre to the child's top-centre, bowing through
 *  the row gap between them. */
function edgePath(parent: { x: number; y: number }, child: { x: number; y: number }): string {
  const x1 = parent.x + NODE_W / 2;
  const y1 = parent.y + NODE_H;
  const x2 = child.x + NODE_W / 2;
  const y2 = child.y;
  const c1y = y1 + ROW_H / 2;
  const c2y = y2 - ROW_H / 2;
  return `M ${x1} ${y1} C ${x1} ${c1y}, ${x2} ${c2y}, ${x2} ${y2}`;
}

/** Lays out a technique graph as a vertical layered DAG (roots on top). Depth comes from
 *  `computeDepths`; within each row, nodes start in family/name order, then two barycenter
 *  passes (down: by mean parent x, up: by mean child x) settle each child under its
 *  prerequisites. Pure — never mutates `graph`. */
export function layoutLayeredDag(graph: TechniqueGraph): TreeLayout {
  const { depths, cycleBreakCount } = computeDepths(graph);
  const rows = initialRows(graph, depths);

  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  for (const name of graph.techniques.keys()) {
    parentsOf.set(name, []);
    childrenOf.set(name, []);
  }
  for (const edge of graph.edges) {
    parentsOf.get(edge.to)!.push(edge.from);
    childrenOf.get(edge.from)!.push(edge.to);
  }

  const seeded = new Map<string, number>();
  for (const row of rows) for (const [name, x] of assignX(row)) seeded.set(name, x);

  const rowIndexesTopDown = rows.map((_, i) => i);
  const down = barycenterPass(rows, seeded, (name) => parentsOf.get(name)!, rowIndexesTopDown);

  const rowIndexesBottomUp = rows.map((_, i) => i).slice(0, -1).reverse();
  const up = barycenterPass(down.rows, down.positions, (name) => childrenOf.get(name)!, rowIndexesBottomUp);

  // The two barycenter passes settle nodes at their neighbors' actual mean x, not at a
  // grid slot starting from 0 — a parent pulled toward several children (or vice versa) can
  // land anywhere left-to-right of 0. Shift every node by the same amount so the leftmost
  // one sits at x=0, then size the canvas from the real rightmost edge (maxX + NODE_W)
  // rather than from row lengths alone — using row length here previously understated the
  // width whenever a row's nodes didn't start flush at 0, clipping them outside the viewBox.
  const rawX = up.positions;
  const rawXValues = [...rawX.values()];
  const minX = rawXValues.length ? Math.min(...rawXValues) : 0;

  const nodes: TreeNode[] = up.rows.flatMap((row, depth) =>
    row.map((name) => ({ name, x: rawX.get(name)! - minX, y: depth * ROW_H, depth })),
  );
  const nodeByName = new Map(nodes.map((n) => [n.name, n]));

  const edges: TreeEdge[] = graph.edges.map((e) => ({
    from: e.from,
    to: e.to,
    path: edgePath(nodeByName.get(e.from)!, nodeByName.get(e.to)!),
  }));

  const maxNodeX = nodes.length ? Math.max(...nodes.map((n) => n.x)) : 0;
  const width = nodes.length ? maxNodeX + NODE_W : 0;
  const height = up.rows.length ? up.rows.length * ROW_H - (ROW_H - NODE_H) : 0;

  return { nodes, edges, width, height, cycleBreakCount };
}
