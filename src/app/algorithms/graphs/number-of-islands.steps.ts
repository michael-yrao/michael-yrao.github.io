import { AlgorithmMeta, Step, GridState, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: BFS ───────────────────────────────────────────────────────────
//
// Traces cse-progress's numIslands verbatim: BFS marks a coordinate visited at
// ENQUEUE time (both the seed cell and every neighbor), never at dequeue.

type Cell = { state: import('../../core/models/algorithm.model').GridCellState };

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
    anchor: { match: 'for r in range(rows):' },
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
          explanation: `Found unvisited land at (${r},${c}). This starts island #${islandCount}. bfs(${r},${c}) seeds the queue with (${r},${c}) and marks it visited right here, at enqueue time — not when it's later dequeued.`,
          anchor: { match: 'def bfs(row,col):', to: { match: 'queue.append(currentCoordinate)' } },
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
            explanation: `Dequeue (${cr},${cc}) — it was already marked visited back when it was enqueued. Check its 4 neighbors: any unvisited land neighbor is marked visited AND enqueued right here (shown in orange), so it can never be enqueued twice. BFS ensures we explore the whole island level by level.`,
            anchor: { match: 'r, c = queue.popleft()' },
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
    anchor: { match: 'return islandCount' },
    state: makeGrid(new Map()),
    variables: [
      { name: 'islandCount', value: islandCount, highlight: true },
      { name: 'visited', value: `${visited.size} cells` },
    ],
  });

  return steps;
}

// ── Solution 2: DFS ───────────────────────────────────────────────────────────
//
// Traces cse-progress's numIslandsDFS verbatim: base-case order is out-of-bounds,
// then water, then already-visited — matched exactly below.

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
    anchor: { match: 'def dfs(row, col):' },
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
      anchor: { match: 'visited.add((row, col))' },
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
          anchor: { match: "if grid[row][col] == '1' and (row,col) not in visited:" },
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
    anchor: { match: 'return result' },
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
  tags: ['BFS', 'DFS', 'Matrix'],
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
    { label: 'BFS', variant: 'bfs', generateSteps: generateBfsSteps },
    { label: 'DFS', variant: 'dfs', generateSteps: generateDfsSteps },
  ],
};
