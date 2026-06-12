import { AlgorithmMeta, Step, GridState, GridCellState, ProblemExample } from '../../core/models/algorithm.model';

// ── Python source ─────────────────────────────────────────────────────────────

const PYTHON_CODE = `class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        # the question is really confusing
        # it is just asking to return a list of cells that can flow to both oceans
        # basically then we are doing DFS on every single cell and seeing if it can reach two of the 4 surfaces
        # preorder DFS as well since we need to make decision on current node
        # what we should do is start from each ocean instead and mark nodes as (canReachPacific, canReachAtlantic)
        # so we have a list of pacific nodes and a list of atlantic nodes
        # DFS on neighbors that are bigger, since we are starting from the end and then mark those nodes with (canReachPacific, canReachAtlantic)
        # we can't use a tuple because tuples are immutable, so we'll just do two sets

        canReachPacific = set()
        canReachAtlantic = set()

        rows = len(heights)
        cols = len(heights[0])

        # remember we are coming from outside
        # so previousHeight should be smaller than height we are going to
        def dfs(row, col, visitedSet, previousHeight):
            # this dfs is responsible for adding node to visited

            # typical base case first of going out of bounds or is already visited
            if (row,col) in visitedSet or row < 0 or row >= rows or col < 0 or col >= cols:
                return

            # if height is smaller than previousHeight, we don't continue as well
            if heights[row][col] < previousHeight:
                return

            # if valid, we will start with adding to visited
            visitedSet.add((row,col))

            # now let's go to the neighbors that have more height
            dfs(row+1, col, visitedSet, heights[row][col])
            dfs(row-1, col, visitedSet, heights[row][col])
            dfs(row, col+1, visitedSet, heights[row][col])
            dfs(row, col-1, visitedSet, heights[row][col])

        for row in range(rows):
            # we actually need to pass the set since we have two sets here
            # we actually also need to pass the previous height otherwise we can't tell if it can flow down or not
            # dfs starting from the left most column, which is pacific
            dfs(row, 0, canReachPacific, heights[row][0])
            # dfs starting from the top row, which is the atlantic
            dfs(row, cols - 1, canReachAtlantic, heights[row][cols-1])

        for col in range(cols):
            # first row, which is pacific ocean
            dfs(0, col, canReachPacific, heights[0][col])
            # last row, which is the atlantic ocean
            dfs(rows - 1, col, canReachAtlantic, heights[rows-1][col])

        result = []

        # now we go through and get everything that is in both sets
        for row in range(rows):
            for col in range(cols):
                if (row,col) in canReachAtlantic and (row,col) in canReachPacific:
                    result.append([row,col])

        return result`;

// ── Grid setup ────────────────────────────────────────────────────────────────

const HEIGHTS = [
  [1, 2, 2, 3],
  [3, 2, 3, 4],
  [2, 4, 5, 3],
  [6, 7, 1, 4],
];

const ROWS = HEIGHTS.length;
const COLS = HEIGHTS[0].length;

// Precomputed sets (traced from the algorithm on the 4×4 grid above)
const PACIFIC_SET = new Set<string>([
  '0,0', '0,1', '0,2', '0,3',
  '1,0', '1,1', '1,2', '1,3',
  '2,0', '2,1', '2,2',
  '3,0', '3,1',
]);

