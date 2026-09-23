import { AlgorithmMeta, SolutionVariant, Step, GridState, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's maxAreaOfIsland_20260617 verbatim: dfs's base cases check in
// the order out-of-bounds → visited → not-land, and the outer loop's guard checks
// "not in visited" before the land check — both matched exactly below.

// 5×5 grid with two islands: small island (area 2) and large island (area 5)
const RAW_GRID = [
  [0, 1, 1, 0, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 0, 1, 1],
  [0, 0, 0, 1, 0],
  [0, 0, 0, 1, 0],
];

const ROWS = RAW_GRID.length;
const COLS = RAW_GRID[0].length;

type CellOverride = 'water' | 'land' | 'visited' | 'queued';

function buildGrid(
  visited: Set<string>,
  active: Set<string>,
  maxCells: Set<string>
): GridState {
  return {
    type: 'grid',
    grid: RAW_GRID.map((row, r) =>
      row.map((cell, c) => {
        const key = `${r},${c}`;
        if (maxCells.has(key)) return { state: 'queued' as const };
        if (active.has(key)) return { state: 'fresh' as const };
        if (visited.has(key)) return { state: 'visited' as const };
        if (cell === 1) return { state: 'land' as const };
        return { state: 'water' as const };
      })
    ),
  };
}

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const visited = new Set<string>();
  let maxArea = 0;
  const maxCells = new Set<string>();

  const toKey = (r: number, c: number) => `${r},${c}`;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  steps.push({
    explanation:
      'Max Area of Island: scan each cell. When unvisited land is found, DFS to count all connected land cells. Track the maximum area seen. Grid has two islands — the left-side island (area 3) and the right-side island (area 4).',
    anchor: { match: 'visited = set()' },
    state: buildGrid(visited, new Set(), new Set()),
    variables: [
      { name: 'maxArea', value: 0 },
      { name: 'visited', value: 0 },
    ],
  });

  function dfs(r: number, c: number, islandCells: Set<string>): number {
    const key = toKey(r, c);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    if (visited.has(key)) return 0;
    if (RAW_GRID[r][c] !== 1) return 0;

    visited.add(key);
    islandCells.add(key);

    steps.push({
      explanation: `DFS at (${r},${c}) = land, unvisited. Add to visited. Current island size so far: ${islandCells.size}.`,
      anchor: { match: 'visited.add((row,col))' },
      state: buildGrid(visited, islandCells, new Set()),
      variables: [
        { name: 'row', value: r, highlight: true },
        { name: 'col', value: c, highlight: true },
        { name: 'island size', value: islandCells.size },
        { name: 'maxArea', value: maxArea },
      ],
    });

    return (
      1 +
      dfs(r + 1, c, islandCells) +
      dfs(r - 1, c, islandCells) +
      dfs(r, c + 1, islandCells) +
      dfs(r, c - 1, islandCells)
    );
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = toKey(r, c);
      if (!visited.has(key) && RAW_GRID[r][c] === 1) {
        const islandCells = new Set<string>();

        steps.push({
          explanation: `Outer scan found unvisited land at (${r},${c}). Starting DFS to measure this island.`,
          anchor: { match: 'if (row,col) not in visited and grid[row][col] == 1:' },
          state: buildGrid(visited, new Set([key]), new Set()),
          variables: [
            { name: 'row', value: r, highlight: true },
            { name: 'col', value: c, highlight: true },
            { name: 'maxArea', value: maxArea },
          ],
        });

        const area = dfs(r, c, islandCells);
        const isNewMax = area > maxArea;
        if (isNewMax) {
          maxArea = area;
          maxCells.clear();
          islandCells.forEach(k => maxCells.add(k));
        }

        steps.push({
          explanation: `Island at (${r},${c}) has area ${area}. ${isNewMax ? `New maximum! maxArea updated to ${area}.` : `maxArea stays at ${maxArea}.`} Max island cells highlighted in orange.`,
          anchor: { match: 'maxArea = max(maxArea, dfs(row,col))' },
          state: buildGrid(visited, new Set(), new Set(maxCells)),
          variables: [
            { name: 'area', value: area, highlight: true },
            { name: 'maxArea', value: maxArea, highlight: isNewMax },
          ],
        });
      }
    }
  }

  steps.push({
    explanation: `Scan complete. Maximum island area = ${maxArea}. The orange cells show the largest island. DFS visited each cell at most once → O(m×n) time and O(m×n) space for the visited set.`,
    anchor: { match: 'return maxArea' },
    state: buildGrid(visited, new Set(), maxCells),
    variables: [
      { name: 'maxArea', value: maxArea, highlight: true },
      { name: 'visited', value: `${visited.size} cells` },
    ],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'DFS with Visited Set',
  variant: 'dfs-visited',
  generateSteps,
};

export const maxAreaOfIslandMeta: AlgorithmMeta = {
  id: 'max-area-of-island',
  lcNumber: 695,
  title: 'Max Area of Island',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['BFS', 'DFS', 'Matrix'],
  timeComplexity: 'O(m × n)',
  spaceComplexity: 'O(m × n)',
  description:
    'You are given an m × n binary matrix grid. An island is a group of 1s connected 4-directionally. The area of an island is the number of cells with value 1 in the island. Return the maximum area of an island in grid, or 0 if there is no island.',
  examples: [
    {
      input: 'grid = [[0,0,1,0,0],[0,1,1,0,0],[0,1,0,0,0],[0,0,0,1,1]]',
      output: '4',
      explanation: 'The largest island has 4 connected land cells.',
    },
    {
      input: 'grid = [[0,0,0,0,0,0,0,0]]',
      output: '0',
      explanation: 'No land cells exist.',
    },
  ] as ProblemExample[],
  constraints: [
    'm == grid.length',
    'n == grid[i].length',
    '1 ≤ m, n ≤ 50',
    'grid[i][j] is either 0 or 1.',
  ],
  hint: 'Like Number of Islands but DFS returns the count instead of just marking visited. Each DFS call returns 1 + sum of all neighbor DFS calls, propagating island size back up the call stack.',
  solutions: [solution],
};
