import { AlgorithmMeta, Step, StepAnchor, GridState, GridCellState } from '../../core/models/algorithm.model';

// ── Example input ─────────────────────────────────────────────────────────────

const START_IMAGE = [
  [1, 1, 1],
  [1, 1, 0],
  [1, 0, 1],
];
const SR = 1;
const SC = 1;
const COLOR = 2;

const NEIGHBOR_OFFSETS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const NEIGHBOR_NAMES = ['down', 'up', 'right', 'left'];

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's floodFill_20260628 exactly: an early return when the start
// pixel already has the target color, the start pixel painted BEFORE the loop begins,
// and every neighbor painted at ENQUEUE time (not dequeue) — so a cell can never be
// enqueued twice (once painted, a later visit's color check fails). Neighbor order:
// down, up, right, left.

function generateBfsSteps(): Step[] {
  const steps: Step[] = [];
  const image = START_IMAGE.map((row) => [...row]);
  const rows = image.length;
  const cols = image[0].length;
  const startColor = image[SR][SC];
  const queue: [number, number][] = [];

  const key = (r: number, c: number): string => `${r},${c}`;
  const isPainted = (r: number, c: number): boolean => image[r][c] === COLOR;

  function render(activeKey: string | undefined): GridState {
    const queuedKeys = new Set(queue.map(([r, c]) => key(r, c)));
    return {
      type: 'grid',
      grid: image.map((row, r) =>
        row.map((px, c) => {
          const k = key(r, c);
          let state: GridCellState = 'empty';
          // A queued cell is already painted (painting happens at enqueue) but still
          // pending processing — queued must win over painted, or 'queued' never shows.
          if (queuedKeys.has(k)) state = 'queued';
          else if (isPainted(r, c)) state = 'visited';
          else if (px === startColor) state = 'land';
          if (k === activeKey) state = 'active';
          return { state, label: String(px) };
        }),
      ),
      legend: [
        { state: 'land', label: `original color (${startColor})` },
        { state: 'empty', label: 'other color (barrier)' },
        { state: 'queued', label: 'in queue' },
        { state: 'active', label: 'being processed' },
        { state: 'visited', label: `painted to ${COLOR}` },
      ],
      counters: [{ label: 'queue', value: queue.length ? queue.map(([r, c]) => `(${r},${c})`).join(' ') : 'empty' }],
    };
  }

  function emit(explanation: string, anchor: StepAnchor, activeKey: string | undefined, v: { cr?: number; cc?: number }): void {
    steps.push({
      explanation,
      anchor,
      state: render(activeKey),
      variables: [
        { name: 'cr', value: v.cr ?? '—' },
        { name: 'cc', value: v.cc ?? '—' },
        { name: 'originalColor', value: startColor },
        { name: 'color', value: COLOR },
        { name: 'queue', value: queue.length ? queue.map(([r, c]) => `(${r},${c})`).join(' ') : '[]' },
      ],
    });
  }

  emit(
    `Check image[sr][sc] (image[${SR}][${SC}] = ${startColor}) against color (${COLOR}): they differ, so there's no early return — proceed to flood fill.`,
    { match: 'if image[sr][sc] == color:' },
    key(SR, SC),
    {},
  );

  queue.push([SR, SC]);
  image[SR][SC] = COLOR;

  emit(
    `Save originalColor = image[sr][sc] = ${startColor}, then immediately paint image[sr][sc] to ${COLOR} and enqueue (sr,sc) — painting happens here, before the loop even starts, not on dequeue.`,
    { match: 'queue = collections.deque()', to: { match: 'image[sr][sc] = color' } },
    key(SR, SC),
    { cr: SR, cc: SC },
  );

  while (queue.length) {
    const [cr, cc] = queue.shift()!;
    const enqueued: string[] = [];
    const skipped: string[] = [];

    NEIGHBOR_OFFSETS.forEach(([ir, ic], i) => {
      const nr = cr + ir;
      const nc = cc + ic;
      const inBounds = nr >= 0 && nr < rows && nc >= 0 && nc < cols;
      if (!inBounds) {
        skipped.push(`(${nr},${nc}) out of bounds`);
        return;
      }
      if (image[nr][nc] !== startColor) {
        skipped.push(`(${nr},${nc})=${image[nr][nc]} ≠ ${startColor} (${NEIGHBOR_NAMES[i]})`);
        return;
      }
      image[nr][nc] = COLOR;
      queue.push([nr, nc]);
      enqueued.push(`(${nr},${nc}) ${NEIGHBOR_NAMES[i]}`);
    });

    const enqText = enqueued.length ? `Painted and enqueued ${enqueued.join(', ')}.` : 'No neighbors qualify.';
    const skipText = skipped.length ? ` Skipped: ${skipped.join('; ')}.` : '';

    emit(
      `Dequeue (${cr},${cc}). Check its 4 neighbors (down, up, right, left) against originalColor; any that still show it are painted to ${COLOR} and enqueued right here — so a cell can never be enqueued twice. ${enqText}${skipText}`,
      { match: 'cr, cc = queue.popleft()', to: { match: 'queue.append((nr,nc))' } },
      key(cr, cc),
      { cr, cc },
    );
  }

  emit(
    `Queue is empty — every pixel connected to the start by the original color ${startColor} is now painted ${COLOR}. Return image = [${image.map((r) => `[${r.join(',')}]`).join(',')}]. The bottom-right 1 stays untouched: it's only diagonally adjacent, and flood fill spreads horizontally and vertically only.`,
    { match: 'return image', nth: 2 }, // the early-return's "return image" (line 146) is the 1st hit
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
      variant: 'bfs',
      generateSteps: generateBfsSteps,
    },
  ],
};
