import { AlgorithmMeta, Step, GridState, GridCellState } from '../../core/models/algorithm.model';

// ── Python source ─────────────────────────────────────────────────────────────

const PYTHON_CODE = `import collections
from typing import List

class Solution:
    def floodFill(self, image: List[List[int]], sr: int, sc: int, color: int) -> List[List[int]]:
        # we are basically just doing BFS from one node and that's it
        # we actually need to save the original color of starting point so it can be compared

        originalColor = image[sr][sc]

        rows, cols = len(image), len(image[0])

        queue = collections.deque()

        queue.append((sr,sc))

        neighbors = [[1,0],[-1,0],[0,1],[0,-1]]

        while queue:
            # we can mark nodes as visited by just changing them to the color
            # so no need to have a visited set
            currentRow, currentCol = queue.popleft()
            image[currentRow][currentCol] = color
            # we now check currentNode's neighbors

            for rowInc, colInc in neighbors:
                neighborRow = currentRow + rowInc
                neighborCol = currentCol + colInc
                # if not out of bounds and was same color as original
                # we want to add it to queue
                # and also if originalColor != color
                if (neighborRow >= 0 and neighborRow < rows and neighborCol >= 0 and neighborCol < cols
                    and image[neighborRow][neighborCol] == originalColor
                    and originalColor != color):
                    queue.append((neighborRow, neighborCol))

        return image`;

// ── Example input ─────────────────────────────────────────────────────────────

const START_IMAGE = [
  [1, 1, 1],
  [1, 1, 0],
  [1, 0, 1],
];
const SR = 1;
const SC = 1;
const COLOR = 2;

// ── Step generator ────────────────────────────────────────────────────────────
//
// Runs the exact algorithm above: BFS that paints on DEQUEUE (no visited set),
// neighbor order down, up, right, left. Because the guard checks the pixel's
// color at ENQUEUE time, the same cell can be enqueued twice — the simulation
// shows that faithfully.

function generateBfsSteps(): Step[] {
  const steps: Step[] = [];
  const image = START_IMAGE.map(row => [...row]);
  const rows = image.length;
  const cols = image[0].length;
  const originalColor = image[SR][SC];

  const queue: [number, number][] = [[SR, SC]];
  const painted = new Set<string>();
  const key = (r: number, c: number) => `${r},${c}`;

  const LEGEND: NonNullable<GridState['legend']> = [
    { state: 'land', label: `original color (${originalColor})` },
    { state: 'empty', label: 'other color (barrier)' },
    { state: 'queued', label: 'in queue' },
    { state: 'active', label: 'being painted' },
    { state: 'visited', label: `painted to ${COLOR}` },
  ];

  function render(activeKey?: string): GridState {
    const queuedKeys = new Set(queue.map(([r, c]) => key(r, c)));
    return {
      type: 'grid',
      grid: image.map((row, r) =>
        row.map((px, c) => {
          const k = key(r, c);
          let state: GridCellState = 'empty';
          if (painted.has(k)) state = 'visited';
          else if (queuedKeys.has(k)) state = 'queued';
          else if (px === originalColor) state = 'land';
          if (k === activeKey) state = 'active';
          return { state, label: String(px) };
        })
      ),
      legend: LEGEND,
      counters: [
        { label: 'queue', value: queue.length ? queue.map(([r, c]) => `(${r},${c})`).join(' ') : 'empty' },
        { label: 'painted', value: painted.size },
      ],
    };
  }

  function emit(
    explanation: string,
    highlightLine: number,
    activeKey: string | undefined,
    v: { row?: number; col?: number },
  ): void {
    steps.push({
      explanation,
      highlightLine,
      state: render(activeKey),
      variables: [
        { name: 'currentRow', value: v.row ?? '—' },
        { name: 'currentCol', value: v.col ?? '—' },
        { name: 'originalColor', value: originalColor },
        { name: 'color', value: COLOR },
        { name: 'queue', value: queue.length ? queue.map(([r, c]) => `(${r},${c})`).join(' ') : '[]' },
      ],
    });
  }

  emit(
    `Flood fill from (${SR},${SC}) with new color ${COLOR}. Save originalColor = image[${SR}][${SC}] = ${originalColor}, then seed the BFS queue with the start pixel. No visited set is needed — painting a pixel to ${COLOR} is itself the "visited" mark.`,
    15,
    key(SR, SC),
    {},
  );

  while (queue.length) {
    const [currentRow, currentCol] = queue.shift()!;
    const k = key(currentRow, currentCol);
    const wasAlreadyPainted = painted.has(k);
    image[currentRow][currentCol] = COLOR;
    painted.add(k);

    const enqueued: string[] = [];
    const skipped: string[] = [];
    // neighbors = [[1,0],[-1,0],[0,1],[0,-1]] — down, up, right, left
    for (const [rowInc, colInc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = currentRow + rowInc;
      const nc = currentCol + colInc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) {
        skipped.push(`(${nr},${nc}) out of bounds`);
        continue;
      }
      if (image[nr][nc] !== originalColor || originalColor === COLOR) {
        skipped.push(`(${nr},${nc})=${image[nr][nc]} ≠ ${originalColor}`);
        continue;
      }
      queue.push([nr, nc]);
      enqueued.push(`(${nr},${nc})`);
    }

    const dupNote = wasAlreadyPainted
      ? ` Note: (${currentRow},${currentCol}) was enqueued twice — the guard checks the pixel at enqueue time, but painting happens at dequeue, so a cell can enter the queue from two different neighbors before either paints it. The repaint is a harmless no-op.`
      : '';
    const enqText = enqueued.length ? `Enqueue ${enqueued.join(', ')}.` : 'No neighbors qualify.';
    const skipText = skipped.length ? ` Skipped: ${skipped.join('; ')}.` : '';

    emit(
      `Dequeue (${currentRow},${currentCol}) and paint it to ${COLOR}. Check neighbors down, up, right, left. ${enqText}${skipText}${dupNote}`,
      23,
      k,
      { row: currentRow, col: currentCol },
    );
  }

  emit(
    `Queue is empty — every pixel connected to the start by the original color ${originalColor} is now painted ${COLOR}. Return image = [${image.map(r => `[${r.join(',')}]`).join(',')}]. The bottom-right 1 stays untouched: it is only diagonally adjacent, and flood fill spreads horizontally and vertically only.`,
    37,
    undefined,
    {},
  );

  return steps;
}

