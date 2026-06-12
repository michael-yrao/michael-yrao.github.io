import { AlgorithmMeta, SolutionVariant, Step, GridState, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        # so this is clearly a bfs problem
        # what happens is when we hit a rotten orange, we perform a bfs on it to mark its neighbors as rotten
        # The above is wrong, we need to do a pre-scan to find all rotten oranges
        # because otherwise we will not be able to scan in real time
        # but one thing we have to keep notice is what if the orange there is already rotten
        # then we need to do a bfs on that so we should have a bfs helper function
        # we also need to check at the end if there are leftovers non-rotten oranges
        # The above here is also wrong, we should instead keep track of a starting count of fresh oranges
        # and decrement every time we mark one as rotten and if the number is not 0 at the end, we return false
        # we don't actually need a visited set like usual since when we rot the oranges, we mark the node as 2
        # which is equivalent of rotten here

        minute = 0

        neighbors = [[1,0], [-1,0], [0,1], [0,-1]]

        rottenQueue = collections.deque()
        freshOrangeCounter = 0

        rows, cols = len(grid), len(grid[0])

        # initial scan for rotten oranges and fresh oranges
        for row in range(rows):
            for col in range(cols):
                if grid[row][col] == 1:
                    freshOrangeCounter+=1
                elif grid[row][col] == 2:
                    rottenQueue.append((row,col))

        # now we spread the rot to neighbors
        # we also need to make sure there are fresh oranges to spread to
        while rottenQueue and freshOrangeCounter > 0:
            # we actually need to keep track of how many rotten oranges we have to start
            # this way we accurately depict how much time has passed
            numberOfRottenOranges = len(rottenQueue)
            for _ in range(numberOfRottenOranges):
                currentRow, currentCol = rottenQueue.popleft()
                for rowIncrement, colIncrement in neighbors:
                    # if 0, we don't do anything
                    # if 1, we rotten them by adding them to visited and rottenQueue
                    neighborRow = currentRow + rowIncrement
                    neighborCol = currentCol + colIncrement
                    if neighborRow >= 0 and neighborRow < rows and neighborCol >= 0 and neighborCol < cols and grid[neighborRow][neighborCol] == 1:
                        # change it to rotten
                        grid[neighborRow][neighborCol] = 2
                        # add to queue
                        rottenQueue.append((neighborRow, neighborCol))
                        # decrement fresh counter
                        freshOrangeCounter-=1
                # with this breadth over, we will increment time
            minute+=1

        if freshOrangeCounter > 0:
            return -1
        else:
            return minute`;

type CellVal = 0 | 1 | 2;

function generateSteps(): Step[] {
  const rawGrid: CellVal[][] = [
    [2, 1, 1],
    [1, 1, 0],
    [0, 1, 1],
  ];

  const rows = rawGrid.length;
  const cols = rawGrid[0].length;
  const steps: Step[] = [];

  const grid = rawGrid.map((r) => [...r]) as CellVal[][];

  const toGridState = (
    minute: number,
    fresh: number,
    highlightQueue?: [number, number][],
    newlyRotten?: [number, number][]
  ): GridState => ({
    type: 'grid',
    grid: grid.map((row, r) =>
      row.map((cell, c) => {
        const inQueue = highlightQueue?.some(([qr, qc]) => qr === r && qc === c);
        const newRotten = newlyRotten?.some(([nr, nc]) => nr === r && nc === c);
        if (cell === 0) return { state: 'empty' };
        if (cell === 1) return { state: newRotten ? 'rotten' : 'fresh' };
        return { state: inQueue ? 'queued' : 'rotten' };
      })
    ),
    counters: [
      { label: 'minute', value: minute },
      { label: 'fresh left', value: fresh },
    ],
  });

  const queue: [number, number][] = [];
  let fresh = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === 1) fresh++;
      if (grid[r][c] === 2) queue.push([r, c]);
    }
  }

  steps.push({
    explanation: `Initial grid: ${queue.length} rotten orange(s) (☠) and ${fresh} fresh orange(s) (◉). Pre-scan collects all rotten oranges into the BFS queue — multi-source BFS means rotting spreads from ALL of them simultaneously, not one at a time.`,
    highlightLine: 26,
    state: toGridState(0, fresh),
    variables: [
      { name: 'minute', value: 0 },
      { name: 'freshOrangeCounter', value: fresh, highlight: true },
      { name: 'rottenQueue', value: queue.length, highlight: true },
    ],
  });

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let minute = 0;

  while (queue.length > 0 && fresh > 0) {
    const batchSize = queue.length;
    const newlyRotten: [number, number][] = [];

    steps.push({
      explanation: `Minute ${minute + 1}: process all ${batchSize} currently-rotten orange(s) in the queue as a batch. One BFS level = one minute of time passing.`,
      highlightLine: 35,
      state: toGridState(minute, fresh, queue.slice(0, batchSize)),
      variables: [
        { name: 'minute', value: minute + 1, highlight: true },
        { name: 'freshOrangeCounter', value: fresh },
        { name: 'numberOfRottenOranges', value: batchSize },
      ],
    });

    for (let i = 0; i < batchSize; i++) {
      const [r, c] = queue.shift()!;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
          grid[nr][nc] = 2;
          queue.push([nr, nc]);
          fresh--;
          newlyRotten.push([nr, nc]);
        }
      }
    }

    minute++;

    steps.push({
      explanation: `After minute ${minute}: ${newlyRotten.length} new orange(s) rotted. ${fresh} fresh remain. Each fresh orange adjacent to a rotten one gets infected exactly once.`,
      highlightLine: 50,
      state: toGridState(minute, fresh, queue, newlyRotten),
      variables: [
        { name: 'minute', value: minute, highlight: true },
        { name: 'freshOrangeCounter', value: fresh, highlight: true },
        { name: 'newly rotted', value: newlyRotten.length },
        { name: 'rottenQueue', value: queue.length },
      ],
    });
  }

  const result = fresh > 0 ? -1 : minute;
  steps.push({
    explanation:
      fresh > 0
        ? `${fresh} fresh orange(s) are unreachable — isolated by empty cells. Return -1.`
        : `All oranges rotten after ${minute} minute(s). Multi-source BFS naturally gives us the minimum time because it spreads optimally from all sources in parallel.`,
    highlightLine: 58,
    state: toGridState(minute, fresh),
    variables: [
      { name: 'result', value: result, highlight: true },
      { name: 'freshOrangeCounter', value: fresh },
      { name: 'minute', value: minute },
    ],
  });

  return steps;
}

const bfsSolution: SolutionVariant = {
  label: 'Multi-Source BFS',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const rottingOrangesMeta: AlgorithmMeta = {
  id: 'rotting-oranges',
  lcNumber: 994,
  title: 'Rotting Oranges',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['BFS', 'Graph', 'Matrix'],
  timeComplexity: 'O(m × n)',
  spaceComplexity: 'O(m × n)',
  description:
    'You are given an m × n grid where each cell is 0 (empty), 1 (fresh orange), or 2 (rotten orange). Every minute, any fresh orange 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes until no fresh oranges remain, or -1 if impossible.',
  examples: [
    { input: 'grid = [[2,1,1],[1,1,0],[0,1,1]]', output: '4' },
    { input: 'grid = [[2,1,1],[0,1,1],[1,0,1]]', output: '-1', explanation: 'Bottom-left orange is isolated' },
    { input: 'grid = [[0,2]]', output: '0', explanation: 'No fresh oranges to begin with' },
  ] as ProblemExample[],
  constraints: [
    'm == grid.length',
    'n == grid[i].length',
    '1 ≤ m, n ≤ 10',
    'grid[i][j] is 0, 1, or 2',
  ],
  hint: 'Rotting spreads from every rotten orange simultaneously. What BFS strategy starts from multiple sources at the same time? How do you track that one BFS "level" equals one minute?',
  solutions: [bfsSolution],
};
