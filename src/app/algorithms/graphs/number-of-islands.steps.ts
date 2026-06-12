import { AlgorithmMeta, SolutionVariant, Step, GridState, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: BFS ───────────────────────────────────────────────────────────

const BFS_CODE = `class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        # so this is clearly a bfs question
        # So how do we determine we have an island
        # And how do we know when to continue looking
        # how do know the 1s are part of the same island

        if not grid:
            return 0

        rows, cols = len(grid), len(grid[0])
        visited = set()
        islandCount = 0

        def bfs(row,col):
            queue = collections.deque()
            currentCoordinate = (row,col)
            visited.add(currentCoordinate)
            queue.append(currentCoordinate)

            while queue:
                r, c = queue.popleft()
                # check the 4 neighbors of this coordinate
                # east, west, north, south
                directions = [[1,0], [-1,0], [0,1], [0,-1]]

                for dr, dc in directions:
                    # if neighbor is a valid unvisited land
                    # mark it as visited
                    neighourCoordinate = (r+dr, c+dc)
                    if (r + dr in range(rows)
                        and c + dc in range(cols)
                        and grid[r+dr][c+dc] == '1'
                        and neighourCoordinate not in visited):
                        queue.append(neighourCoordinate)
                        visited.add(neighourCoordinate)

        for r in range(rows):
            for c in range(cols):
                # when we see an unvisited island
                # we perform bfs on it to mark all land connected to it
                if grid[r][c] == '1' and (r,c) not in visited:
                    bfs(r,c)
                    islandCount+=1

        return islandCount`;

type Cell = { state: import('../../core/models/algorithm.model').GridCellState };

function cloneGrid(g: Cell[][]): Cell[][] {
  return g.map((row) => row.map((c) => ({ ...c })));
}

function generateBfsSteps(): Step[] {
  const rawGrid = [
    ['1', '1', '0', '0'],
    ['1', '0', '0', '1'],
    ['0', '0', '1', '1'],
    ['0', '0', '0', '0'],
  ];

  const rows = rawGrid.length;
  const cols = rawGrid[0].length;
  const steps: Step[] = [];
  const visited = new Set<string>();
  let islandCount = 0;

  const toKey = (r: number, c: number) => `${r},${c}`;

  const makeGrid = (overrides: Map<string, Cell['state']>): GridState => ({
    type: 'grid',
    grid: rawGrid.map((row, r) =>
      row.map((cell, c) => {
        const key = toKey(r, c);
        if (overrides.has(key)) return { state: overrides.get(key)! };
        if (visited.has(key)) return { state: 'visited' };
        return { state: cell === '1' ? 'land' : 'water' };
      })
    ),
    counters: [{ label: 'islands', value: islandCount }],
  });

  steps.push({
    explanation:
      "We scan the grid cell by cell. When we find unvisited land ('1'), we BFS to mark all connected land as part of the same island — so we never count a cell twice.",
    highlightLine: 41,
    state: makeGrid(new Map()),
    variables: [
      { name: 'rows', value: rows },
      { name: 'cols', value: cols },
      { name: 'islandCount', value: 0 },
      { name: 'visited', value: 0 },
    ],
  });

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rawGrid[r][c] === '1' && !visited.has(toKey(r, c))) {
        islandCount++;

        steps.push({
          explanation: `Found unvisited land at (${r},${c}). This starts island #${islandCount}. We launch BFS from here to find all land cells connected to this island.`,
          highlightLine: 45,
          state: makeGrid(new Map([[toKey(r, c), 'queued']])),
          variables: [
            { name: 'r', value: r, highlight: true },
            { name: 'c', value: c, highlight: true },
            { name: 'islandCount', value: islandCount, highlight: true },
            { name: 'queue', value: `[(${r},${c})]` },
            { name: 'visited', value: visited.size },
          ],
        });

        const queue: [number, number][] = [[r, c]];
        visited.add(toKey(r, c));

        while (queue.length > 0) {
          const [cr, cc] = queue.shift()!;

          const overrides = new Map<string, Cell['state']>();
          overrides.set(toKey(cr, cc), 'visited');

          for (const [dr, dc] of dirs) {
            const nr = cr + dr;
            const nc = cc + dc;
            const key = toKey(nr, nc);
            if (
              nr >= 0 && nr < rows &&
              nc >= 0 && nc < cols &&
              rawGrid[nr][nc] === '1' &&
              !visited.has(key)
            ) {
              overrides.set(key, 'queued');
              queue.push([nr, nc]);
              visited.add(key);
            }
          }

          const queueDisplay = queue.length === 0
            ? '∅'
            : queue.length <= 3
            ? `[${queue.map(([a, b]) => `(${a},${b})`).join(', ')}]`
            : `${queue.length} items`;
          steps.push({
            explanation: `BFS: processing (${cr},${cc}). Mark it visited. Enqueue unvisited land neighbors (shown in orange). BFS ensures we explore the whole island level by level.`,
            highlightLine: 25,
            state: makeGrid(overrides),
            variables: [
              { name: 'r', value: cr, highlight: true },
              { name: 'c', value: cc, highlight: true },
              { name: 'islandCount', value: islandCount },
              { name: 'queue', value: queueDisplay },
              { name: 'visited', value: visited.size },
            ],
          });
        }
      }
    }
  }

  steps.push({
    explanation: `Scan complete. We found ${islandCount} island(s). BFS guaranteed every connected land group was counted exactly once, regardless of island shape.`,
    highlightLine: 47,
    state: makeGrid(new Map()),
    variables: [
      { name: 'islandCount', value: islandCount, highlight: true },
      { name: 'visited', value: `${visited.size} cells` },
    ],
  });

  return steps;
}

