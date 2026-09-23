import { AlgorithmMeta, SolutionVariant, Step, GridState, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's orangesRotting_20260625 verbatim: multi-source BFS with timer,
// freshOranges, rottenQueue and currentLevel (the batch-size snapshot). Per neighbor: rot
// the cell, decrement freshOranges, THEN append to rottenQueue — that order, not enqueue
// then decrement.

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
    opts: {
      queued?: [number, number][];
      newlyRotten?: [number, number][];
      active?: [number, number];
    } = {}
  ): GridState => ({
    type: 'grid',
    grid: grid.map((row, r) =>
      row.map((cell, c) => {
        const isActive = !!opts.active && opts.active[0] === r && opts.active[1] === c;
        const inQueue = opts.queued?.some(([qr, qc]) => qr === r && qc === c);
        const newRotten = opts.newlyRotten?.some(([nr, nc]) => nr === r && nc === c);
        if (cell === 0) return { state: 'empty' };
        if (cell === 1) return { state: newRotten ? 'rotten' : 'fresh' };
        // cell === 2 (rotten): active cell being processed > just-rotted > still-queued > settled
        if (isActive) return { state: 'active' };
        if (newRotten) return { state: 'rotten' };
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
    explanation: `Initial grid: ${queue.length} rotten orange(s) (☠) and ${fresh} fresh orange(s) (◉). Pre-scan collects all rotten oranges into rottenQueue — multi-source BFS means rotting spreads from ALL of them simultaneously, not one at a time.`,
    anchor: { match: 'for row in range(rows):', to: { match: 'rottenQueue.append((row,col))' } },
    state: toGridState(0, fresh),
    variables: [
      { name: 'timer', value: 0 },
      { name: 'freshOranges', value: fresh, highlight: true },
      { name: 'rottenQueue', value: queue.length, highlight: true },
    ],
  });

  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let minute = 0;

  while (queue.length > 0 && fresh > 0) {
    const batchSize = queue.length;
    const newlyRotten: [number, number][] = [];

    steps.push({
      explanation: `Minute ${minute + 1} begins: snapshot currentLevel = ${batchSize} (the oranges already rotten at the start of this minute). We'll pop exactly these ${batchSize} and let each infect its neighbors. Processing one whole BFS level = one minute passing.`,
      anchor: { match: 'currentLevel = len(rottenQueue)' },
      state: toGridState(minute, fresh, { queued: queue.slice(0, batchSize) }),
      variables: [
        { name: 'timer', value: minute + 1, highlight: true },
        { name: 'freshOranges', value: fresh },
        { name: 'currentLevel', value: batchSize, highlight: true },
      ],
    });

    for (let i = 0; i < batchSize; i++) {
      const [r, c] = queue.shift()!;
      const rottedThisPop: [number, number][] = [];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === 1) {
          grid[nr][nc] = 2;
          fresh--;
          queue.push([nr, nc]);
          rottedThisPop.push([nr, nc]);
          newlyRotten.push([nr, nc]);
        }
      }

      steps.push({
        explanation: `Minute ${minute + 1}, pop ${i + 1}/${batchSize}: take rotten orange (${r},${c}) off rottenQueue and check its 4 neighbors. ${
          rottedThisPop.length
            ? `Fresh orange(s) at ${rottedThisPop.map(([rr, cc]) => `(${rr},${cc})`).join(', ')} become rotten — mark them 2, decrement freshOranges, THEN append to rottenQueue.`
            : `No fresh neighbor (each is out of bounds, empty, or already rotten) — nothing to rot.`
        } fresh left: ${fresh}.`,
        anchor: { match: 'rottenRow, rottenCol = rottenQueue.popleft()', to: { match: 'rottenQueue.append((nr,nc))' } },
        state: toGridState(minute, fresh, { queued: queue.slice(), newlyRotten: rottedThisPop, active: [r, c] }),
        variables: [
          { name: 'pop', value: `(${r},${c})`, highlight: true },
          { name: 'rotted this pop', value: rottedThisPop.length },
          { name: 'freshOranges', value: fresh, highlight: rottedThisPop.length > 0 },
          { name: 'rottenQueue', value: queue.length },
        ],
      });
    }

    minute++;

    steps.push({
      explanation: `Minute ${minute} complete: all ${batchSize} orange(s) from this level processed, ${newlyRotten.length} new orange(s) rotted in total this minute. ${fresh} fresh remain. The newly-rotten oranges form the next BFS level.`,
      anchor: { match: 'timer+=1' },
      state: toGridState(minute, fresh, { queued: queue.slice(), newlyRotten }),
      variables: [
        { name: 'timer', value: minute, highlight: true },
        { name: 'freshOranges', value: fresh, highlight: true },
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
    anchor: fresh > 0 ? { match: 'return -1' } : { match: 'return timer' },
    state: toGridState(minute, fresh),
    variables: [
      { name: 'result', value: result, highlight: true },
      { name: 'freshOranges', value: fresh },
      { name: 'timer', value: minute },
    ],
  });

  return steps;
}

const bfsSolution: SolutionVariant = {
  label: 'Multi-Source BFS',
  variant: 'multi-source-bfs',
  generateSteps,
};

export const rottingOrangesMeta: AlgorithmMeta = {
  id: 'rotting-oranges',
  lcNumber: 994,
  title: 'Rotting Oranges',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['BFS', 'Matrix'],
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