// ── Export ────────────────────────────────────────────────────────────────────

export const floodFillMeta: AlgorithmMeta = {
  id: 'flood-fill',
  lcNumber: 733,
  title: 'Flood Fill',
  difficulty: 'Easy',
  category: 'graphs',
  tags: ['BFS', 'DFS', 'Matrix'],
  timeComplexity: 'O(m × n)',
  spaceComplexity: 'O(m × n)',
  description:
    'You are given an image represented by an m × n grid of integers, where image[i][j] is the pixel value. Starting from pixel (sr, sc), perform a flood fill: change the starting pixel to the new color, then repeat for every horizontally or vertically adjacent pixel that shares the original color of the starting pixel. Return the modified image.',
  examples: [
    {
      input: 'image = [[1,1,1],[1,1,0],[1,0,1]], sr = 1, sc = 1, color = 2',
      output: '[[2,2,2],[2,2,0],[2,0,1]]',
      explanation: 'All pixels 4-directionally connected to (1,1) through color 1 become 2. The bottom-right 1 is only diagonally connected, so it stays.',
    },
    {
      input: 'image = [[0,0,0],[0,0,0]], sr = 0, sc = 0, color = 0',
      output: '[[0,0,0],[0,0,0]]',
      explanation: 'The new color equals the original color, so nothing changes.',
    },
  ],
  constraints: [
    'm == image.length',
    'n == image[i].length',
    '1 ≤ m, n ≤ 50',
    '0 ≤ image[i][j], color < 2^16',
    '0 ≤ sr < m, 0 ≤ sc < n',
  ],
  hint: 'BFS (or DFS) from the start pixel. Save the original color first, then expand to 4-directional neighbors that still have it. Painting a pixel doubles as marking it visited — but guard against color == originalColor or the loop never terminates.',
  solutions: [
    {
      label: 'BFS (Queue)',
      pythonCode: PYTHON_CODE,
      generateSteps: generateBfsSteps,
    },
  ],
};
