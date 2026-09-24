import {
  Edge,
  Point,
  MAX_POINT_COUNT,
  MIN_PAIRWISE_DISTANCE,
  MIN_POINT_COUNT,
  buildEdges,
  buildUnionFind,
  createParent,
  edgeKey,
  find,
  generatePoints,
  manhattanDistance,
  primMST,
  totalWeight,
  union,
} from './connect-cities.solver';

/** Deterministic seeded PRNG (mulberry32) so board-generation tests are
 * reproducible without depending on Math.random. */
function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Independent Kruskal implementation (sort edges, union-find) used only in
 * this test file to cross-check primMST's total cost. */
function kruskalCost(points: readonly Point[]): number {
  const edges = buildEdges(points).slice().sort((a, b) => a.weight - b.weight);
  let parent = createParent(points.length);
  let cost = 0;
  let used = 0;

  for (const edge of edges) {
    const next = union(parent, edge.a, edge.b);
    if (next === null) continue;
    parent = next;
    cost += edge.weight;
    used++;
    if (used === points.length - 1) break;
  }

  return cost;
}

const LC_EXAMPLE_1: Point[] = [
  { x: 0, y: 0 },
  { x: 2, y: 2 },
  { x: 3, y: 10 },
  { x: 5, y: 2 },
  { x: 7, y: 0 },
];

const LC_EXAMPLE_2: Point[] = [
  { x: 3, y: 12 },
  { x: -2, y: 5 },
  { x: -4, y: 1 },
];

describe('manhattanDistance / buildEdges', () => {
  it('computes Manhattan distance', () => {
    expect(manhattanDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
  });

  it('builds one edge per unordered pair', () => {
    const points: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
    const edges = buildEdges(points);
    expect(edges.length).toBe(3);
    expect(edges.map((e) => `${e.a}-${e.b}`).sort()).toEqual(['0-1', '0-2', '1-2']);
  });

  it('never mutates the points array it is given', () => {
    const points: Point[] = [{ x: 0, y: 0 }, { x: 1, y: 1 }];
    const snapshot = JSON.stringify(points);
    buildEdges(points);
    expect(JSON.stringify(points)).toBe(snapshot);
  });
});

describe('primMST', () => {
  it('matches the LC 1584 example (expected cost 20)', () => {
    const result = primMST(LC_EXAMPLE_1);
    expect(result.totalCost).toBe(20);
    expect(result.edges.length).toBe(LC_EXAMPLE_1.length - 1);
  });

  it('matches the LC 1584 second example (expected cost 18)', () => {
    const result = primMST(LC_EXAMPLE_2);
    expect(result.totalCost).toBe(18);
  });

  it('cross-checks against an independent Kruskal implementation', () => {
    expect(primMST(LC_EXAMPLE_1).totalCost).toBe(kruskalCost(LC_EXAMPLE_1));
    expect(primMST(LC_EXAMPLE_2).totalCost).toBe(kruskalCost(LC_EXAMPLE_2));
  });

  it('cross-checks a larger generated board against Kruskal', () => {
    const points = generatePoints(seededRng(42));
    expect(primMST(points).totalCost).toBe(kruskalCost(points));
  });

  it('returns edges that form a valid spanning tree (n - 1 edges, no cycle)', () => {
    const points = generatePoints(seededRng(7));
    const result = primMST(points);
    expect(result.edges.length).toBe(points.length - 1);

    let parent = createParent(points.length);
    for (const edge of result.edges) {
      const next = union(parent, edge.a, edge.b);
      expect(next).not.toBeNull();
      parent = next as number[];
    }
  });

  it('never mutates the points array it is given', () => {
    const points: Point[] = LC_EXAMPLE_1.map((p) => ({ ...p }));
    const snapshot = JSON.stringify(points);
    primMST(points);
    expect(JSON.stringify(points)).toBe(snapshot);
  });
});

describe('union-find (find/union/buildUnionFind)', () => {
  it('starts with every node as its own root', () => {
    const parent = createParent(4);
    expect(parent.map((_, i) => find(parent, i))).toEqual([0, 1, 2, 3]);
  });

  it('union connects two roots and returns a new array (does not mutate input)', () => {
    const parent = createParent(3);
    const next = union(parent, 0, 1);
    expect(next).not.toBeNull();
    expect(find(next as number[], 0)).toBe(find(next as number[], 1));
    expect(parent).toEqual([0, 1, 2]); // original untouched
  });

  it('rejects a union that would close a cycle', () => {
    let parent = createParent(3);
    parent = union(parent, 0, 1) as number[];
    parent = union(parent, 1, 2) as number[];
    expect(union(parent, 0, 2)).toBeNull();
  });

  it('buildUnionFind folds a fresh parent array from an edge list', () => {
    const edges: Edge[] = [
      { a: 0, b: 1, weight: 1 },
      { a: 1, b: 2, weight: 1 },
    ];
    const parent = buildUnionFind(3, edges);
    expect(find(parent, 0)).toBe(find(parent, 2));
  });

  it('buildUnionFind on a shorter edge list (undo) no longer connects the dropped edge', () => {
    const edges: Edge[] = [{ a: 0, b: 1, weight: 1 }];
    const parent = buildUnionFind(3, edges);
    expect(find(parent, 0)).not.toBe(find(parent, 2));
  });
});

describe('edgeKey / totalWeight', () => {
  it('is order-independent for the same pair', () => {
    expect(edgeKey({ a: 2, b: 5, weight: 1 })).toBe(edgeKey({ a: 5, b: 2, weight: 1 }));
  });

  it('sums edge weights', () => {
    const edges: Edge[] = [{ a: 0, b: 1, weight: 3 }, { a: 1, b: 2, weight: 4 }];
    expect(totalWeight(edges)).toBe(7);
  });
});

describe('generatePoints', () => {
  it('is deterministic for a given rng and produces a count in range', () => {
    const a = generatePoints(seededRng(1));
    const b = generatePoints(seededRng(1));
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(MIN_POINT_COUNT);
    expect(a.length).toBeLessThanOrEqual(MAX_POINT_COUNT);
  });

  it('respects the minimum pairwise distance across several seeds', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const points = generatePoints(seededRng(seed));
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          expect(manhattanDistance(points[i], points[j])).toBeGreaterThanOrEqual(MIN_PAIRWISE_DISTANCE);
        }
      }
    }
  });
});
