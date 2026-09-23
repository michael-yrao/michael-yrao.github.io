import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's threeSumSet verbatim: `nums.sort()`, then `solutionSet = set()`,
// then `for i in range(len(nums))` — the FULL range, no early stop and no duplicate-i skip.
// Duplicate triplets collapse because solutionSet is a Python set — solutionSet.add() on an
// already-present triplet is a silent no-op, not a guarded branch.

type CellVisualState = 'default' | 'active' | 'visited' | 'found' | 'min-ptr';

function generateSteps(): Step[] {
  const original = [-1, 0, 1, 2, -1, -4];
  const nums = [...original].sort((a, b) => a - b); // [-4,-1,-1,0,1,2]
  const n = nums.length;
  const steps: Step[] = [];
  const solutionSet = new Set<string>();

  const snap = (iIdx: number, jIdx: number, kIdx: number) =>
    nums.map((v, idx) => ({
      value: v,
      state: (idx === iIdx
        ? 'found'
        : idx === jIdx
        ? 'active'
        : idx === kIdx
        ? 'min-ptr'
        : idx < iIdx
        ? 'visited'
        : 'default') as CellVisualState,
    }));

  const setLabel = (): string => `{${[...solutionSet].join(', ')}}`;

  steps.push({
    explanation: `nums.sort(): [${original.join(', ')}] → [${nums.join(', ')}]. solutionSet = set() — a Python set, so duplicate triplets collapse on their own; there's no explicit duplicate-skip check anywhere in this attempt.`,
    anchor: { match: 'nums.sort()', to: { match: 'solutionSet = set()' } },
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [
      { name: 'nums', value: `[${nums.join(', ')}]` },
      { name: 'solutionSet', value: 'set()' },
    ],
  });

  for (let i = 0; i < n; i++) {
    const j0 = i + 1;
    const k0 = n - 1;
    let j = j0;
    let k = k0;

    steps.push({
      explanation: `for i in range(len(nums)): i=${i}, nums[i]=${nums[i]}. j, k = i+1, len(nums)-1 → j=${j}, k=${k}.`,
      anchor: { match: 'for i in range(len(nums)):', to: { match: 'j, k = i+1, len(nums) - 1' } },
      state: {
        type: 'array',
        cells: snap(i, j, k),
        pointers: [
          { index: i, label: 'i' },
          { index: j, label: 'j' },
          { index: k, label: 'k' },
        ],
        counters: solutionSet.size ? [{ label: 'solutionSet', value: setLabel() }] : [],
      },
      variables: [
        { name: 'i', value: i },
        { name: 'j', value: j },
        { name: 'k', value: k },
      ],
    });

    while (j < k) {
      const total = nums[i] + nums[j] + nums[k];

      if (total === 0) {
        const triplet = `(${nums[i]}, ${nums[j]}, ${nums[k]})`;
        const isNew = !solutionSet.has(triplet);
        solutionSet.add(triplet);

        steps.push({
          explanation: `total = ${nums[i]}+${nums[j]}+${nums[k]} = 0. solutionSet.add(${triplet}) — ${isNew ? 'new, so the set grows.' : 'already in the set, so add() is a silent no-op.'} Both pointers used up: j+=1, k-=1.`,
          // nth 1: this if-branch's own 'k-=1'; hit 2 is the elif-branch's 'k-=1' further down.
          anchor: { match: 'if total == 0:', to: { match: 'k-=1', nth: 1 } },
          state: {
            type: 'array',
            cells: nums.map((v, idx) => ({
              value: v,
              state: (idx === i || idx === j || idx === k ? 'found' : idx < i ? 'visited' : 'default') as CellVisualState,
            })),
            pointers: [
              { index: i, label: 'i' },
              { index: j, label: 'j' },
              { index: k, label: 'k' },
            ],
            counters: [{ label: 'solutionSet', value: setLabel() }],
          },
          variables: [
            { name: 'total', value: total, highlight: true },
            { name: 'solutionSet', value: setLabel(), highlight: true },
          ],
        });
        j += 1;
        k -= 1;
      } else if (total > 0) {
        steps.push({
          explanation: `total = ${total} > 0 — too high. k-=1.`,
          // Skips nth=1's 'k-=1' — that's the if-branch's line above (total == 0 case).
          anchor: { match: 'elif total > 0:', to: { match: 'k-=1', nth: 2 } },
          state: {
            type: 'array',
            cells: snap(i, j, k),
            pointers: [
              { index: i, label: 'i' },
              { index: j, label: 'j' },
              { index: k, label: 'k' },
            ],
            counters: solutionSet.size ? [{ label: 'solutionSet', value: setLabel() }] : [],
          },
          variables: [
            { name: 'total', value: total, highlight: true },
            { name: 'action', value: 'k-=1' },
          ],
        });
        k -= 1;
      } else {
        steps.push({
          explanation: `total = ${total} < 0 — too low. j+=1.`,
          // Skips nth=1's 'j+=1' — that's the if-branch's line above (total == 0 case).
          anchor: { match: 'else:', to: { match: 'j+=1', nth: 2 } },
          state: {
            type: 'array',
            cells: snap(i, j, k),
            pointers: [
              { index: i, label: 'i' },
              { index: j, label: 'j' },
              { index: k, label: 'k' },
            ],
            counters: solutionSet.size ? [{ label: 'solutionSet', value: setLabel() }] : [],
          },
          variables: [
            { name: 'total', value: total, highlight: true },
            { name: 'action', value: 'j+=1' },
          ],
        });
        j += 1;
      }
    }
  }

  steps.push({
    explanation: `Outer loop exhausted. return list(solutionSet) = [${[...solutionSet].join(', ')}]. O(n²) time (sort + a two-pointer scan per i), O(n) extra space for the set.`,
    anchor: { match: 'return list(solutionSet)' },
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: 'visited' as const })),
      pointers: [],
      counters: [{ label: 'solutionSet', value: setLabel() }],
    },
    variables: [{ name: 'return', value: `list(solutionSet)`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Sort + Two Pointers',
  variant: 'sort-two-pointers',
  generateSteps,
};

export const threeSumMeta: AlgorithmMeta = {
  id: 'three-sum',
  lcNumber: 15,
  title: '3Sum',
  difficulty: 'Medium',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers', 'Sorting'],
  timeComplexity: 'O(n²)',
  spaceComplexity: 'O(n)',
  description:
    'Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i, j, and k are distinct indices, nums[i] + nums[j] + nums[k] == 0, and the solution set contains no duplicate triplets.',
  examples: [
    {
      input: 'nums = [-1,0,1,2,-1,-4]',
      output: '[[-1,-1,2],[-1,0,1]]',
    },
    {
      input: 'nums = [0,1,1]',
      output: '[]',
    },
    {
      input: 'nums = [0,0,0]',
      output: '[[0,0,0]]',
    },
  ] as ProblemExample[],
  constraints: [
    '3 ≤ nums.length ≤ 3000',
    '-10⁵ ≤ nums[i] ≤ 10⁵',
  ],
  hint: 'Sort the array. For each element nums[i] (the "anchor"), reduce the problem to two-sum on the sorted subarray to the right. Two pointers j and k move inward, adjusting based on whether the current sum is too small or too large.',
  solutions: [solution],
};
