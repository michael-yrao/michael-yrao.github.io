import {
  OneStrokeBoard,
  diagnoseEuler,
  solveOneStroke,
  generateOneStrokeBoard,
  MIN_NODES,
  MAX_NODES,
  MIN_EDGES,
  MAX_EDGES,
  MAX_PARALLEL_EDGES,
  pairKey,
} from './one-stroke.solver';

// ── Fixtures ───────────────────────────────────────────────────────────────
// Undirected board, 4 nodes, 5 edges, exactly 2 odd-degree nodes (0 and 2).
const UNDIRECTED_BOARD: OneStrokeBoard = {
  nodes: [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 1, y: 0 },
    { id: 2, x: 2, y: 0 },
    { id: 3, x: 3, y: 0 },
  ],
  edges: [
    { id: 0, from: 0, to: 1 },
    { id: 1, from: 1, to: 2 },
    { id: 2, from: 2, to: 3 },
    { id: 3, from: 3, to: 0 },
    { id: 4, from: 0, to: 2 },
  ],
  directed: false,
};

// Directed board, 3 nodes, 4 edges: node 0 has out-in=+1 (start), node 2 has
// in-out=+1 (finish), node 1 is balanced.
const DIRECTED_BOARD: OneStrokeBoard = {
  nodes: [
    { id: 0, x: 0, y: 0 },
    { id: 1, x: 1, y: 0 },
    { id: 2, x: 2, y: 0 },
  ],
  edges: [
    { id: 0, from: 0, to: 1 },
    { id: 1, from: 1, to: 2 },
    { id: 2, from: 2, to: 0 },
    { id: 3, from: 0, to: 2 },
  ],
  directed: true,
};

function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function assertUsesEveryEdgeOnce(board: OneStrokeBoard, tourEdgeIds: readonly number[]): void {
  const expectedIds = board.edges.map((e) => e.id).sort((a, b) => a - b);
  const actualIds = [...tourEdgeIds].sort((a, b) => a - b);
  expect(actualIds).toEqual(expectedIds);
}

function assertConsecutiveNodesConnectedByEdge(
  board: OneStrokeBoard,
  tourNodeIds: readonly number[],
  tourEdgeIds: readonly number[],
): void {
  const edgeById = new Map(board.edges.map((e) => [e.id, e]));
  for (let i = 0; i < tourEdgeIds.length; i++) {
    const edge = edgeById.get(tourEdgeIds[i])!;
    const a = tourNodeIds[i];
    const b = tourNodeIds[i + 1];
    const matchesForward = edge.from === a && edge.to === b;
    const matchesBackward = !board.directed && edge.from === b && edge.to === a;
    expect(matchesForward || matchesBackward).toBe(true);
  }
}

describe('diagnoseEuler', () => {
  it('finds the two odd-degree nodes on an undirected board', () => {
    const diagnosis = diagnoseEuler(UNDIRECTED_BOARD);
    expect(diagnosis.problemNodeIds).toEqual([0, 2]);
    expect(diagnosis.validStartIds).toEqual([0, 2]);
  });

  it('allows any start when an undirected board has no odd-degree nodes', () => {
    const circuit: OneStrokeBoard = {
      nodes: UNDIRECTED_BOARD.nodes,
      edges: [
        { id: 0, from: 0, to: 1 },
        { id: 1, from: 1, to: 2 },
        { id: 2, from: 2, to: 3 },
        { id: 3, from: 3, to: 0 },
      ],
      directed: false,
    };
    const diagnosis = diagnoseEuler(circuit);
    expect(diagnosis.problemNodeIds).toEqual([]);
    expect(diagnosis.validStartIds).toEqual([0, 1, 2, 3]);
  });

  it('finds the out-in=1 start node on a directed board', () => {
    const diagnosis = diagnoseEuler(DIRECTED_BOARD);
    expect(diagnosis.validStartIds).toEqual([0]);
    expect(diagnosis.problemNodeIds).toEqual([0, 2]);
  });

  it('allows any start when a directed board is fully balanced', () => {
    const circuit: OneStrokeBoard = {
      nodes: DIRECTED_BOARD.nodes,
      edges: [
        { id: 0, from: 0, to: 1 },
        { id: 1, from: 1, to: 2 },
        { id: 2, from: 2, to: 0 },
      ],
      directed: true,
    };
    const diagnosis = diagnoseEuler(circuit);
    expect(diagnosis.problemNodeIds).toEqual([]);
    expect(diagnosis.validStartIds).toEqual([0, 1, 2]);
  });
});

