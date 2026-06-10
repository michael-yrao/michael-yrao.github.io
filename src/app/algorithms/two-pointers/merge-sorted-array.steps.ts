import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def merge(self, nums1: List[int], m: int, nums2: List[int], n: int) -> None:
        a, b = m - 1, n - 1
        for i in range(m + n - 1, -1, -1):
            if a >= 0 and b >= 0:
                if nums1[a] > nums2[b]:
                    nums1[i] = nums1[a]
                    a -= 1
                else:
                    nums1[i] = nums2[b]
                    b -= 1
            elif a >= 0:
                nums1[i] = nums1[a]
                a -= 1
            elif b >= 0:
                nums1[i] = nums2[b]
                b -= 1`;

function generateSteps(): Step[] {
  const nums1 = [1, 2, 3, 0, 0, 0];
  const nums2 = [2, 5, 6];
  const m = 3;
  const n = 3;
  const steps: Step[] = [];

  const snap = (a: number, b: number, i: number) =>
    nums1.map((v, idx) => ({
      value: v,
      state:
        idx === i
          ? ('active' as const)
          : idx < m && idx === a
          ? ('min-ptr' as const)
          : idx >= m && idx < i
          ? ('found' as const)
          : idx < m && idx > a
          ? ('found' as const)
          : idx >= m && v === 0 && idx > i
          ? ('default' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation:
      'nums1 has m=3 real values followed by n=3 zeros (spare space). nums2 has n=3 values. Key insight: fill nums1 from the back — compare from the largest end of each array into the empty tail. This avoids overwriting unprocessed elements.',
    highlightLine: 2,
    state: {
      type: 'array',
      cells: nums1.map((v, i) => ({
        value: v,
        state: i < m ? ('active' as const) : ('default' as const),
      })),
      pointers: [{ index: m - 1, label: 'a' }],
      counters: [
        { label: 'nums2', value: `[${nums2.join(', ')}]` },
        { label: 'b → nums2[b]', value: `${n - 1} → ${nums2[n - 1]}` },
      ],
    },
    variables: [
      { name: 'm', value: m },
      { name: 'n', value: n },
    ],
  });

  let a = m - 1;
  let b = n - 1;

  for (let i = m + n - 1; i >= 0; i--) {
    let placed: number;
    let fromNums2 = false;

    if (a >= 0 && b >= 0) {
      if (nums1[a] > nums2[b]) {
        placed = nums1[a];
        steps.push({
          explanation: `i=${i}: nums1[a=${a}]=${nums1[a]} > nums2[b=${b}]=${nums2[b]} → place ${nums1[a]} at i=${i}. Decrement a.`,
          highlightLine: 6,
          state: {
            type: 'array',
            cells: snap(a, b, i),
            pointers: [{ index: i, label: 'i' }, { index: a, label: 'a' }],
            counters: [
              { label: 'nums2', value: `[${nums2.join(', ')}]` },
              { label: `b=${b}`, value: `nums2[${b}]=${nums2[b]}` },
            ],
          },
          variables: [
            { name: 'place', value: nums1[a], highlight: true },
            { name: 'from', value: 'nums1' },
          ],
        });
        nums1[i] = nums1[a];
        a--;
      } else {
        placed = nums2[b];
        fromNums2 = true;
        steps.push({
          explanation: `i=${i}: nums2[b=${b}]=${nums2[b]} ≥ nums1[a=${a}]=${nums1[a]} → place ${nums2[b]} at i=${i}. Decrement b.`,
          highlightLine: 9,
          state: {
            type: 'array',
            cells: snap(a, b, i),
            pointers: [{ index: i, label: 'i' }, { index: a, label: 'a' }],
            counters: [
              { label: 'nums2', value: `[${nums2.join(', ')}]` },
              { label: `b=${b}`, value: `nums2[${b}]=${nums2[b]}` },
            ],
          },
          variables: [
            { name: 'place', value: nums2[b], highlight: true },
            { name: 'from', value: 'nums2' },
          ],
        });
        nums1[i] = nums2[b];
        b--;
      }
    } else if (a >= 0) {
      steps.push({
        explanation: `i=${i}: nums2 exhausted (b<0). Copy nums1[a=${a}]=${nums1[a]} to i=${i}.`,
        highlightLine: 11,
        state: {
          type: 'array',
          cells: snap(a, b, i),
          pointers: [{ index: i, label: 'i' }, { index: a, label: 'a' }],
          counters: [{ label: 'nums2', value: 'exhausted' }],
        },
        variables: [{ name: 'place', value: nums1[a], highlight: true }],
      });
      nums1[i] = nums1[a];
      a--;
    } else if (b >= 0) {
      steps.push({
        explanation: `i=${i}: nums1 exhausted (a<0). Copy nums2[b=${b}]=${nums2[b]} to i=${i}.`,
        highlightLine: 13,
        state: {
          type: 'array',
          cells: snap(a, b, i),
          pointers: [{ index: i, label: 'i' }],
          counters: [
            { label: 'nums2', value: `[${nums2.join(', ')}]` },
            { label: `b=${b}`, value: `nums2[${b}]=${nums2[b]}` },
          ],
        },
        variables: [{ name: 'place', value: nums2[b], highlight: true }],
      });
      nums1[i] = nums2[b];
      b--;
    }
  }

  steps.push({
    explanation: `Merged in-place: [${nums1.join(', ')}]. O(m+n) time, O(1) space — filling backwards avoids any element being overwritten before it's read.`,
    highlightLine: 15,
    state: {
      type: 'array',
      cells: nums1.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [{ label: 'nums2', value: 'exhausted' }],
    },
    variables: [{ name: 'result', value: `[${nums1.join(', ')}]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Merge from Back',
  pythonCode: PYTHON_CODE,
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
  hint: 'Fill nums1 from the back (index m+n−1 down to 0). Keep pointer a at the end of nums1\'s real values and b at the end of nums2. Place the larger of the two and decrement the corresponding pointer. When one array is exhausted, copy the rest of the other.',
  solutions: [solution],
};
