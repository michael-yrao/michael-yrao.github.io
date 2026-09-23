import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's merge verbatim: nums1Ptr, nums2Ptr = m-1, n-1; iterator = m+n-1;
// a SINGLE `while nums2Ptr >= 0` loop (not "while both remain") — the loop only needs to
// exhaust nums2, because whatever's left at the front of nums1 is already sorted and never
// needs to move. Each iteration: if nums1Ptr>=0 AND nums1[nums1Ptr] > nums2[nums2Ptr], take
// from nums1; otherwise (nums1 exhausted OR nums2's tail wins) take from nums2. iterator
// always decrements, regardless of branch.

type CellVisualState = 'default' | 'active' | 'found' | 'min-ptr';

function generateSteps(): Step[] {
  const nums1Start = [1, 2, 3, 0, 0, 0];
  const nums2 = [2, 5, 6];
  const m = 3;
  const n = 3;
  const nums1 = [...nums1Start];
  const steps: Step[] = [];

  const snap = (nums1Ptr: number, iterator: number) =>
    nums1.map((v, idx) => ({
      value: v,
      state: (idx === iterator
        ? 'active'
        : idx === nums1Ptr && idx < m
        ? 'min-ptr'
        : idx > iterator
        ? 'found'
        : 'default') as CellVisualState,
    }));

  steps.push({
    explanation: `nums1=[${nums1.join(', ')}] holds m=${m} real values then spare zeros; nums2=[${nums2.join(', ')}] has n=${n} values. nums1Ptr, nums2Ptr = m-1, n-1 → ${m - 1}, ${n - 1}. iterator = m+n-1 = ${m + n - 1}. The loop below only runs while nums2Ptr >= 0 — once nums2 is used up, whatever's left at the front of nums1 is already sorted in place.`,
    anchor: { match: 'nums1Ptr, nums2Ptr = m - 1, n - 1', to: { match: 'iterator = m + n - 1' } },
    state: {
      type: 'array',
      cells: nums1.map((v, i) => ({ value: v, state: (i < m ? 'active' : 'default') as CellVisualState })),
      pointers: [{ index: m - 1, label: 'nums1Ptr' }],
      counters: [
        { label: 'nums2', value: `[${nums2.join(', ')}]` },
        { label: 'nums2Ptr', value: n - 1 },
      ],
    },
    variables: [
      { name: 'm', value: m },
      { name: 'n', value: n },
    ],
  });

  let nums1Ptr = m - 1;
  let nums2Ptr = n - 1;
  let iterator = m + n - 1;

  while (nums2Ptr >= 0) {
    const takeFromNums1 = nums1Ptr >= 0 && nums1[nums1Ptr] > nums2[nums2Ptr];

    if (takeFromNums1) {
      steps.push({
        explanation: `iterator=${iterator}: nums1Ptr=${nums1Ptr} ≥ 0 and nums1[nums1Ptr]=${nums1[nums1Ptr]} > nums2[nums2Ptr]=${nums2[nums2Ptr]} → nums1[iterator]=nums1[nums1Ptr]=${nums1[nums1Ptr]}. nums1Ptr-=1.`,
        anchor: { match: 'if nums1Ptr >= 0 and nums1[nums1Ptr] > nums2[nums2Ptr]:', to: { match: 'nums1Ptr-=1' } },
        state: {
          type: 'array',
          cells: snap(nums1Ptr, iterator),
          pointers: [{ index: iterator, label: 'iterator' }, { index: nums1Ptr, label: 'nums1Ptr' }],
          counters: [
            { label: 'nums2', value: `[${nums2.join(', ')}]` },
            { label: 'nums2Ptr', value: nums2Ptr },
          ],
        },
        variables: [
          { name: 'nums1Ptr', value: nums1Ptr },
          { name: 'nums2Ptr', value: nums2Ptr },
          { name: 'place', value: nums1[nums1Ptr], highlight: true },
        ],
      });
      nums1[iterator] = nums1[nums1Ptr];
      nums1Ptr -= 1;
    } else {
      const reason =
        nums1Ptr < 0
          ? `nums1Ptr=${nums1Ptr} < 0 (nums1 exhausted, short-circuits before indexing nums1)`
          : `nums1[nums1Ptr]=${nums1[nums1Ptr]} ≤ nums2[nums2Ptr]=${nums2[nums2Ptr]}`;
      steps.push({
        explanation: `iterator=${iterator}: ${reason} → falls to else. nums1[iterator]=nums2[nums2Ptr]=${nums2[nums2Ptr]}. nums2Ptr-=1.`,
        anchor: { match: 'else:', to: { match: 'nums2Ptr-=1' } },
        state: {
          type: 'array',
          cells: snap(nums1Ptr, iterator),
          pointers: [{ index: iterator, label: 'iterator' }, ...(nums1Ptr >= 0 ? [{ index: nums1Ptr, label: 'nums1Ptr' }] : [])],
          counters: [
            { label: 'nums2', value: `[${nums2.join(', ')}]` },
            { label: 'nums2Ptr', value: nums2Ptr },
          ],
        },
        variables: [
          { name: 'nums1Ptr', value: nums1Ptr },
          { name: 'nums2Ptr', value: nums2Ptr },
          { name: 'place', value: nums2[nums2Ptr], highlight: true },
        ],
      });
      nums1[iterator] = nums2[nums2Ptr];
      nums2Ptr -= 1;
    }

    steps.push({
      explanation: `iterator-=1 → ${iterator - 1}.`,
      anchor: { match: 'iterator-=1' },
      state: {
        type: 'array',
        cells: snap(nums1Ptr, iterator - 1),
        pointers: [{ index: iterator - 1, label: 'iterator' }],
        counters: [{ label: 'nums2Ptr', value: nums2Ptr }],
      },
      variables: [{ name: 'iterator', value: iterator - 1, highlight: true }],
    });
    iterator -= 1;
  }

  steps.push({
    explanation: `nums2Ptr=${nums2Ptr} < 0 → loop ends. nums1[0..${nums1Ptr}] were never touched — already sorted and correctly placed. Result: [${nums1.join(', ')}]. O(m+n) time, O(1) space.`,
    anchor: { match: 'while nums2Ptr >= 0:' },
    state: {
      type: 'array',
      cells: nums1.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [{ label: 'nums2', value: 'exhausted' }],
    },
    variables: [{ name: 'result', value: `[${nums1.join(', ')}]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Merge from Back',
  variant: 'merge-from-back',
  generateSteps,
};

export const mergeSortedArrayMeta: AlgorithmMeta = {
  id: 'merge-sorted-array',
  lcNumber: 88,
  title: 'Merge Sorted Array',
  difficulty: 'Easy',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers', 'Sorting'],
  timeComplexity: 'O(m+n)',
  spaceComplexity: 'O(1)',
  description:
    'You are given two integer arrays nums1 and nums2, sorted in non-decreasing order, and two integers m and n. Merge nums2 into nums1 as one sorted array in-place. nums1 has length m+n with the last n elements set to 0.',
  examples: [
    {
      input: 'nums1 = [1,2,3,0,0,0], m = 3, nums2 = [2,5,6], n = 3',
      output: '[1,2,2,3,5,6]',
      explanation: 'Arrays [1,2,3] and [2,5,6] merge to [1,2,2,3,5,6].',
    },
    {
      input: 'nums1 = [1], m = 1, nums2 = [], n = 0',
      output: '[1]',
    },
  ] as ProblemExample[],
  constraints: [
    'nums1.length == m + n',
    'nums2.length == n',
    '0 ≤ m, n ≤ 200',
    '-10⁹ ≤ nums1[i], nums2[j] ≤ 10⁹',
  ],
  hint: 'Fill nums1 from the back. Keep nums1Ptr at the end of nums1\'s real values and nums2Ptr at the end of nums2. Loop only while nums2Ptr >= 0 — place the larger of nums1[nums1Ptr] and nums2[nums2Ptr] (guarding nums1Ptr < 0), decrement the pointer you took from, and always decrement iterator. Whatever is left at the front of nums1 when nums2 runs out is already sorted.',
  solutions: [solution],
};
