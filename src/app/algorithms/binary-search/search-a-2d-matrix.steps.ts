import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's searchMatrix_20260826 verbatim: Phase 1 finds the row via a
// right-biased binary search (l, r, m reused — not renamed per phase): `while l < r`, m = (l+r+1)//2,
// matrix[m][0] > target → r = m-1, else l = m. Then rowNumber = l. Phase 2 re-declares l, r for
// the row and runs a standard binary search: equal → return True; elif matrix[rowNumber][m] <
// target → l = m+1; else → r = m-1.

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
      'Search a 2D matrix [[1,3,5,7],[10,11,16,20],[23,30,34,60]] for target=3. Phase 1 finds the row that could hold target (comparing only matrix[m][0], the first element of each row); Phase 2 binary-searches within that row.',
    anchor: { match: 'l, r = 0, len(matrix) - 1', to: { match: 'while l < r:' } },
    state: {
      type: 'array',
      cells: flat.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [
      { name: 'target', value: target },
      { name: 'l', value: 0 },
      { name: 'r', value: rows - 1 },
    ],
  });

  let l = 0;
  let r = rows - 1;

  while (l < r) {
    const m = Math.floor((l + r + 1) / 2);
    const firstOfM = matrix[m][0];
    const goLeft = firstOfM > target;

    if (goLeft) {
      steps.push({
        explanation: `while l < r (${l}<${r}): m = (l+r+1)//2 = ${m}. matrix[m][0]=${firstOfM} > target=${target} → r = m-1 = ${m - 1}.`,
        // nth 1: row-phase's own 'r = m - 1'; hit 2 is col-phase's 'r = m - 1' further down.
        anchor: { match: 'if matrix[m][0] > target:', to: { match: 'r = m - 1', nth: 1 } },
        state: { type: 'array', cells: flat.map((v) => ({ value: v, state: 'default' as const })), pointers: [] },
        variables: [
          { name: 'm', value: m },
          { name: 'matrix[m][0]', value: firstOfM },
          { name: 'r', value: m - 1, highlight: true },
        ],
      });
      r = m - 1;
    } else {
      steps.push({
        explanation: `while l < r (${l}<${r}): m = (l+r+1)//2 = ${m}. matrix[m][0]=${firstOfM} ≤ target=${target} → the if doesn't fire, else: l = m = ${m}.`,
        // Skips nth=1's 'l = m' — no, this IS nth=1 (row phase). Note 'l = m' is a substring of
        // the col-phase's 'l = m + 1' too, so nth pins this to the row-phase occurrence.
        anchor: { match: 'else:', nth: 1, to: { match: 'l = m', nth: 1 } },
        state: { type: 'array', cells: flat.map((v) => ({ value: v, state: 'default' as const })), pointers: [] },
        variables: [
          { name: 'm', value: m },
          { name: 'matrix[m][0]', value: firstOfM },
          { name: 'l', value: m, highlight: true },
        ],
      });
      l = m;
    }
  }

  const rowNumber = l;

  steps.push({
    explanation: `Row search converged: rowNumber = l = ${rowNumber}. Row ${rowNumber} is [${matrix[rowNumber].join(',')}]. Now binary search within this row.`,
    anchor: { match: 'rowNumber = l' },
    state: {
      type: 'array',
      cells: flat.map((v, i) => ({
        value: v,
        state: Math.floor(i / cols) === rowNumber ? ('window' as const) : ('eliminated' as const),
      })),
      pointers: [],
    },
    variables: [
      { name: 'rowNumber', value: rowNumber, highlight: true },
      { name: 'row values', value: `[${matrix[rowNumber].join(',')}]` },
    ],
  });

  // Phase 2 re-declares l, r for the row.
  l = 0;
  r = matrix[rowNumber].length - 1;
  let foundFlatIdx: number | null = null;

  steps.push({
    explanation: `l, r = 0, len(matrix[rowNumber])-1 → l=${l}, r=${r}.`,
    anchor: { match: 'l, r = 0, len(matrix[rowNumber]) - 1', to: { match: 'while l <= r:' } },
    state: {
      type: 'array',
      cells: flat.map((v, i) => ({
        value: v,
        state: Math.floor(i / cols) === rowNumber && i % cols >= l && i % cols <= r ? ('window' as const) : ('eliminated' as const),
      })),
      pointers: [
        { index: rowNumber * cols + l, label: 'l' },
        { index: rowNumber * cols + r, label: 'r' },
      ],
    },
    variables: [{ name: 'l', value: l }, { name: 'r', value: r }],
  });

  while (l <= r) {
    const m = Math.floor((l + r) / 2);
    const flatIdx = rowNumber * cols + m;
    const midVal = matrix[rowNumber][m];

    if (midVal === target) {
      foundFlatIdx = flatIdx;
      steps.push({
        explanation: `while l <= r (${l}<=${r}): m=${m}. matrix[rowNumber][m]=${midVal} == target=${target} → return True. Found at ${flatLabel(flatIdx)}.`,
        anchor: { match: 'if matrix[rowNumber][m] == target:', to: { match: 'return True' } },
        state: {
          type: 'array',
          cells: snap(rowNumber * cols + l, rowNumber * cols + r, flatIdx, foundFlatIdx),
          pointers: [{ index: flatIdx, label: 'found' }],
        },
        variables: [
          { name: 'm', value: m },
          { name: 'matrix[rowNumber][m]', value: midVal, highlight: true },
          { name: 'return', value: 'True', highlight: true },
        ],
      });
      break;
    }

    const goRight = midVal < target;

    if (goRight) {
      steps.push({
        explanation: `while l <= r (${l}<=${r}): m=${m}. matrix[rowNumber][m]=${midVal} < target=${target} → elif fires: l = m+1 = ${m + 1}.`,
        anchor: { match: 'elif matrix[rowNumber][m] < target:', to: { match: 'l = m + 1' } },
        state: {
          type: 'array',
          cells: snap(rowNumber * cols + l, rowNumber * cols + r, flatIdx, null),
          pointers: [
            { index: rowNumber * cols + l, label: 'l' },
            { index: flatIdx, label: 'm' },
            { index: rowNumber * cols + r, label: 'r' },
          ],
        },
        variables: [
          { name: 'm', value: m },
          { name: 'matrix[rowNumber][m]', value: midVal },
          { name: 'l', value: m + 1, highlight: true },
        ],
      });
      l = m + 1;
    } else {
      steps.push({
        explanation: `while l <= r (${l}<=${r}): m=${m}. matrix[rowNumber][m]=${midVal} ≥ target=${target}, not <, not == → else: r = m-1 = ${m - 1}.`,
        // nth 2/2: hit 1 of each is row-phase's own 'else:'/'r = m - 1' above; this is col-phase's.
        anchor: { match: 'else:', nth: 2, to: { match: 'r = m - 1', nth: 2 } },
        state: {
          type: 'array',
          cells: snap(rowNumber * cols + l, rowNumber * cols + r, flatIdx, null),
          pointers: [
            { index: rowNumber * cols + l, label: 'l' },
            { index: flatIdx, label: 'm' },
            { index: rowNumber * cols + r, label: 'r' },
          ],
        },
        variables: [
          { name: 'm', value: m },
          { name: 'matrix[rowNumber][m]', value: midVal },
          { name: 'r', value: m - 1, highlight: true },
        ],
      });
      r = m - 1;
    }
  }

  if (foundFlatIdx === null) {
    steps.push({
      explanation: `l > r: search exhausted. target=${target} not found → return False.`,
      anchor: { match: 'return False' },
      state: {
        type: 'array',
        cells: flat.map((v) => ({ value: v, state: 'eliminated' as const })),
        pointers: [],
      },
      variables: [{ name: 'return', value: 'False', highlight: true }],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two-Phase Binary Search',
  variant: 'two-phase',
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
