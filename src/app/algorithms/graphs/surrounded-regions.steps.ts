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

export const surroundedRegionsMeta: AlgorithmMeta = {
  id: 'surrounded-regions',
  lcNumber: 130,
  title: 'Surrounded Regions',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['BFS', 'Graph', 'Matrix', 'DFS'],
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
  hint: "Which 'O' cells can never be captured? Start from the border and think about connectivity — instead of finding surrounded regions, find the ones that are NOT surrounded.",
  solutions: [
    { label: 'BFS', pythonCode: PYTHON_CODE, generateSteps },
  ],
};
