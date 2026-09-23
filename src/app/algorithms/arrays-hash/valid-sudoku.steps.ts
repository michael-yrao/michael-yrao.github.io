import { AlgorithmMeta, SolutionVariant, Step, GridState, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Multi-pass (row, col, box) ────────────────────────────────────
//
// Traces cse-progress's isValidSudoku verbatim: three separate double-loop
// passes (row, then column, then box). Variable names (columnSet in the row
// pass, rowSet in the column pass, seenMap in the box pass) are exactly as the
// attempt names them, despite reading backwards. "if ... == '.':" / "continue"
// / "return False" are IDENTICAL text repeated once per pass — anchored with
// nth per pass, since no phase-specific substring exists for them.

// ── Solution 2: Single-loop ────────────────────────────────────────────────────
//
// Traces cse-progress's isValidSudoku_20260821 verbatim: rowMap/colMap/gridMap
// (this attempt names it colMap, not columnMap), and each row/col/box check is
// its own separate `if ...: return False` (three sequential ifs, NOT one
// condition chained by `or`), so a duplicate returns False from whichever of
// the three individual checks fires first.

// LeetCode Example 1 board
const BOARD: string[][] = [
  ['5', '3', '.', '.', '7', '.', '.', '.', '.'],
  ['6', '.', '.', '1', '9', '5', '.', '.', '.'],
  ['.', '9', '8', '.', '.', '.', '.', '6', '.'],
  ['8', '.', '.', '.', '6', '.', '.', '.', '3'],
  ['4', '.', '.', '8', '.', '3', '.', '.', '1'],
  ['7', '.', '.', '.', '2', '.', '.', '.', '6'],
  ['.', '6', '.', '.', '.', '.', '2', '8', '.'],
  ['.', '.', '.', '4', '1', '9', '.', '.', '5'],
  ['.', '.', '.', '.', '8', '.', '.', '7', '9'],
];

import { GridCellState } from '../../core/models/algorithm.model';

type Cell = { state: GridCellState; label?: string };

function makeBaseGrid(): Cell[][] {
  return BOARD.map((row) =>
    row.map((v) => ({
      state: (v === '.' ? 'empty' : 'land') as GridCellState,
      label: v === '.' ? '' : v,
    }))
  );
}

function cloneGrid(g: Cell[][]): Cell[][] {
  return g.map((row) => row.map((c) => ({ ...c })));
}

// ── Multi-pass step generator ─────────────────────────────────────────────────

function generateMultiPassSteps(): Step[] {
  const steps: Step[] = [];

  // Step 1: Show the board
  steps.push({
    explanation:
      'Given a 9x9 Sudoku board (partially filled). We validate three rules: (1) each row has no duplicate digits, (2) each column has no duplicate digits, (3) each 3x3 sub-box has no duplicate digits. Empty cells "." are wildcards and are skipped. We run three separate passes.',
    anchor: { match: 'def isValidSudoku(self, board: List[List[str]]) -> bool:' },
    state: {
      type: 'grid',
      grid: makeBaseGrid(),
      counters: [
        { label: 'check', value: 'initializing' },
        { label: 'result', value: 'pending' },
      ],
    } as GridState,
  });

  // ── Phase 1: Row checks ───────────────────────────────────────────────────
  let rowCheckGrid = makeBaseGrid();

  for (let row = 0; row < 9; row++) {
    const seen = new Set<string>();
    let dupFound = false;

    // Mark previous rows as visited
    const beforeGrid = cloneGrid(rowCheckGrid);
    for (let pr = 0; pr < row; pr++) {
      for (let pc = 0; pc < 9; pc++) {
        if (beforeGrid[pr][pc].state !== 'empty') {
          beforeGrid[pr][pc].state = 'visited' as GridCellState;
        }
      }
    }

    steps.push({
      explanation: `Row check — scanning row ${row}. Using columnSet to detect duplicate digits. Empty cells "." are skipped (wildcard). If we see the same digit twice in this row, the board is invalid.`,
      anchor: { match: 'columnSet = set()' },
      state: {
        type: 'grid',
        grid: beforeGrid,
        counters: [
          { label: 'check', value: `row ${row}` },
          { label: 'seen set', value: '{}' },
          { label: 'result', value: 'valid so far' },
        ],
      } as GridState,
    });

    for (let col = 0; col < 9; col++) {
      const val = BOARD[row][col];
      const g = cloneGrid(beforeGrid);
      g[row][col].state = 'queued' as GridCellState;

      if (val === '.') {
        steps.push({
          explanation: `Row ${row}, col ${col}: value is "." — wildcard, skip.`,
          // nth:1 selects pass 1 (row check); this exact check/continue text repeats identically in passes 2 and 3.
          anchor: { match: "if board[row][column] == '.':", nth: 1, to: { match: 'continue', nth: 1 } },
          state: {
            type: 'grid',
            grid: g,
            counters: [
              { label: 'check', value: `row ${row}, col ${col}` },
              { label: 'cell', value: '.' },
              { label: 'action', value: 'skip' },
            ],
          } as GridState,
        });
      } else if (seen.has(val)) {
        g[row][col].state = 'rotten' as GridCellState;
        dupFound = true;
        steps.push({
          explanation: `Row ${row}, col ${col}: value "${val}" already in seen set! Duplicate found — board is INVALID. Return false.`,
          // 'return False' is identical text in all 3 passes; nth:1 selects pass 1's.
          anchor: { match: 'elif board[row][column] in columnSet:', to: { match: 'return False', nth: 1 } },
          state: {
            type: 'grid',
            grid: g,
            counters: [
              { label: 'check', value: `row ${row}, col ${col}` },
              { label: 'cell', value: val },
              { label: 'result', value: 'INVALID — duplicate in row' },
            ],
          } as GridState,
        });
        break;
      } else {
        seen.add(val);
        beforeGrid[row][col].state = 'visited' as GridCellState;
        steps.push({
          explanation: `Row ${row}, col ${col}: value "${val}" is new — add to seen set. seen=${JSON.stringify([...seen])}.`,
          anchor: { match: 'columnSet.add(board[row][column])' },
          state: {
            type: 'grid',
            grid: g,
            counters: [
              { label: 'check', value: `row ${row}, col ${col}` },
              { label: 'cell', value: val },
              { label: 'seen set', value: JSON.stringify([...seen]) },
            ],
          } as GridState,
        });
      }
    }

    if (dupFound) break;

    // Mark entire row visited after clean pass
    for (let pc = 0; pc < 9; pc++) {
      if (rowCheckGrid[row][pc].state !== 'empty') {
        rowCheckGrid[row][pc].state = 'visited' as GridCellState;
      }
    }
  }

  // Summary after row checks
  steps.push({
    explanation:
      'All 9 rows checked — no duplicate digits found in any row. Phase 1 (row validation) passed. Moving on to Phase 2: column checks.',
    // nth:2 skips pass 1's inner 'for column in range(9):' (hit 1) and lands on pass 2's outer loop (hit 2).
    anchor: { match: 'for column in range(9):', nth: 2 },
    state: {
      type: 'grid',
      grid: (() => {
        const g = makeBaseGrid();
        g.forEach((row) => row.forEach((c) => { if (c.state === 'land') c.state = 'visited' as GridCellState; }));
        return g;
      })(),
      counters: [
        { label: 'rows checked', value: '9 / 9' },
        { label: 'result', value: 'VALID' },
      ],
    } as GridState,
  });

  // ── Phase 2: Column checks ────────────────────────────────────────────────
  // Show 3 representative columns (0, 4, 8) for brevity
  const colCheckGrid = makeBaseGrid();
  colCheckGrid.forEach((row) => row.forEach((c) => { if (c.state === 'land') c.state = 'visited' as GridCellState; }));

  for (const col of [0, 4, 8]) {
    const seen = new Set<string>();
    const g = cloneGrid(colCheckGrid);

    steps.push({
      explanation: `Column check — scanning column ${col}. A fresh rowSet tracks digits seen so far in this column (named rowSet despite scanning a column). Duplicates → return false.`,
      anchor: { match: 'rowSet = set()' },
      state: {
        type: 'grid',
        grid: g,
        counters: [
          { label: 'check', value: `column ${col}` },
          { label: 'seen set', value: '{}' },
          { label: 'result', value: 'valid so far' },
        ],
      } as GridState,
    });

    for (let row = 0; row < 9; row++) {
      const val = BOARD[row][col];
      const cg = cloneGrid(g);
      cg[row][col].state = 'queued' as GridCellState;

      if (val !== '.') {
        seen.add(val);
        steps.push({
          explanation: `Col ${col}, row ${row}: "${val}" — added to rowSet. rowSet=${JSON.stringify([...seen])}.`,
          anchor: { match: 'rowSet.add(board[row][column])' },
          state: {
            type: 'grid',
            grid: cg,
            counters: [
              { label: 'check', value: `col ${col}, row ${row}` },
              { label: 'cell', value: val },
              { label: 'seen set', value: JSON.stringify([...seen]) },
            ],
          } as GridState,
        });
        g[row][col].state = 'visited' as GridCellState;
      }
    }
  }

  steps.push({
    explanation:
      'All 9 columns checked — no duplicate digits in any column. Phase 2 (column validation) passed. Moving on to Phase 3: 3x3 box checks.',
    anchor: { match: 'seenMap = defaultdict(set)' },
    state: {
      type: 'grid',
      grid: (() => {
        const g = makeBaseGrid();
        g.forEach((row) => row.forEach((c) => { if (c.state === 'land') c.state = 'visited' as GridCellState; }));
        return g;
      })(),
      counters: [
        { label: 'cols checked', value: '9 / 9' },
        { label: 'result', value: 'VALID' },
      ],
    } as GridState,
  });

  // ── Phase 3: 3x3 box checks ───────────────────────────────────────────────
  // Show boxes (0,0), (1,1), (2,2) — top-left, middle, bottom-right
  for (const [boxRow, boxCol] of [[0, 0], [1, 1], [2, 2]]) {
    const seen = new Set<string>();
    const boxGrid = makeBaseGrid();
    boxGrid.forEach((row) => row.forEach((c) => { if (c.state === 'land') c.state = 'visited' as GridCellState; }));

    // Highlight the 3x3 box
    for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
      for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
        const val = BOARD[r][c];
        if (val !== '.') {
          seen.add(val);
          boxGrid[r][c].state = 'queued' as GridCellState;
        }
      }
    }

    steps.push({
      explanation: `3x3 box check — box (${boxRow},${boxCol}) covers rows [${boxRow * 3}..${boxRow * 3 + 2}], cols [${boxCol * 3}..${boxCol * 3 + 2}]. Key is (row//3, col//3) = (${boxRow},${boxCol}). Digits in this box: ${JSON.stringify([...seen])}. No duplicates found.`,
      anchor: {
        match: 'elif board[row][column] in seenMap[(row//3), (column//3)]:',
        to: { match: 'seenMap[(row//3), (column//3)].add(board[row][column])' },
      },
      state: {
        type: 'grid',
        grid: boxGrid,
        counters: [
          { label: 'check', value: `box (${boxRow},${boxCol})` },
          { label: 'digits seen', value: JSON.stringify([...seen]) },
          { label: 'result', value: 'valid' },
        ],
      } as GridState,
    });
  }

  // Final result
  steps.push({
    explanation:
      'All three phases complete — rows, columns, and 3x3 boxes all contain no duplicates. The board is VALID. Return true. Time O(1) (fixed 9x9 board), Space O(1) (fixed-size sets).',
    anchor: { match: 'return True' },
    state: {
      type: 'grid',
      grid: (() => {
        const g = makeBaseGrid();
        g.forEach((row) => row.forEach((c) => { if (c.state === 'land') c.state = 'visited' as GridCellState; }));
        return g;
      })(),
      counters: [
        { label: 'rows', value: 'VALID' },
        { label: 'columns', value: 'VALID' },
        { label: 'boxes', value: 'VALID' },
        { label: 'result', value: 'true' },
      ],
    } as GridState,
  });

  return steps;
}

