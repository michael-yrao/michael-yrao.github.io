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

// ── Helpers ───────────────────────────────────────────────────────────────────

const toKey = (r: number, c: number) => `${r},${c}`;

// ── Step generator ────────────────────────────────────────────────────────────
//
// This generator RUNS the exact algorithm from the Python source above:
// same interleaved seeding (per row: Pacific left edge, then Atlantic right
// edge; per col: Pacific top edge, then Atlantic bottom edge), same DFS
// recursion order (down, up, right, left). Steps are emitted as it executes.

function generateDfsSteps(): Step[] {
  const steps: Step[] = [];
  const canReachPacific = new Set<string>();
  const canReachAtlantic = new Set<string>();

  const LEGEND: NonNullable<GridState['legend']> = [
    { state: 'empty', label: 'unreached' },
    { state: 'visited', label: 'Pacific' },
    { state: 'queued', label: 'Atlantic' },
    { state: 'found', label: 'Both = answer' },
    { state: 'active', label: 'current cell' },
  ];

  // Render the grid from the CURRENT contents of both sets.
  // Green = Pacific, orange = Atlantic, gold = both (answer), cyan = active DFS cell.
  function render(activeKey?: string): GridState {
    return {
      type: 'grid',
      grid: HEIGHTS.map((row, r) =>
        row.map((h, c) => {
          const key = toKey(r, c);
          let state: GridCellState = 'empty';
          const inP = canReachPacific.has(key);
          const inA = canReachAtlantic.has(key);
          if (inP && inA) state = 'found';
          else if (inP) state = 'visited';
          else if (inA) state = 'queued';
          if (key === activeKey) state = 'active';
          return { state, label: String(h) };
        })
      ),
      legend: LEGEND,
      counters: [
        { label: 'canReachPacific', value: canReachPacific.size },
        { label: 'canReachAtlantic', value: canReachAtlantic.size },
      ],
    };
  }

  // Every step carries the full variable watch so each Python local is
  // trackable at every point of execution.
  interface VarSnapshot {
    row?: number;
    col?: number;
    previousHeight?: number;
    setName?: string;            // visitedSet currently bound in dfs()
    highlightSet?: boolean;      // highlight the set that just changed
    extra?: { name: string; value: string | number; highlight?: boolean }[];
  }

  function emit(explanation: string, highlightLine: number, activeKey: string | undefined, v: VarSnapshot): void {
    steps.push({
      explanation,
      highlightLine,
      state: render(activeKey),
      variables: [
        { name: 'row', value: v.row ?? '—' },
        { name: 'col', value: v.col ?? '—' },
        { name: 'previousHeight', value: v.previousHeight ?? '—' },
        { name: 'visitedSet', value: v.setName ?? '—' },
        { name: 'canReachPacific.size', value: canReachPacific.size, highlight: v.highlightSet && v.setName === 'canReachPacific' },
        { name: 'canReachAtlantic.size', value: canReachAtlantic.size, highlight: v.highlightSet && v.setName === 'canReachAtlantic' },
        ...(v.extra ?? []),
      ],
    });
  }

  // Exact port of the Python dfs(): emits one step per cell added to the set.
  function dfs(row: number, col: number, set: Set<string>, setName: string, previousHeight: number): void {
    const key = toKey(row, col);
    if (set.has(key) || row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (HEIGHTS[row][col] < previousHeight) return;

    set.add(key);
    emit(
      `dfs(${row}, ${col}) — height ${HEIGHTS[row][col]} ≥ previousHeight ${previousHeight}, so water can flow back the way we came. Add (${row},${col}) to ${setName}, then recurse down, up, right, left.`,
      32,
      key,
      { row, col, previousHeight, setName, highlightSet: true },
    );

    dfs(row + 1, col, set, setName, HEIGHTS[row][col]);
    dfs(row - 1, col, set, setName, HEIGHTS[row][col]);
    dfs(row, col + 1, set, setName, HEIGHTS[row][col]);
    dfs(row, col - 1, set, setName, HEIGHTS[row][col]);
  }

  // Seed call wrapper: shows each top-level dfs() call from the two for-loops,
  // including the ones that return immediately because the cell is already visited.
  function seed(row: number, col: number, set: Set<string>, setName: string, ocean: string, line: number): void {
    const key = toKey(row, col);
    const previousHeight = HEIGHTS[row][col];
    if (set.has(key)) {
      emit(
        `dfs(${row}, ${col}) for ${ocean}: (${row},${col}) is already in ${setName}, so the base case returns immediately.`,
        24,
        key,
        { row, col, previousHeight, setName },
      );
      return;
    }
    emit(
      `Seed ${ocean}: call dfs(${row}, ${col}, ${setName}, heights[${row}][${col}]=${previousHeight}). This border cell touches the ${ocean}, so anything we can climb to from here drains into it.`,
      line,
      key,
      {
        row, col, previousHeight, setName,
        extra: [{ name: 'phase', value: `${ocean} seed`, highlight: true }],
      },
    );
    dfs(row, col, set, setName, previousHeight);
  }

  // ── Intro ──────────────────────────────────────────────────────────────────
  emit(
    'Pacific Ocean borders the top row and left column; Atlantic borders the bottom row and right column. Instead of DFS from every cell, we DFS from the ocean edges and climb UPHILL — any cell we reach can drain back to that ocean. Two sets track reachability; we seed them by walking the borders, alternating one Pacific call and one Atlantic call per loop iteration. The legend below the grid shows what each color means.',
    12,
    undefined,
    { extra: [{ name: 'rows', value: ROWS }, { name: 'cols', value: COLS }] },
  );

  // ── for row in range(rows): one Pacific seed (left col), one Atlantic seed (right col) ──
  for (let row = 0; row < ROWS; row++) {
    seed(row, 0, canReachPacific, 'canReachPacific', 'Pacific', 44);
    seed(row, COLS - 1, canReachAtlantic, 'canReachAtlantic', 'Atlantic', 46);
  }

  // ── for col in range(cols): one Pacific seed (top row), one Atlantic seed (bottom row) ──
  for (let col = 0; col < COLS; col++) {
    seed(0, col, canReachPacific, 'canReachPacific', 'Pacific', 50);
    seed(ROWS - 1, col, canReachAtlantic, 'canReachAtlantic', 'Atlantic', 52);
  }

  // ── Final scan: collect cells present in both sets ─────────────────────────
  const result: string[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = toKey(row, col);
      if (canReachAtlantic.has(key) && canReachPacific.has(key)) result.push(`[${row},${col}]`);
    }
  }

  emit(
    'Both for-loops are done. Now scan every cell row by row and collect those present in BOTH canReachPacific and canReachAtlantic — the gold cells.',
    57,
    undefined,
    { extra: [{ name: 'result', value: '[]' }] },
  );

  emit(
    `Result: ${result.join(', ')} — the gold "Both = answer" cells, which can drain to both oceans.`,
    62,
    undefined,
    { extra: [{ name: 'result', value: result.join(' '), highlight: true }] },
  );

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