describe('solveOneStroke', () => {
  it('walks the exact Hierholzer tour on the undirected fixture', () => {
    const result = solveOneStroke(UNDIRECTED_BOARD, 0);
    expect(result.tourNodeIds).toEqual([0, 1, 2, 3, 0, 2]);
    expect(result.tourEdgeIds).toEqual([0, 1, 2, 3, 4]);
    assertUsesEveryEdgeOnce(UNDIRECTED_BOARD, result.tourEdgeIds);
    assertConsecutiveNodesConnectedByEdge(UNDIRECTED_BOARD, result.tourNodeIds, result.tourEdgeIds);
  });

  it('walks the exact Hierholzer tour on the directed fixture', () => {
    const result = solveOneStroke(DIRECTED_BOARD, 0);
    expect(result.tourNodeIds).toEqual([0, 1, 2, 0, 2]);
    expect(result.tourEdgeIds).toEqual([0, 1, 2, 3]);
    assertUsesEveryEdgeOnce(DIRECTED_BOARD, result.tourEdgeIds);
    assertConsecutiveNodesConnectedByEdge(DIRECTED_BOARD, result.tourNodeIds, result.tourEdgeIds);
  });

  it('emits a push/pop step trace with stack snapshots', () => {
    const result = solveOneStroke(UNDIRECTED_BOARD, 0);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0]).toEqual({ type: 'push', nodeId: 1, edgeId: 0, stack: [0, 1] });
    const lastStep = result.steps[result.steps.length - 1];
    expect(lastStep.type).toBe('pop');
    expect(lastStep.stack).toEqual([]);
  });

  it('produces a path one node longer than the edge count', () => {
    const result = solveOneStroke(UNDIRECTED_BOARD, 0);
    expect(result.tourNodeIds.length).toBe(UNDIRECTED_BOARD.edges.length + 1);
  });
});

describe('generateOneStrokeBoard', () => {
  it('satisfies the Euler condition and every generation guard across many seeds', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const board = generateOneStrokeBoard({ rng: seededRng(seed) });

      expect(board.nodes.length).toBeGreaterThanOrEqual(MIN_NODES);
      expect(board.nodes.length).toBeLessThanOrEqual(MAX_NODES);
      expect(board.edges.length).toBeGreaterThanOrEqual(MIN_EDGES);
      expect(board.edges.length).toBeLessThanOrEqual(MAX_EDGES);

      for (const edge of board.edges) {
        expect(edge.from).not.toBe(edge.to);
      }

      const degree = new Map<number, number>(board.nodes.map((n) => [n.id, 0]));
      const parallelCounts = new Map<string, number>();
      for (const edge of board.edges) {
        degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
        degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
        const key = pairKey(edge.from, edge.to);
        parallelCounts.set(key, (parallelCounts.get(key) ?? 0) + 1);
      }
      for (const n of board.nodes) {
        expect(degree.get(n.id) ?? 0).toBeGreaterThanOrEqual(1);
      }
      for (const count of parallelCounts.values()) {
        expect(count).toBeLessThanOrEqual(MAX_PARALLEL_EDGES);
      }

      const diagnosis = diagnoseEuler(board);
      expect(diagnosis.validStartIds.length).toBeGreaterThan(0);

      const solved = solveOneStroke(board, diagnosis.validStartIds[0]);
      assertUsesEveryEdgeOnce(board, solved.tourEdgeIds);
      assertConsecutiveNodesConnectedByEdge(board, solved.tourNodeIds, solved.tourEdgeIds);
    }
  });

  it('falls back to Math.random when no rng is given', () => {
    const board = generateOneStrokeBoard();
    expect(board.nodes.length).toBeGreaterThanOrEqual(MIN_NODES);
  });
});
