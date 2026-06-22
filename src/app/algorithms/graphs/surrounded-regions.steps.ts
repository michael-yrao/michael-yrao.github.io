import { AlgorithmMeta, Step, GridState, GridCellState, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def solve(self, board: List[List[str]]) -> None:
        rows, cols = len(board), len(board[0])

        safeQueue = collections.deque()

        # left and right side
        for row in range(rows):
            if board[row][0] == 'O':
                safeQueue.append((row,0))
            if board[row][cols-1] == 'O':
                safeQueue.append((row,cols-1))

        # top and bottom
        for col in range(cols):
            if board[0][col] == 'O':
                safeQueue.append((0,col))
            if board[rows-1][col] == 'O':
                safeQueue.append((rows-1,col))

        neighbors = [[1,0],[-1,0],[0,1],[0,-1]]

        while safeQueue:
            currentRow, currentCol = safeQueue.popleft()
            board[currentRow][currentCol] = 'S'

            for neighbor in neighbors:
                rowInc = neighbor[0]
                colInc = neighbor[1]
                neighborRow = currentRow + rowInc
                neighborCol = currentCol + colInc
                if neighborRow >= 0 and neighborRow < rows and neighborCol >= 0 and neighborCol < cols and board[neighborRow][neighborCol] == 'O':
                    safeQueue.append((neighborRow,neighborCol))

        for row in range(rows):
            for col in range(cols):
                if board[row][col] == 'O':
                    board[row][col] = 'X'
                elif board[row][col] == 'S':
                    board[row][col] = 'O'`;

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
    highlightLine: 3,
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
    highlightLine: 8,
    state: makeGrid(),
    variables: [
      { name: 'scanning', value: 'left + right edges' },
      { name: 'safeQueue', value: '∅' },
    ],
  });

  steps.push({
    explanation:
      "Scan top edge (row 0). All four cells are 'X' — nothing to add.",
    highlightLine: 15,
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
    highlightLine: 18,
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
      "BFS: pop (3,1). Set board[3][1] = 'S' (safe, shown green). Check 4 neighbors: up (2,1)='X', down (4,1)=out-of-bounds, left (3,0)='X', right (3,2)='X'. No 'O' neighbors — nothing new enqueued.",
    highlightLine: 24,
    state: makeGrid(),
    variables: [
      { name: 'currentRow', value: 3, highlight: true },
      { name: 'currentCol', value: 1, highlight: true },
      { name: 'safeQueue', value: '∅' },
    ],
  });

  steps.push({
    explanation:
      "safeQueue is empty — BFS complete. Only (3,1) is safe. The interior cluster at (1,1), (1,2), (2,2) has no path to any edge: it is fully surrounded and will be captured.",
    highlightLine: 23,
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
      "Final pass — scan every cell. board[1][1]='O' → captured → 'X'. board[1][2]='O' → captured → 'X'. board[2][2]='O' → captured → 'X'. These three cells have no escape to the border.",
    highlightLine: 37,
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
      "Final pass continued: board[3][1]='S' → restore to 'O'. It was border-connected, so it survives. The board is now fully updated in-place.",
    highlightLine: 39,
    state: makeGrid(),
    variables: [
      { name: 'restored', value: '(3,1) → O', highlight: true },
    ],
  });

  safeSet.delete(toKey(3, 1));
  board[3][1] = 'O';

  steps.push({
    explanation:
      "Done. Three interior 'O' cells were captured to 'X'. The border-connected 'O' at (3,1) is preserved. Time: O(m×n) — two linear passes. Space: O(m×n) — BFS queue in the worst case.",
    highlightLine: 35,
    state: makeGrid(),
    variables: [
      { name: 'result', value: 'board modified in-place', highlight: true },
    ],
  });

  return steps;
}

const PYTHON_CODE_UF = `def solve(self, board: List[List[str]]) -> None:
    rows, cols = len(board), len(board[0])
    n = rows * cols  # virtual border node index

    parent = list(range(n + 1))
    rank = [0] * (n + 1)

    def find(x):
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    def union(x, y):
        rx, ry = find(x), find(y)
        if rx == ry:
            return
        if rank[rx] < rank[ry]:
            rx, ry = ry, rx
        parent[ry] = rx
        if rank[rx] == rank[ry]:
            rank[rx] += 1

    for r in range(rows):
        for c in range(cols):
            if board[r][c] == 'O':
                if r == 0 or r == rows - 1 or c == 0 or c == cols - 1:
                    union(r * cols + c, n)

    for r in range(rows):
        for c in range(cols):
            if board[r][c] == 'O':
                for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols and board[nr][nc] == 'O':
                        union(r * cols + c, nr * cols + nc)

    for r in range(rows):
        for c in range(cols):
            if board[r][c] == 'O' and find(r * cols + c) != find(n):
                board[r][c] = 'X'`;

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
    hashmapLabel: 'parent',
    hashmap: { ...parent } as Record<string | number, string | number>,
    hashmap2Label: 'rank',
    hashmap2: { ...rank } as Record<string | number, number>,
  });

  // Step 1: Init
  steps.push({
    explanation: "n=16 (4×4 board). Initialize UF with n+1=17 nodes — one per cell plus virtual border node B. parent[i]=i, rank[i]=0. Key insight: any O cell that unions with B is 'safe' — all remaining O cells after processing get flipped to X.",
    highlightLine: 5,
    state: mkState(),
    variables: [
      { name: 'n', value: 16 },
      { name: 'virtual node B', value: 'idx 16' },
    ],
  });

  // Step 2: Border scan — (3,1) is a border O
  ns[3] = 'active'; ns[4] = 'active'; es[0] = 'active';
  steps.push({
    explanation: "Pass 1: scan all border cells. Only (3,1) is 'O' on the border (bottom row). Call union((3,1), B). find(3,1)=3,1, find(B)=B. Ranks equal → parent[B]=(3,1), rank[(3,1)]→1.",
    highlightLine: 26,
    state: mkState(),
    variables: [
      { name: 'border O found', value: '(3,1)', highlight: true },
    ],
  });

  // Step 3: After border union
  parent['B'] = '3,1'; rank['3,1'] = 1;
  ns[3] = 'found'; ns[4] = 'found'; es[0] = 'found';
  steps.push({
    explanation: "parent[B]=(3,1). B is now a child of (3,1). Both are in the safe component (shown green). Any O cell that later unions into this component survives.",
    highlightLine: 19,
    state: mkState(),
    variables: [
      { name: 'parent[B]', value: '(3,1)', highlight: true },
      { name: 'rank[(3,1)]', value: 1, highlight: true },
    ],
  });

  // Step 4: Adjacent scan — (1,1) and (1,2)
  ns[0] = 'active'; ns[1] = 'active'; es[1] = 'active';
  steps.push({
    explanation: "Pass 2: scan interior O cells for adjacent O neighbors. (1,1) and (1,2) are both O and adjacent → union((1,1),(1,2)). find(1,1)=1,1, find(1,2)=1,2. Ranks equal → parent[(1,2)]=(1,1), rank[(1,1)]→1.",
    highlightLine: 34,
    state: mkState(),
    variables: [
      { name: 'union', value: '(1,1) ↔ (1,2)', highlight: true },
    ],
  });

  // Step 5: After (1,1)↔(1,2) union
  parent['1,2'] = '1,1'; rank['1,1'] = 1;
  ns[0] = 'visited'; ns[1] = 'visited'; es[1] = 'visited';
  steps.push({
    explanation: "parent[(1,2)]=(1,1). {(1,1),(1,2)} share root (1,1). This cluster is not yet connected to B — still potentially surrounded.",
    highlightLine: 19,
    state: mkState(),
    variables: [
      { name: 'parent[(1,2)]', value: '(1,1)', highlight: true },
      { name: 'component', value: '{(1,1),(1,2)}, root=(1,1)' },
    ],
  });

  // Step 6: (1,2) and (2,2) adjacent
  ns[1] = 'active'; ns[2] = 'active'; es[2] = 'active';
  steps.push({
    explanation: "(1,2) and (2,2) are adjacent O cells → union((1,2),(2,2)). find((1,2))=(1,1) via path compression. find((2,2))=(2,2). rank[(1,1)]=1 > rank[(2,2)]=0 → parent[(2,2)]=(1,1).",
    highlightLine: 34,
    state: mkState(),
    variables: [
      { name: 'union', value: '(1,2) ↔ (2,2)', highlight: true },
      { name: 'find((1,2))', value: '(1,1) via compression' },
    ],
  });

  // Step 7: After (1,2)↔(2,2) union
  parent['2,2'] = '1,1';
  ns[1] = 'visited'; ns[2] = 'visited'; es[2] = 'visited';
  steps.push({
    explanation: "parent[(2,2)]=(1,1). All three interior O cells share root (1,1). Is (1,1) connected to B? find((1,1))=(1,1), find(B)=(3,1). Different roots → this cluster is completely surrounded.",
    highlightLine: 19,
    state: mkState(),
    variables: [
      { name: 'parent[(2,2)]', value: '(1,1)', highlight: true },
      { name: 'find(B)', value: '(3,1)' },
      { name: 'find((1,1))', value: '(1,1) ≠ (3,1)' },
    ],
  });

  // Step 8: Final capture
  ns[0] = 'active'; ns[1] = 'active'; ns[2] = 'active';
  steps.push({
    explanation: "Pass 3: for each O cell, if find(cell) ≠ find(B) → flip to X. find(B)=(3,1). (1,1),(1,2),(2,2) all have root (1,1) ≠ (3,1) → captured. (3,1) has root (3,1) = find(B) → stays O. Time: O(m×n·α(m×n)), Space: O(m×n).",
    highlightLine: 39,
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
    { label: 'Union Find', pythonCode: PYTHON_CODE_UF, generateSteps: generateStepsUF, timeComplexity: 'O(m×n · α(m×n))', spaceComplexity: 'O(m×n)' },
    { label: 'BFS', pythonCode: PYTHON_CODE, generateSteps, timeComplexity: 'O(m×n)', spaceComplexity: 'O(m×n)' },
  ],
};
