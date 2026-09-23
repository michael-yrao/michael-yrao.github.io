import { AlgorithmMeta, Step, StepAnchor, GridState, GridCellState, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's pacificAtlantic_20260611 verbatim: reverse-DFS with
// canVisitPacific / canVisitAtlantic sets and dfs's base case split into three
// separate ifs (out-of-bounds, already-visited, then priorHeight) — same net effect
// as a combined check, since neither branch indexes heights before it fires.

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
    priorHeight?: number;
    setName?: string;            // visitedSet currently bound in dfs()
    highlightSet?: boolean;      // highlight the set that just changed
    extra?: { name: string; value: string | number; highlight?: boolean }[];
  }

  function emit(explanation: string, anchor: StepAnchor, activeKey: string | undefined, v: VarSnapshot): void {
    steps.push({
      explanation,
      anchor,
      state: render(activeKey),
      variables: [
        { name: 'row', value: v.row ?? '—' },
        { name: 'col', value: v.col ?? '—' },
        { name: 'priorHeight', value: v.priorHeight ?? '—' },
        { name: 'visitedSet', value: v.setName ?? '—' },
        { name: 'canVisitPacific.size', value: canReachPacific.size, highlight: v.highlightSet && v.setName === 'canVisitPacific' },
        { name: 'canVisitAtlantic.size', value: canReachAtlantic.size, highlight: v.highlightSet && v.setName === 'canVisitAtlantic' },
        ...(v.extra ?? []),
      ],
    });
  }

  // Exact port of the Python dfs(): emits one step per cell added to the set.
  function dfs(row: number, col: number, set: Set<string>, setName: string, priorHeight: number): void {
    const key = toKey(row, col);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (set.has(key)) return;
    if (HEIGHTS[row][col] < priorHeight) return;

    set.add(key);
    emit(
      `dfs(${row}, ${col}) — height ${HEIGHTS[row][col]} ≥ priorHeight ${priorHeight}, so water can flow back the way we came. Add (${row},${col}) to ${setName}, then recurse down, up, right, left.`,
      { match: 'visitedSet.add((row,col))' },
      key,
      { row, col, priorHeight, setName, highlightSet: true },
    );

    dfs(row + 1, col, set, setName, HEIGHTS[row][col]);
    dfs(row - 1, col, set, setName, HEIGHTS[row][col]);
    dfs(row, col + 1, set, setName, HEIGHTS[row][col]);
    dfs(row, col - 1, set, setName, HEIGHTS[row][col]);
  }

  // Seed call wrapper: shows each top-level dfs() call from the two for-loops,
  // including the ones that return immediately because the cell is already visited.
  function seed(row: number, col: number, set: Set<string>, setName: string, ocean: string, callAnchor: StepAnchor): void {
    const key = toKey(row, col);
    const priorHeight = HEIGHTS[row][col];
    if (set.has(key)) {
      emit(
        `dfs(${row}, ${col}) for ${ocean}: (${row},${col}) is already in ${setName}, so the base case returns immediately.`,
        { match: 'if (row,col) in visitedSet:' },
        key,
        { row, col, priorHeight, setName },
      );
      return;
    }
    emit(
      `Seed ${ocean}: call dfs(${row}, ${col}, ${setName}, heights[${row}][${col}]=${priorHeight}). This border cell touches the ${ocean}, so anything we can climb to from here drains into it.`,
      callAnchor,
      key,
      {
        row, col, priorHeight, setName,
        extra: [{ name: 'phase', value: `${ocean} seed`, highlight: true }],
      },
    );
    dfs(row, col, set, setName, priorHeight);
  }

  // ── Intro ──────────────────────────────────────────────────────────────────
  emit(
    'Pacific Ocean borders the top row and left column; Atlantic borders the bottom row and right column. Instead of DFS from every cell, we DFS from the ocean edges and climb UPHILL — any cell we reach can drain back to that ocean. Two sets track reachability; we seed them by walking the borders, alternating one Pacific call and one Atlantic call per loop iteration. The legend below the grid shows what each color means.',
    { match: 'canVisitPacific = set()', to: { match: 'canVisitAtlantic = set()' } },
    undefined,
    { extra: [{ name: 'rows', value: ROWS }, { name: 'cols', value: COLS }] },
  );

  // ── for row in range(rows): one Pacific seed (left col), one Atlantic seed (right col) ──
  for (let row = 0; row < ROWS; row++) {
    seed(row, 0, canReachPacific, 'canVisitPacific', 'Pacific', { match: 'dfs(row, 0, canVisitPacific, heights[row][0])' });
    seed(row, COLS - 1, canReachAtlantic, 'canVisitAtlantic', 'Atlantic', { match: 'dfs(row, cols-1, canVisitAtlantic, heights[row][cols-1])' });
  }

  // ── for col in range(cols): one Pacific seed (top row), one Atlantic seed (bottom row) ──
  for (let col = 0; col < COLS; col++) {
    seed(0, col, canReachPacific, 'canVisitPacific', 'Pacific', { match: 'dfs(0, col, canVisitPacific,heights[0][col])' });
    seed(ROWS - 1, col, canReachAtlantic, 'canVisitAtlantic', 'Atlantic', { match: 'dfs(rows-1, col, canVisitAtlantic,heights[rows-1][col])' });
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
    'Both for-loops are done. Now scan every cell row by row and collect those present in BOTH canVisitPacific and canVisitAtlantic — the gold cells.',
    // nth 2: the 1st 'for row in range(rows):' is the Pacific/Atlantic seeding loop above.
    { match: 'for row in range(rows):', nth: 2, to: { match: 'result.append([row,col])' } },
    undefined,
    { extra: [{ name: 'result', value: '[]' }] },
  );

  emit(
    `Result: ${result.join(', ')} — the gold "Both = answer" cells, which can drain to both oceans.`,
    { match: 'return result' },
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
  tags: ['DFS', 'BFS', 'Matrix'],
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
      variant: 'reverse-dfs',
      generateSteps: generateDfsSteps,
    },
  ],
};
