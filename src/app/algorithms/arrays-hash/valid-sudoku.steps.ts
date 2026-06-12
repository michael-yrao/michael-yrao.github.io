import { AlgorithmMeta, SolutionVariant, Step, GridState, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Multi-pass (row, col, box) ────────────────────────────────────

const MULTI_PASS_CODE = `from collections import defaultdict
from typing import List

class Solution:
    def isValidSudoku(self, board: List[List[str]]) -> bool:
        # 3 validations
        # 1. check row
        # 2. check column
        # 3. check 3x3
        # #1 and #2 can be solved by a set + double for loop
        # #3 we need to use (i/3, j/3) as key and a set as value where we then do a double for loop

        for row in range(9):
            columnSet = set()
            for column in range(9):
                if board[row][column] == '.':
                    # wildcard, skip
                    continue
                elif board[row][column] in columnSet:
                    return False
                else:
                    columnSet.add(board[row][column])

        for column in range(9):
            rowSet = set()
            for row in range(9):
                if board[row][column] == '.':
                    # wildcard, skip
                    continue
                elif board[row][column] in rowSet:
                    return False
                else:
                    rowSet.add(board[row][column])

        seenMap = defaultdict(set)

        for row in range(9):
            for column in range(9):
                if board[row][column] == '.':
                    # wildcard, skip
                    continue
                elif board[row][column] in seenMap[(row//3), (column//3)]:
                    return False
                else:
                    seenMap[(row//3), (column//3)].add(board[row][column])

        return True`;

// ── Solution 2: Single-loop ────────────────────────────────────────────────────

const SINGLE_LOOP_CODE = `from collections import defaultdict
from typing import List

class Solution:
    def isValidSudokuSingleLoop(self, board: List[List[str]]) -> bool:
        # Can do this in single loop by using 3 maps
        # each map keeping track of one criteria we are checking for
        rowMap = defaultdict(set)
        columnMap = defaultdict(set)
        squareMap = defaultdict(set)
        for row in range(9):
            for column in range(9):
                if board[row][column] == '.':
                    # wildcard, skip
                    continue
                if ( board[row][column] in rowMap[row]
                    or board[row][column] in columnMap[column]
                    or board[row][column] in squareMap[(row//3),(column//3)]
                    ):
                    return False
                else:
                    rowMap[row].add(board[row][column])
                    columnMap[column].add(board[row][column])
                    squareMap[(row//3),(column//3)].add(board[row][column])
        return True`;

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
    highlightLine: 5,
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
      explanation: `Row check — scanning row ${row}. Using a set to detect duplicate digits. Empty cells "." are skipped (wildcard). If we see the same digit twice in this row, the board is invalid.`,
      highlightLine: 14,
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
          highlightLine: 17,
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
          highlightLine: 19,
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
          highlightLine: 21,
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
    highlightLine: 23,
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
      explanation: `Column check — scanning column ${col}. A fresh set tracks digits seen so far in this column. Duplicates → return false.`,
      highlightLine: 26,
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
          explanation: `Col ${col}, row ${row}: "${val}" — added to seen. seen=${JSON.stringify([...seen])}.`,
          highlightLine: val === '.' ? 28 : 33,
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
    highlightLine: 35,
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
      highlightLine: 41,
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
    highlightLine: 44,
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
      'Optimized single-pass approach: use 3 defaultdict(set) maps — rowMap[row], columnMap[col], squareMap[(row//3, col//3)]. In one double for-loop, check all 3 constraints simultaneously for each filled cell. This avoids 3 separate passes.',
    highlightLine: 5,
    state: {
      type: 'grid',
      grid: makeBaseGrid(),
      counters: [
        { label: 'rowMap', value: '{}' },
        { label: 'columnMap', value: '{}' },
        { label: 'squareMap', value: '{}' },
      ],
    } as GridState,
  });

  const rowMap: Record<number, Set<string>> = {};
  const columnMap: Record<number, Set<string>> = {};
  const squareMap: Record<string, Set<string>> = {};
  for (let i = 0; i < 9; i++) { rowMap[i] = new Set(); columnMap[i] = new Set(); }
  for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) squareMap[`${br},${bc}`] = new Set();

  // Only show first 3 filled cells + 1 dot cell to keep steps manageable
  const toShow: [number, number][] = [[0, 0], [0, 1], [0, 2], [1, 0]];

  for (const [row, col] of toShow) {
    const val = BOARD[row][col];
    const g = makeBaseGrid();
    g[row][col].state = 'queued' as GridCellState;

    if (val === '.') {
      steps.push({
        explanation: `Row ${row}, col ${col}: "." — wildcard, skip. All three maps unchanged.`,
        highlightLine: 13,
        state: {
          type: 'grid',
          grid: g,
          counters: [
            { label: 'cell', value: `(${row},${col})` },
            { label: 'value', value: '.' },
            { label: 'action', value: 'skip' },
          ],
        } as GridState,
      });
    } else {
      const boxKey = `${Math.floor(row / 3)},${Math.floor(col / 3)}`;
      rowMap[row].add(val);
      columnMap[col].add(val);
      squareMap[boxKey].add(val);

      steps.push({
        explanation: `Row ${row}, col ${col}: "${val}" — check rowMap[${row}], columnMap[${col}], squareMap[(${boxKey})]. Not found in any — add to all three maps. This single pass catches all three types of duplicates.`,
        highlightLine: 17,
        state: {
          type: 'grid',
          grid: g,
          counters: [
            { label: 'cell', value: `(${row},${col}) = "${val}"` },
            { label: `rowMap[${row}]`, value: JSON.stringify([...rowMap[row]]) },
            { label: `colMap[${col}]`, value: JSON.stringify([...columnMap[col]]) },
            { label: `boxMap[(${boxKey})]`, value: JSON.stringify([...squareMap[boxKey]]) },
          ],
        } as GridState,
      });
    }
  }

  steps.push({
    explanation:
      'Single-loop completes in O(1) time (fixed 9x9 board). Three maps track row, column, and 3x3 box constraints simultaneously. No duplicate found → return true. Space O(1) for 3 fixed-size maps.',
    highlightLine: 21,
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
  pythonCode: MULTI_PASS_CODE,
  generateSteps: generateMultiPassSteps,
};

const singleLoopSolution: SolutionVariant = {
  label: 'Single-Loop with 3 Maps',
  pythonCode: SINGLE_LOOP_CODE,
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