// ── Single-loop step generator ────────────────────────────────────────────────

function generateSingleLoopSteps(): Step[] {
  const steps: Step[] = [];

  steps.push({
    explanation:
      'Optimized single-pass approach: use 3 defaultdict(set) maps — rowMap[row], colMap[col], gridMap[(row//3, col//3)]. In one double for-loop, check all 3 constraints simultaneously for each filled cell — each check is its OWN separate if, not one condition chained by or. This avoids 3 separate passes.',
    anchor: { match: 'rows, cols = len(board), len(board[0])', to: { match: 'gridMap = collections.defaultdict(set)' } },
    state: {
      type: 'grid',
      grid: makeBaseGrid(),
      counters: [
        { label: 'rowMap', value: '{}' },
        { label: 'colMap', value: '{}' },
        { label: 'gridMap', value: '{}' },
      ],
    } as GridState,
  });

  const rowMap: Record<number, Set<string>> = {};
  const colMap: Record<number, Set<string>> = {};
  const gridMap: Record<string, Set<string>> = {};
  for (let i = 0; i < 9; i++) { rowMap[i] = new Set(); colMap[i] = new Set(); }
  for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) gridMap[`${br},${bc}`] = new Set();

  // Traverse the full 9x9 board, one cell per step — every iteration of the
  // double for-loop is shown. Filled cells from earlier in the scan are marked
  // visited so you can watch the single pass sweep across the grid.
  const visited: [number, number][] = [];
  let duplicate = false;

  for (let row = 0; row < 9 && !duplicate; row++) {
    for (let col = 0; col < 9 && !duplicate; col++) {
      const val = BOARD[row][col];
      const g = makeBaseGrid();
      for (const [vr, vc] of visited) {
        if (g[vr][vc].state === 'land') g[vr][vc].state = 'visited' as GridCellState;
      }
      g[row][col].state = 'queued' as GridCellState;

      if (val === '.') {
        steps.push({
          explanation: `Cell (row ${row}, col ${col}) = "." — an empty cell, the "continue" branch. Sudoku rules only constrain filled cells, so skip it and move on. All three maps unchanged.`,
          anchor: { match: "if board[row][col] == '.':", to: { match: 'continue' } },
          state: {
            type: 'grid',
            grid: g,
            counters: [
              { label: 'cell', value: `(${row},${col})` },
              { label: 'value', value: '.' },
              { label: 'action', value: 'skip (continue)' },
            ],
          } as GridState,
        });
      } else {
        const boxKey = `${Math.floor(row / 3)},${Math.floor(col / 3)}`;
        const dupInRow = rowMap[row].has(val);
        const dupInCol = colMap[col].has(val);
        const dupInBox = gridMap[boxKey].has(val);
        const isDup = dupInRow || dupInCol || dupInBox;

        if (isDup) {
          g[row][col].state = 'rotten' as GridCellState;
          const where = dupInRow ? `row ${row}` : dupInCol ? `column ${col}` : `box (${boxKey})`;
          steps.push({
            explanation: `Cell (${row}, ${col}) = "${val}": "${val}" is ALREADY in ${where}. That's a duplicate → whichever of the 3 separate ifs matches returns False immediately.`,
            // Whichever of the 3 separate if-checks fires; this fixed board never triggers this branch.
            // nth:3 (the gridMap check's return) covers the whole 3-check block as one range.
            anchor: { match: 'if board[row][col] in rowMap[row]:', to: { match: 'return False', nth: 3 } },
            state: {
              type: 'grid',
              grid: g,
              counters: [
                { label: 'cell', value: `(${row},${col}) = "${val}"` },
                { label: 'duplicate in', value: where },
                { label: 'result', value: 'false' },
              ],
            } as GridState,
          });
          duplicate = true;
        } else {
          rowMap[row].add(val);
          colMap[col].add(val);
          gridMap[boxKey].add(val);
          visited.push([row, col]);
          steps.push({
            explanation: `Cell (${row}, ${col}) = "${val}": check rowMap[${row}], colMap[${col}], and gridMap[(${boxKey})] as 3 separate ifs. "${val}" is in none of them — valid so far, so add it to all three. One pass enforces all three rules together.`,
            anchor: {
              match: 'rowMap[row].add(board[row][col])',
              to: { match: 'gridMap[(row//3, col//3)].add(board[row][col])' },
            },
            state: {
              type: 'grid',
              grid: g,
              counters: [
                { label: 'cell', value: `(${row},${col}) = "${val}"` },
                { label: `rowMap[${row}]`, value: JSON.stringify([...rowMap[row]]) },
                { label: `colMap[${col}]`, value: JSON.stringify([...colMap[col]]) },
                { label: `gridMap[(${boxKey})]`, value: JSON.stringify([...gridMap[boxKey]]) },
              ],
            } as GridState,
          });
        }
      }
    }
  }

  if (duplicate) return steps;

  steps.push({
    explanation:
      'Single-loop completes in O(1) time (fixed 9x9 board). Three maps track row, column, and 3x3 box constraints simultaneously. No duplicate found → return true. Space O(1) for 3 fixed-size maps.',
    anchor: { match: 'return True' },
    state: {
      type: 'grid',
      grid: (() => {
        const g = makeBaseGrid();
        g.forEach((row) => row.forEach((c) => { if (c.state === 'land') c.state = 'visited' as GridCellState; }));
        return g;
      })(),
      counters: [
        { label: 'result', value: 'true' },
        { label: 'time', value: 'O(1)' },
        { label: 'space', value: 'O(1)' },
      ],
    } as GridState,
  });

  return steps;
}

