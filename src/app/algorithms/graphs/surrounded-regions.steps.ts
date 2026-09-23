import { AlgorithmMeta, Step, GridState, GridCellState, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's two attempts verbatim:
// - BFS variant → solve_20260919: level-by-level BFS (lenQueue snapshot each round,
//   same net effect as popping one at a time for this input), cr/cc/nr/nc naming, and the
//   final pass is TWO SEPARATE loops — flip remaining 'O' to 'X', THEN flip 'S' back to
//   'O' — not one combined if/elif loop.
// - Union Find variant → solve_20260621_UnionFind: same virtual-node structure already
//   traced below (parentMap/rankMap/findParent/union) — only anchors change.

type BoardValue = 'X' | 'O' | 'S';

function generateSteps(): Step[] {
  // Board from Example 1:
  // X X X X
  // X O O X
  // X X O X
  // X O X X
  // Only (3,1) is a border 'O' — the cluster at (1,1),(1,2),(2,2) is surrounded.
  const rows = 4;
  const cols = 4;
  const steps: Step[] = [];
  const toKey = (r: number, c: number) => `${r},${c}`;

  const board: BoardValue[][] = [
    ['X', 'X', 'X', 'X'],
    ['X', 'O', 'O', 'X'],
    ['X', 'X', 'O', 'X'],
    ['X', 'O', 'X', 'X'],
  ];

  const safeSet = new Set<string>();
  const queuedSet = new Set<string>();

  const makeGrid = (overrides: Map<string, GridCellState> = new Map()): GridState => ({
    type: 'grid',
    grid: board.map((row, r) =>
      row.map((cell, c) => {
        const key = toKey(r, c);
        if (overrides.has(key)) return { state: overrides.get(key)! };
        if (safeSet.has(key)) return { state: 'visited' };
        if (queuedSet.has(key)) return { state: 'queued' };
        if (cell === 'X') return { state: 'water' };
        return { state: 'land' };
      })
    ),
    legend: [
      { state: 'water', label: "X (wall)" },
      { state: 'land', label: "O (region)" },
      { state: 'queued', label: "in safeQueue" },
      { state: 'visited', label: "S (safe)" },
      { state: 'found', label: "captured → X" },
    ],
  });

  steps.push({
    explanation:
      "Key insight: any 'O' touching a border can never be captured. Strategy: seed a BFS from every border 'O', mark connected 'O' regions as safe ('S'), then flip all remaining 'O' to 'X'.",
    anchor: { match: 'safeQueue = collections.deque()' },
    state: makeGrid(),
    variables: [
      { name: 'rows', value: rows },
      { name: 'cols', value: cols },
      { name: 'safeQueue', value: '∅' },
    ],
  });

  steps.push({
    explanation:
      "Scan left edge (col 0) and right edge (col 3). Every cell on both sides is 'X' — nothing added to safeQueue yet.",
    // nth 1: the 1st 'for row in range(rows):' is this border scan; #2 and #3 are the
    // two final-pass loops below.
    anchor: { match: 'for row in range(rows):', nth: 1, to: { match: 'safeQueue.append((row, cols - 1))' } },
    state: makeGrid(),
    variables: [
      { name: 'scanning', value: 'left + right edges' },
      { name: 'safeQueue', value: '∅' },
    ],
  });

  steps.push({
    explanation:
      "Scan top edge (row 0). All four cells are 'X' — nothing to add.",
    // nth 1: the 1st 'for col in range(cols):' is this border scan; #2 and #3 are nested
    // inside the two final-pass loops below.
    anchor: { match: 'for col in range(cols):', nth: 1, to: { match: 'safeQueue.append((rows - 1, col))' } },
    state: makeGrid(),
    variables: [
      { name: 'scanning', value: 'top edge (row 0)' },
      { name: 'safeQueue', value: '∅' },
    ],
  });

  queuedSet.add(toKey(3, 1));
  steps.push({
    explanation:
      "Scan bottom edge (row 3): (3,0)='X', (3,1)='O' ← border 'O'! Add (3,1) to safeQueue. (3,2)='X', (3,3)='X'. We now have one BFS seed.",
    anchor: { match: 'for col in range(cols):', nth: 1, to: { match: 'safeQueue.append((rows - 1, col))' } },
    state: makeGrid(),
    variables: [
      { name: 'scanning', value: 'bottom edge (row 3)' },
      { name: 'safeQueue', value: '[(3,1)]' },
    ],
  });

  queuedSet.delete(toKey(3, 1));
  safeSet.add(toKey(3, 1));
  board[3][1] = 'S';
  steps.push({
    explanation:
      "BFS level: lenQueue=1, pop (3,1). Set board[3][1] = 'S' (safe, shown green). Check 4 neighbors: up (2,1)='X', down (4,1)=out-of-bounds, left (3,0)='X', right (3,2)='X'. No 'O' neighbors — nothing new enqueued.",
    anchor: { match: 'cr, cc = safeQueue.popleft()', to: { match: 'safeQueue.append((nr,nc))' } },
    state: makeGrid(),
    variables: [
      { name: 'cr', value: 3, highlight: true },
      { name: 'cc', value: 1, highlight: true },
      { name: 'safeQueue', value: '∅' },
    ],
  });

  steps.push({
    explanation:
      "safeQueue is empty — BFS complete. Only (3,1) is safe. The interior cluster at (1,1), (1,2), (2,2) has no path to any edge: it is fully surrounded and will be captured.",
    anchor: { match: 'while safeQueue:' },
    state: makeGrid(),
    variables: [
      { name: 'safe cells', value: '(3,1)' },
      { name: 'surrounded', value: '(1,1), (1,2), (2,2)' },
    ],
  });

  const captureOverrides = new Map<string, GridCellState>([
    [toKey(1, 1), 'found'],
    [toKey(1, 2), 'found'],
    [toKey(2, 2), 'found'],
  ]);
  steps.push({
    explanation:
      "Final pass 1 of 2 — scan every cell; flip any remaining 'O' to 'X'. board[1][1]='O' → captured → 'X'. board[1][2]='O' → captured → 'X'. board[2][2]='O' → captured → 'X'. These three cells have no escape to the border.",
    // nth 2: the 1st 'for row in range(rows):' is the border scan above; #3 is the
    // restore pass below.
    anchor: { match: 'for row in range(rows):', nth: 2, to: { match: "board[row][col] = 'X'" } },
    state: makeGrid(captureOverrides),
    variables: [
      { name: 'captured', value: '(1,1), (1,2), (2,2)', highlight: true },
    ],
  });

  board[1][1] = 'X';
  board[1][2] = 'X';
  board[2][2] = 'X';

  steps.push({
    explanation:
      "Final pass 2 of 2 — a SEPARATE loop: scan every cell again; flip 'S' back to 'O'. board[3][1]='S' → restore to 'O'. It was border-connected, so it survives. The board is now fully updated in-place.",
    // nth 3: the restore pass is its own loop, after the capture pass above.
    anchor: { match: 'for row in range(rows):', nth: 3, to: { match: "board[row][col] = 'O'" } },
    state: makeGrid(),
    variables: [
      { name: 'restored', value: '(3,1) → O', highlight: true },
    ],
  });

  safeSet.delete(toKey(3, 1));
  board[3][1] = 'O';

  steps.push({
    explanation:
      "Done. Three interior 'O' cells were captured to 'X'. The border-connected 'O' at (3,1) is preserved. Time: O(m×n) — the two final passes are each linear. Space: O(m×n) — BFS queue in the worst case.",
    anchor: { match: 'for row in range(rows):', nth: 3, to: { match: "board[row][col] = 'O'" } },
    state: makeGrid(),
    variables: [
      { name: 'result', value: 'board modified in-place', highlight: true },
    ],
  });

  return steps;
}

function generateStepsUF(): Step[] {
  // Board 4x4 — O cells at (1,1)=idx5, (1,2)=idx6, (2,2)=idx10, (3,1)=idx13
  // Virtual border node B = idx 16 (n = 4×4 = 16)
  // Only border O: (3,1). Interior O pairs: (1,1)↔(1,2), (1,2)↔(2,2).
  const steps: Step[] = [];

  const NODE_POS = [
    { id: '1,1', x: 100, y: 80  },
    { id: '1,2', x: 240, y: 80  },
    { id: '2,2', x: 240, y: 190 },
    { id: '3,1', x: 100, y: 280 },
    { id: 'B',   x: 370, y: 175 },
  ];

  // Edges = the three union operations
  const EDGE_LIST: [string | number, string | number][] = [
    ['3,1', 'B'],
    ['1,1', '1,2'],
    ['1,2', '2,2'],
  ];

  type NS = 'default' | 'active' | 'visited' | 'found';
  type ES = 'default' | 'active' | 'visited' | 'found';
  const ns: NS[] = ['default', 'default', 'default', 'default', 'default'];
  const es: ES[] = ['default', 'default', 'default'];
  const parent: Record<string, string> = { '1,1': '1,1', '1,2': '1,2', '2,2': '2,2', '3,1': '3,1', B: 'B' };
  const rank: Record<string, number> = { '1,1': 0, '1,2': 0, '2,2': 0, '3,1': 0, B: 0 };

  const mkState = () => ({
    type: 'graph' as const,
    nodes: NODE_POS.map((p, i) => ({ ...p, state: ns[i] })),
    edges: EDGE_LIST.map(([from, to], i) => ({ from, to, state: es[i] })),
    hashmapLabel: 'parentMap',
    hashmap: { ...parent } as Record<string | number, string | number>,
    hashmap2Label: 'rankMap',
    hashmap2: { ...rank } as Record<string | number, number>,
  });

  // Step 1: Init
  steps.push({
    explanation: "Flatten the 2D board to 1D (cell (r,c) → r*cols+c) and add one virtual border node B = rows*cols. Initialize Union Find: parentMap[i]=i, rankMap[i]=0. Key insight: any O cell that ends up unioned with B is 'safe' — every O NOT connected to B gets flipped to X.",
    anchor: { match: 'for i in range(rows * cols + 1):', to: { match: 'rankMap[i] = 0' } },
    state: mkState(),
    variables: [
      { name: 'n', value: 16 },
      { name: 'virtual node B', value: 'idx 16' },
    ],
  });

  // Step 2: Border scan — (3,1) is a border O
  ns[3] = 'active'; ns[4] = 'active'; es[0] = 'active';
  steps.push({
    explanation: "Pass 1: scan all cells; (3,1) is an 'O' on the border (bottom row), so union(current1DNode, virtual1DNode). findParent(3,1)=3,1, findParent(B)=B. Ranks equal → else branch.",
    anchor: { match: 'union(current1DNode, virtual1DNode)' },
    state: mkState(),
    variables: [
      { name: 'border O found', value: '(3,1)', highlight: true },
    ],
  });

  // Step 3: After border union
  parent['B'] = '3,1'; rank['3,1'] = 1;
  ns[3] = 'found'; ns[4] = 'found'; es[0] = 'found';
  steps.push({
    explanation: "Equal ranks → else branch: parentMap[B]=(3,1), rankMap[(3,1)]→1. B is now a child of (3,1). Both are in the safe component (green). Any O that later unions into this component survives.",
    // nth 2: the 1st 'parentMap[node2Root] = node1Root' is the if-branch's line, used below.
    anchor: { match: 'parentMap[node2Root] = node1Root', nth: 2, to: { match: 'rankMap[node1Root] += 1' } },
    state: mkState(),
    variables: [
      { name: 'parentMap[B]', value: '(3,1)', highlight: true },
      { name: 'rankMap[(3,1)]', value: 1, highlight: true },
    ],
  });

  // Step 4: Adjacent scan — (1,1) and (1,2)
  ns[0] = 'active'; ns[1] = 'active'; es[1] = 'active';
  steps.push({
    explanation: "Still pass 1: for each O cell we also union it with adjacent O neighbors. (1,1) and (1,2) are both O and adjacent → union(current1DNode, neighbor1DNode). findParent(1,1)=1,1, findParent(1,2)=1,2. Ranks equal → else branch.",
    anchor: { match: 'union(current1DNode, neighbor1DNode)' },
    state: mkState(),
    variables: [
      { name: 'union', value: '(1,1) ↔ (1,2)', highlight: true },
    ],
  });

  // Step 5: After (1,1)↔(1,2) union
  parent['1,2'] = '1,1'; rank['1,1'] = 1;
  ns[0] = 'visited'; ns[1] = 'visited'; es[1] = 'visited';
  steps.push({
    explanation: "Equal ranks → else branch: parentMap[(1,2)]=(1,1), rankMap[(1,1)]→1. {(1,1),(1,2)} share root (1,1). This cluster is not yet connected to B — still potentially surrounded.",
    // nth 2: the 1st 'parentMap[node2Root] = node1Root' is the if-branch's line, used below.
    anchor: { match: 'parentMap[node2Root] = node1Root', nth: 2, to: { match: 'rankMap[node1Root] += 1' } },
    state: mkState(),
    variables: [
      { name: 'parentMap[(1,2)]', value: '(1,1)', highlight: true },
      { name: 'component', value: '{(1,1),(1,2)}, root=(1,1)' },
    ],
  });

  // Step 6: (1,2) and (2,2) adjacent
  ns[1] = 'active'; ns[2] = 'active'; es[2] = 'active';
  steps.push({
    explanation: "(1,2) and (2,2) are adjacent O cells → union(current1DNode, neighbor1DNode). findParent((1,2))=(1,1) via path compression. findParent((2,2))=(2,2). rankMap[(1,1)]=1 > rankMap[(2,2)]=0.",
    anchor: { match: 'union(current1DNode, neighbor1DNode)' },
    state: mkState(),
    variables: [
      { name: 'union', value: '(1,2) ↔ (2,2)', highlight: true },
      { name: 'findParent((1,2))', value: '(1,1) via compression' },
    ],
  });

  // Step 7: After (1,2)↔(2,2) union
  parent['2,2'] = '1,1';
  ns[1] = 'visited'; ns[2] = 'visited'; es[2] = 'visited';
  steps.push({
    explanation: "rankMap[(1,1)] > rankMap[(2,2)] → if branch (the first check): parentMap[(2,2)]=(1,1). All three interior O cells share root (1,1). Is (1,1) connected to B? findParent((1,1))=(1,1), findParent(B)=(3,1). Different roots → this cluster is completely surrounded.",
    // nth 1: the if-branch's line; the 2nd hit is the else-branch (equal ranks).
    anchor: { match: 'parentMap[node2Root] = node1Root', nth: 1 },
    state: mkState(),
    variables: [
      { name: 'parentMap[(2,2)]', value: '(1,1)', highlight: true },
      { name: 'findParent(B)', value: '(3,1)' },
      { name: 'findParent((1,1))', value: '(1,1) ≠ (3,1)' },
    ],
  });

  // Step 8: Final capture
  ns[0] = 'active'; ns[1] = 'active'; ns[2] = 'active';
  steps.push({
    explanation: "Final pass: for each O cell, if findParent(current1DNode) != findParent(virtual1DNode) → flip to X. findParent(B)=(3,1). (1,1),(1,2),(2,2) all have root (1,1) ≠ (3,1) → captured. (3,1) has root (3,1) = findParent(B) → stays O. Time: O(m×n·α(m×n)), Space: O(m×n).",
    anchor: { match: "if board[row][col] == 'O' and findParent(current1DNode) != findParent(virtual1DNode):", to: { match: "board[row][col] = 'X'" } },
    state: mkState(),
    variables: [
      { name: 'captured', value: '(1,1), (1,2), (2,2)', highlight: true },
      { name: 'safe', value: '(3,1)' },
    ],
  });

  return steps;
}

export const surroundedRegionsMeta: AlgorithmMeta = {
  id: 'surrounded-regions',
  lcNumber: 130,
  title: 'Surrounded Regions',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['BFS', 'Union Find', 'Matrix'],
  timeComplexity: 'O(m × n)',
  spaceComplexity: 'O(m × n)',
  description:
    "Given an m × n board of 'X' and 'O', capture all 'O' regions completely surrounded by 'X'. A region is surrounded if none of its 'O' cells touch the board edge. Flip captured cells to 'X' in-place.",
  examples: [
    {
      input: 'board = [["X","X","X","X"],["X","O","O","X"],["X","X","O","X"],["X","O","X","X"]]',
      output: '[["X","X","X","X"],["X","X","X","X"],["X","X","X","X"],["X","O","X","X"]]',
      explanation: "Interior O cluster is captured. The O at (3,1) touches the bottom edge and survives.",
    },
  ] as ProblemExample[],
  constraints: [
    'm == board.length',
    'n == board[i].length',
    '1 ≤ m, n ≤ 200',
    "board[i][j] is 'X' or 'O'",
  ],
  hint: "Which 'O' cells can never be captured? Find the ones that are NOT surrounded. For Union Find: add a virtual border node B — union every border O with B, then union all adjacent O pairs. Any O cell not connected to B at the end gets flipped.",
  solutions: [
    { label: 'Union Find', variant: 'union-find', generateSteps: generateStepsUF, timeComplexity: 'O(m×n · α(m×n))', spaceComplexity: 'O(m×n)' },
    { label: 'BFS', variant: 'bfs', generateSteps, timeComplexity: 'O(m×n)', spaceComplexity: 'O(m×n)' },
  ],
};