const ATLANTIC_SET = new Set<string>([
  '0,3',
  '1,3',
  '2,2', '2,3',
  '3,0', '3,1', '3,2', '3,3',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

const toKey = (r: number, c: number) => `${r},${c}`;

type CellOverride = Map<string, GridCellState>;

function makeGrid(overrides: CellOverride, counters?: { label: string; value: number | string }[]): GridState {
  return {
    type: 'grid',
    grid: HEIGHTS.map((row, r) =>
      row.map((_, c) => {
        const key = toKey(r, c);
        if (overrides.has(key)) return { state: overrides.get(key)!, label: String(HEIGHTS[r][c]) };
        return { state: 'empty' as GridCellState, label: String(HEIGHTS[r][c]) };
      })
    ),
    counters,
  };
}

// ── Step generator ────────────────────────────────────────────────────────────

function generateDfsSteps(): Step[] {
  const steps: Step[] = [];

  // ── Step 1: Overview — show raw grid with heights ─────────────────────────
  steps.push({
    explanation:
      'Pacific Ocean borders the top row and left column. Atlantic Ocean borders the bottom row and right column. We want cells whose water can flow (downhill or level) to BOTH oceans. The key insight: instead of DFS from every cell, start DFS from the ocean edges and work UPHILL — any cell we reach is guaranteed to drain back to that ocean.',
    highlightLine: 13,
    state: makeGrid(new Map(), [
      { label: 'pacificCount', value: 0 },
      { label: 'atlanticCount', value: 0 },
      { label: 'bothCount', value: 0 },
    ]),
    variables: [
      { name: 'rows', value: ROWS },
      { name: 'cols', value: COLS },
    ],
  });

  // ── Step 2: Seed Pacific — left column ────────────────────────────────────
  const pacificSeedOverrides: CellOverride = new Map();
  for (let r = 0; r < ROWS; r++) pacificSeedOverrides.set(toKey(r, 0), 'queued');
  for (let c = 0; c < COLS; c++) pacificSeedOverrides.set(toKey(0, c), 'queued');

  steps.push({
    explanation:
      'Seed Pacific DFS: mark the entire left column and top row as reachable from Pacific (shown in orange). These are our starting points — we will expand uphill from each one.',
    highlightLine: 44,
    state: makeGrid(pacificSeedOverrides, [
      { label: 'pacificCount', value: 7 },
      { label: 'atlanticCount', value: 0 },
      { label: 'bothCount', value: 0 },
    ]),
    variables: [
      { name: 'phase', value: 'Pacific DFS', highlight: true },
    ],
  });

  // ── Step 3: Pacific DFS expanding from left column ────────────────────────
  // Row 2: (2,1)=4 reachable from (2,0)=2; (2,2)=5 from (2,1)
  // Row 3: (3,1)=7 from (3,0)=6
  // Row 1: (1,1)=2 from (0,1), (1,2)=3 from (0,2), (1,3)=4 from (0,3)
  const pacificPhaseOverrides: CellOverride = new Map();
  for (const key of PACIFIC_SET) pacificPhaseOverrides.set(key, 'visited');

  steps.push({
    explanation:
      'Pacific DFS complete. From each seed cell we recursively visit neighbors with height >= current cell\'s height. Cells (2,1), (2,2), (3,1), (1,1), (1,2), (1,3) were reached by climbing uphill from the Pacific edges. Green = can reach Pacific.',
    highlightLine: 38,
    state: makeGrid(pacificPhaseOverrides, [
      { label: 'pacificCount', value: PACIFIC_SET.size },
      { label: 'atlanticCount', value: 0 },
      { label: 'bothCount', value: 0 },
    ]),
    variables: [
      { name: 'canReachPacific.size', value: PACIFIC_SET.size, highlight: true },
    ],
  });

  // ── Step 4: Seed Atlantic — right column + bottom row ─────────────────────
  const atlanticSeedOverrides: CellOverride = new Map();
  for (const key of PACIFIC_SET) atlanticSeedOverrides.set(key, 'visited');
  for (let r = 0; r < ROWS; r++) atlanticSeedOverrides.set(toKey(r, COLS - 1), 'queued');
  for (let c = 0; c < COLS; c++) atlanticSeedOverrides.set(toKey(ROWS - 1, c), 'queued');

  steps.push({
    explanation:
      'Now seed Atlantic DFS: mark the entire right column and bottom row (orange). These borders touch the Atlantic. We keep the Pacific results (green) visible so we can spot the intersection later.',
    highlightLine: 47,
    state: makeGrid(atlanticSeedOverrides, [
      { label: 'pacificCount', value: PACIFIC_SET.size },
      { label: 'atlanticCount', value: 7 },
      { label: 'bothCount', value: 0 },
    ]),
    variables: [
      { name: 'phase', value: 'Atlantic DFS', highlight: true },
    ],
  });

  // ── Step 5: Atlantic DFS expansion ───────────────────────────────────────
  // From (2,3)=3: (2,2)=5>=3 → add
  // From (3,2)=1: (2,2)=5>=1 → add (already added)
  // Atlantic expansion only adds (2,2) beyond the seeded edges
  const atlanticExpansionOverrides: CellOverride = new Map();
  for (const key of PACIFIC_SET) atlanticExpansionOverrides.set(key, 'visited');
  // Atlantic-only cells (not in pacific set): (0,3),(1,3),(2,3),(3,3),(3,0),(3,1),(3,2) + (2,2) — (2,2) is in both
  for (const key of ATLANTIC_SET) {
    if (!PACIFIC_SET.has(key)) {
      atlanticExpansionOverrides.set(key, 'queued');
    }
  }
  // (2,2) is in both — mark it specially (queued since atlantic pass is active)
  atlanticExpansionOverrides.set('2,2', 'queued');

  steps.push({
    explanation:
      'Atlantic DFS expands uphill from the seeded edges. Cell (2,2) with height 5 is reachable from (2,3)=3 and (3,2)=1 — both lower — so it joins the Atlantic set. Orange = can reach Atlantic. The DFS base case stops when a neighbor\'s height is smaller than the previous cell\'s height.',
    highlightLine: 38,
    state: makeGrid(atlanticExpansionOverrides, [
      { label: 'pacificCount', value: PACIFIC_SET.size },
      { label: 'atlanticCount', value: ATLANTIC_SET.size },
      { label: 'bothCount', value: 0 },
    ]),
    variables: [
      { name: 'canReachAtlantic.size', value: ATLANTIC_SET.size, highlight: true },
    ],
  });

  // ── Step 6: Intersection — final answer ──────────────────────────────────
  const BOTH_SET = new Set<string>();
  for (const key of PACIFIC_SET) {
    if (ATLANTIC_SET.has(key)) BOTH_SET.add(key);
  }

  const finalOverrides: CellOverride = new Map();
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const key = toKey(r, c);
      const inP = PACIFIC_SET.has(key);
      const inA = ATLANTIC_SET.has(key);
      if (inP && inA) {
        finalOverrides.set(key, 'land');   // "found" equivalent — use 'land' (highlighted yellow/gold in grid)
      } else if (inP) {
        finalOverrides.set(key, 'visited');  // pacific only — green
      } else if (inA) {
        finalOverrides.set(key, 'queued');   // atlantic only — orange
      } else {
        finalOverrides.set(key, 'water');    // neither
      }
    }
  }

  steps.push({
    explanation:
      `Intersection complete. We scan every cell and collect those in BOTH canReachPacific and canReachAtlantic. Answer: ${[...BOTH_SET].map(k => `(${k.replace(',', ', ')})`).join(', ')}. Green = Pacific only. Orange = Atlantic only. Yellow = both (answer). Blue = neither.`,
    highlightLine: 55,
    state: makeGrid(finalOverrides, [
      { label: 'pacificCount', value: PACIFIC_SET.size },
      { label: 'atlanticCount', value: ATLANTIC_SET.size },
      { label: 'bothCount', value: BOTH_SET.size, },
    ]),
    variables: [
      { name: 'result.length', value: BOTH_SET.size, highlight: true },
    ],
  });

  return steps;
}