const multiPassSolution: SolutionVariant = {
  label: 'Multi-Pass (Row → Col → Box)',
  variant: 'multi-pass',
  generateSteps: generateMultiPassSteps,
};

const singleLoopSolution: SolutionVariant = {
  label: 'Single-Loop with 3 Maps',
  variant: 'single-loop',
  generateSteps: generateSingleLoopSteps,
};

export const validSudokuMeta: AlgorithmMeta = {
  id: 'valid-sudoku',
  lcNumber: 36,
  title: 'Valid Sudoku',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Hash Set', 'Matrix'],
  timeComplexity: 'O(1)',
  spaceComplexity: 'O(1)',
  description:
    'Determine if a 9x9 Sudoku board is valid. Each row, column, and 3x3 sub-box must contain the digits 1-9 without repetition. Only filled cells need to be validated.',
  examples: [
    {
      input:
        'board = [["5","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]',
      output: 'true',
    },
    {
      input:
        'board = [["8","3",".",".","7",".",".",".","."],["6",".",".","1","9","5",".",".","."],[".","9","8",".",".",".",".","6","."],["8",".",".",".","6",".",".",".","3"],["4",".",".","8",".","3",".",".","1"],["7",".",".",".","2",".",".",".","6"],[".","6",".",".",".",".","2","8","."],[".",".",".","4","1","9",".",".","5"],[".",".",".",".","8",".",".","7","9"]]',
      output: 'false',
      explanation: 'Two 8s in the top-left 3x3 box.',
    },
  ] as ProblemExample[],
  constraints: [
    'board.length == 9',
    'board[i].length == 9',
    'board[i][j] is a digit 1-9 or "."',
  ],
  hint: 'Use a set per row/col/box to track seen digits. The 3x3 box key is (row//3, col//3). Optimized: combine all three checks into a single double-loop using 3 defaultdict(set) maps.',
  solutions: [multiPassSolution, singleLoopSolution],
};
