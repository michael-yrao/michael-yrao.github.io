import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def searchMatrix(self, matrix: List[List[int]], target: int) -> bool:
        # we can actually just do this one dimension at a time
        # if we go down the matrix
        # we can easily tell which row should be at
        # then we do the same thing in the row
        # so binary search the column, then binary search the row
        # matrix[i][0] gets us the first element of each row
        # we want to find i where matrix[i][0] < target and matrix[i+1][0] > target
        # after which, we just want to do a normal binary search on the row

        rowCount = len(matrix)
        l, r = 0, rowCount - 1

        # we are doing a range, so not exactly sure what we are looking for
        # thus we will use l < r
        while l < r:
            # since we are looking for the maximum row, we want to bias towards right
            mid = (l + r + 1) // 2
            if matrix[mid][0] > target:
                r = mid - 1
            else:
                l = mid

        # now we have l at the row we need

        resultRow = l

        columnCount = len(matrix[0])

        l, r = 0, columnCount - 1

        while l <= r:
            mid = (l + r) // 2
            if matrix[resultRow][mid] == target:
                return True
            if matrix[resultRow][mid] > target:
                r = mid - 1
            else:
                l = mid + 1
        return False`;

function generateSteps(): Step[] {
  const matrix = [
    [1, 3, 5, 7],
    [10, 11, 16, 20],
    [23, 30, 34, 60],
  ];
  const target = 3;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const flat = matrix.flat(); // length = rows * cols = 12
  const steps: Step[] = [];

  // Helper: state for each flat cell given a window [lo, hi] and active mid and found index
  const snap = (lo: number, hi: number, mid: number | null, foundIdx: number | null) =>
    flat.map((v, i) => ({
      value: v,
      state:
        foundIdx !== null
          ? i === foundIdx
            ? ('found' as const)
            : ('eliminated' as const)
          : i === mid
          ? ('active' as const)
          : i >= lo && i <= hi
          ? ('window' as const)
          : ('eliminated' as const),
    }));

  const flatLabel = (flatIdx: number) => {
    const row = Math.floor(flatIdx / cols);
    const col = flatIdx % cols;
    return `[${row}][${col}]`;
  };

  steps.push({
    explanation:
      'Search a 2D matrix [[1,3,5,7],[10,11,16,20],[23,30,34,60]] for target=3. The matrix is fully sorted (each row sorted, first element of each row > last of previous), so we can treat it as one flat sorted array of length m*n and run a single binary search.',
    highlightLine: 10,
    state: {
      type: 'array',
      cells: flat.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [
      { name: 'target', value: target },
      { name: 'rows × cols', value: `${rows} × ${cols} = ${rows * cols}` },
    ],
  });

  // ── Phase 1: find the correct row ─────────────────────────────────────────
  steps.push({
    explanation:
      'Phase 1 — find the correct row. Binary search on row indices (0..2). We want the largest row whose first element ≤ target. Use the right-biased mid = (l+r+1)//2 to avoid infinite loop when l+1 == r.',
    highlightLine: 12,
    state: {
      type: 'array',
      cells: flat.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'rowCount', value: rows }],
  });

  let lRow = 0;
  let rRow = rows - 1;

  steps.push({
    explanation: `Row search: l=${lRow}, r=${rRow}.`,
    highlightLine: 12,
    state: {
      type: 'array',
      cells: flat.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'l (row)', value: lRow }, { name: 'r (row)', value: rRow }],
  });

  while (lRow < rRow) {
    const midRow = Math.floor((lRow + rRow + 1) / 2);
    const firstOfMid = matrix[midRow][0];
    const goLeft = firstOfMid > target;

    steps.push({
      explanation: `Row search: l=${lRow}, r=${rRow}, mid=${midRow}. matrix[${midRow}][0]=${firstOfMid} ${goLeft ? '>' : '≤'} target=${target}. ${goLeft ? `First element of row ${midRow} exceeds target → search upper rows → r = ${midRow - 1}.` : `Row ${midRow} could contain target → keep mid as candidate → l = ${midRow}.`}`,
      highlightLine: goLeft ? 17 : 19,
      state: {
        type: 'array',
        cells: flat.map(v => ({ value: v, state: 'default' as const })),
        pointers: [],
      },
      variables: [
        { name: 'midRow', value: midRow },
        { name: 'matrix[mid][0]', value: firstOfMid },
        { name: goLeft ? 'r →' : 'l →', value: goLeft ? midRow - 1 : midRow, highlight: true },
      ],
    });

    if (goLeft) rRow = midRow - 1;
    else lRow = midRow;
  }

  const resultRow = lRow;

  steps.push({
    explanation: `Row search converged: resultRow=${resultRow}. Row ${resultRow} is [${matrix[resultRow].join(',')}]. Now binary search within this row.`,
    highlightLine: 20,
    state: {
      type: 'array',
      cells: flat.map((v, i) => ({
        value: v,
        state:
          Math.floor(i / cols) === resultRow
            ? ('window' as const)
            : ('eliminated' as const),
      })),
      pointers: [],
    },
    variables: [
      { name: 'resultRow', value: resultRow, highlight: true },
      { name: 'row values', value: `[${matrix[resultRow].join(',')}]` },
    ],
  });

  // ── Phase 2: binary search within the row ────────────────────────────────
  let lCol = 0;
  let rCol = cols - 1;
  let foundFlatIdx: number | null = null;

  steps.push({
    explanation: `Phase 2 — binary search within row ${resultRow}. l=${lCol}, r=${rCol}.`,
    highlightLine: 23,
    state: {
      type: 'array',
      cells: flat.map((v, i) => ({
        value: v,
        state:
          Math.floor(i / cols) === resultRow && i % cols >= lCol && i % cols <= rCol
            ? ('window' as const)
            : ('eliminated' as const),
      })),
      pointers: [
        { index: resultRow * cols + lCol, label: 'l' },
        { index: resultRow * cols + rCol, label: 'r' },
      ],
    },
    variables: [{ name: 'l (col)', value: lCol }, { name: 'r (col)', value: rCol }],
  });

  while (lCol <= rCol) {
    const midCol = Math.floor((lCol + rCol) / 2);
    const midFlatIdx = resultRow * cols + midCol;
    const midVal = matrix[resultRow][midCol];

    if (midVal === target) {
      foundFlatIdx = midFlatIdx;
      steps.push({
        explanation: `l=${lCol}, r=${rCol}, mid=${midCol}: matrix[${resultRow}][${midCol}]=${midVal} === target=${target}! Found at flat index ${midFlatIdx} (${flatLabel(midFlatIdx)}).`,
        highlightLine: 35,
        state: {
          type: 'array',
          cells: snap(resultRow * cols + lCol, resultRow * cols + rCol, midFlatIdx, foundFlatIdx),
          pointers: [{ index: midFlatIdx, label: 'found' }],
        },
        variables: [
          { name: 'mid (col)', value: midCol },
          { name: 'matrix[row][mid]', value: midVal, highlight: true },
          { name: 'return', value: 'true', highlight: true },
        ],
      });
      break;
    }

    const goRight = midVal < target;

    steps.push({
      explanation: `l=${lCol}, r=${rCol}, mid=${midCol}: matrix[${resultRow}][${midCol}]=${midVal} ${goRight ? '<' : '>'} target=${target}. ${goRight ? `Target is right → l = ${midCol + 1}.` : `Target is left → r = ${midCol - 1}.`}`,
      highlightLine: goRight ? 30 : 28,
      state: {
        type: 'array',
        cells: snap(
          resultRow * cols + lCol,
          resultRow * cols + rCol,
          midFlatIdx,
          null
        ),
        pointers: [
          { index: resultRow * cols + lCol, label: 'l' },
          { index: midFlatIdx, label: 'mid' },
          { index: resultRow * cols + rCol, label: 'r' },
        ],
      },
      variables: [
        { name: 'mid (col)', value: midCol },
        { name: 'matrix[row][mid]', value: midVal },
        { name: goRight ? 'l →' : 'r →', value: goRight ? midCol + 1 : midCol - 1, highlight: true },
      ],
    });

    if (goRight) lCol = midCol + 1;
    else rCol = midCol - 1;
  }

  if (foundFlatIdx === null) {
    steps.push({
      explanation: `l > r: search exhausted. target=${target} not found → return false.`,
      highlightLine: 31,
      state: {
        type: 'array',
        cells: flat.map(v => ({ value: v, state: 'eliminated' as const })),
        pointers: [],
      },
      variables: [{ name: 'return', value: 'false', highlight: true }],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two-Phase Binary Search',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const searchA2DMatrixMeta: AlgorithmMeta = {
  id: 'search-a-2d-matrix',
  lcNumber: 74,
  title: 'Search a 2D Matrix',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Array', 'Binary Search', 'Matrix'],
  timeComplexity: 'O(log(m·n))',
  spaceComplexity: 'O(1)',
  description:
    'You are given an m × n integer matrix where each row is sorted in non-decreasing order and the first integer of each row is greater than the last integer of the previous row. Given an integer target, return true if target is in the matrix or false otherwise. You must write a solution in O(log(m * n)) time complexity.',
  examples: [
    {
      input: 'matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 3',
      output: 'true',
    },
    {
      input: 'matrix = [[1,3,5,7],[10,11,16,20],[23,30,34,60]], target = 13',
      output: 'false',
    },
  ] as ProblemExample[],
  constraints: [
    'm == matrix.length',
    'n == matrix[i].length',
    '1 ≤ m, n ≤ 100',
    '-10⁴ ≤ matrix[i][j], target ≤ 10⁴',
  ],
  hint: 'Because rows are sorted and each row\'s first element exceeds the previous row\'s last, the entire matrix is one flat sorted sequence. Phase 1: binary search on row indices (right-biased mid) to find the last row whose first element ≤ target. Phase 2: binary search within that row for the exact target. Total: O(log m + log n) = O(log(m·n)).',
  solutions: [solution],
};