// ── Export ────────────────────────────────────────────────────────────────────

export const pacificAtlanticWaterFlowMeta: AlgorithmMeta = {
  id: 'pacific-atlantic-water-flow',
  lcNumber: 417,
  title: 'Pacific Atlantic Water Flow',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['DFS', 'BFS', 'Graph', 'Matrix'],
  timeComplexity: 'O(m × n)',
  spaceComplexity: 'O(m × n)',
  description:
    'There is an m × n rectangular island that borders both the Pacific Ocean (top and left edges) and the Atlantic Ocean (bottom and right edges). Rain water flows to neighboring cells with height ≤ current height, and can flow off the island edges into the ocean. Return a list of grid coordinates where water can flow to both the Pacific and Atlantic oceans.',
  examples: [
    {
      input: 'heights = [[1,2,2,3],[3,2,3,4],[2,4,5,3],[6,7,1,4]]',
      output: '[[0,3],[1,3],[2,2],[3,0],[3,1]]',
      explanation: 'These 5 cells can drain downhill to reach both ocean borders',
    },
    {
      input: 'heights = [[1]]',
      output: '[[0,0]]',
      explanation: 'Single cell borders both oceans',
    },
  ] as ProblemExample[],
  constraints: [
    'm == heights.length',
    'n == heights[r].length',
    '1 ≤ m, n ≤ 200',
    '0 ≤ heights[r][c] ≤ 10^5',
  ],
  hint: 'Instead of DFS from every cell (expensive), reverse the problem: start DFS from each ocean\'s border edges and expand to any neighbor with height >= current. The intersection of the two reachable sets is the answer.',
  solutions: [
    {
      label: 'DFS (Reverse)',
      pythonCode: PYTHON_CODE,
      generateSteps: generateDfsSteps,
    },
  ],
};