// ── Solution 2: DFS ───────────────────────────────────────────────────────────

const DFS_CODE = `class Solution:
    def numIslandsDFS(self, grid: List[List[str]]) -> int:
        # so we can do DFS as well to traverse the island
        # we will traverse if node is land
        # check all neighbors and mark all land neighbors as visited
        # when we return, we will add 1 to island count

        visited = set()
        result = 0

        rows, cols = len(grid), len(grid[0])

        def dfs(row, col):
            # base case to stop is if we find water
            # if we are out of bounds, return 0
            if row < 0 or row >= rows or col < 0 or col >= cols:
                return 0

            # if we find water, return 0
            if grid[row][col] == '0':
                return 0

            # if we already visited, return 0
            if (row, col) in visited:
                return 0

            # mark current node as visited
            visited.add((row, col))
            # now we go as deep as possible in all 4 directions
            dfs(row+1,col)
            dfs(row-1,col)
            dfs(row,col+1)
            dfs(row,col-1)

            return 1

        for row in range(rows):
            for col in range(cols):
                if grid[row][col] == '1' and (row,col) not in visited:
                    result+=dfs(row,col)
        return result`;

function generateDfsSteps(): Step[] {
  const rawGrid = [
    ['1', '1', '0', '0'],
    ['1', '0', '0', '1'],
    ['0', '0', '1', '1'],
    ['0', '0', '0', '0'],
  ];

  const rows = rawGrid.length;
  const cols = rawGrid[0].length;
  const steps: Step[] = [];
  const visited = new Set<string>();
  let islandCount = 0;
  const toKey = (r: number, c: number) => `${r},${c}`;

  const makeGrid = (activeCell: [number, number] | null): GridState => ({
    type: 'grid',
    grid: rawGrid.map((row, r) =>
      row.map((cell, c) => {
        const key = toKey(r, c);
        if (activeCell && activeCell[0] === r && activeCell[1] === c) {
          return { state: 'queued' as const };
        }
        if (visited.has(key)) return { state: 'visited' as const };
        return { state: cell === '1' ? 'land' as const : 'water' as const };
      })
    ),
    counters: [{ label: 'islands', value: islandCount }],
  });

  steps.push({
    explanation:
      'DFS explores as deeply as possible before backtracking. No explicit queue — DFS uses the call stack itself. When we find unvisited land, we mark it and immediately recurse into every neighbor.',
    highlightLine: 15,
    state: makeGrid(null),
    variables: [
      { name: 'rows', value: rows },
      { name: 'cols', value: cols },
      { name: 'result', value: 0 },
    ],
  });

  function dfs(r: number, c: number): void {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    if (rawGrid[r][c] === '0') return;
    if (visited.has(toKey(r, c))) return;

    visited.add(toKey(r, c));

    steps.push({
      explanation: `DFS at (${r},${c}): land and unvisited. Mark visited (now green). Recurse down → up → right → left — going as deep as possible before backtracking.`,
      highlightLine: 30,
      state: makeGrid([r, c]),
      variables: [
        { name: 'row', value: r, highlight: true },
        { name: 'col', value: c, highlight: true },
        { name: 'visited', value: visited.size },
      ],
    });

    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rawGrid[r][c] === '1' && !visited.has(toKey(r, c))) {
        islandCount++;
        steps.push({
          explanation: `Outer loop found unvisited land at (${r},${c}). Starting DFS to mark all connected land as island #${islandCount}.`,
          highlightLine: 41,
          state: makeGrid([r, c]),
          variables: [
            { name: 'row', value: r, highlight: true },
            { name: 'col', value: c, highlight: true },
            { name: 'result', value: islandCount, highlight: true },
          ],
        });
        dfs(r, c);
      }
    }
  }

  steps.push({
    explanation: `DFS complete. Found ${islandCount} island(s). DFS and BFS both visit each cell once — O(m×n). DFS uses O(m×n) call-stack space in the worst case vs BFS's explicit queue.`,
    highlightLine: 43,
    state: makeGrid(null),
    variables: [
      { name: 'result', value: islandCount, highlight: true },
      { name: 'visited', value: `${visited.size} cells` },
    ],
  });

  return steps;
}

// ── Export ────────────────────────────────────────────────────────────────────

export const numberOfIslandsMeta: AlgorithmMeta = {
  id: 'number-of-islands',
  lcNumber: 200,
  title: 'Number of Islands',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['BFS', 'DFS', 'Graph', 'Matrix'],
  timeComplexity: 'O(m × n)',
  spaceComplexity: 'O(m × n)',
  description:
    'Given an m × n 2D grid of \'1\'s (land) and \'0\'s (water), return the number of islands. An island is formed by connecting adjacent land cells horizontally or vertically, and is surrounded by water on all sides.',
  examples: [
    {
      input: 'grid = [["1","1","0"],["0","1","0"],["0","0","1"]]',
      output: '2',
      explanation: 'Top-left cluster and bottom-right cell are separate islands',
    },
    {
      input: 'grid = [["1","1","1"],["0","1","0"],["1","1","1"]]',
      output: '1',
      explanation: 'All land cells are connected through the center',
    },
  ] as ProblemExample[],
  constraints: ['m == grid.length', 'n == grid[i].length', '1 ≤ m, n ≤ 300', 'grid[i][j] is \'0\' or \'1\''],
  hint: 'When you find a land cell, how do you make sure you count its entire island as one? Think about marking cells so you never visit the same land twice.',
  solutions: [
    { label: 'BFS', pythonCode: BFS_CODE, generateSteps: generateBfsSteps },
    { label: 'DFS', pythonCode: DFS_CODE, generateSteps: generateDfsSteps },
  ],
};
