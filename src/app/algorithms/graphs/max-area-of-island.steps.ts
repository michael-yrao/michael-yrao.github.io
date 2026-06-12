import { AlgorithmMeta, SolutionVariant, Step, GridState, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def maxAreaOfIsland(self, grid: List[List[int]]) -> int:
        # ok so this is pretty much identical to number of islands
        # but difference is that we need to keep track of how many nodes are part of the island
        # so let's try for a DFS approach first
        # What DFS/BFS means is that it will look at every node in this current island
        # thus what we should be returning from DFS is +1 from each traversal if it hits
        # we need a visited

        visited = set()
        maxArea = 0

        rows, cols = len(grid), len(grid[0])

        def dfs(row,col):
            # base cases

            # if out of bound, 0
            if row < 0 or row >= rows or col < 0 or col >= cols:
                return 0

            # if water, 0
            if grid[row][col] == 0:
                return 0

            # if visited, 0
            if (row,col) in visited:
                return 0

            # if not, then new node
            # we add it to visited and increment size of our current island
            visited.add((row,col))
            return 1+dfs(row+1,col)+dfs(row-1,col)+dfs(row,col+1)+dfs(row,col-1)

        for row in range(rows):
            for col in range(cols):
                # if we found land, we will get its size and compare to maxArea
                if grid[row][col] == 1 and (row,col) not in visited:
                    maxArea = max(maxArea, dfs(row,col))

        return maxArea`;

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
    highlightLine: 10,
    state: buildGrid(visited, new Set(), new Set()),
    variables: [
      { name: 'maxArea', value: 0 },
      { name: 'visited', value: 0 },
    ],
  });

  function dfs(r: number, c: number, islandCells: Set<string>): number {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
    if (RAW_GRID[r][c] === 0) return 0;
    const key = toKey(r, c);
    if (visited.has(key)) return 0;

    visited.add(key);
    islandCells.add(key);

    steps.push({
      explanation: `DFS at (${r},${c}) = land, unvisited. Add to visited. Current island size so far: ${islandCells.size}.`,
      highlightLine: 32,
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
      if (RAW_GRID[r][c] === 1 && !visited.has(key)) {
        const islandCells = new Set<string>();

        steps.push({
          explanation: `Outer scan found unvisited land at (${r},${c}). Starting DFS to measure this island.`,
          highlightLine: 38,
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
          highlightLine: 39,
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
    highlightLine: 41,
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
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const maxAreaOfIslandMeta: AlgorithmMeta = {
  id: 'max-area-of-island',
  lcNumber: 695,
  title: 'Max Area of Island',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['BFS', 'DFS', 'Graph', 'Matrix'],
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
