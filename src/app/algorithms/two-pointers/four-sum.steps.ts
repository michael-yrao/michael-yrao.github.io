import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's fourSum_20260727 verbatim: nums.sort(), lenNums = len(nums),
// resultSet = set(). For each i, j: k, l = j+1, len(nums)-1 is set FIRST, then
// runningTarget = target - nums[i] - nums[j] is computed from that combined subtraction (not
// two separate per-i/per-j subtractions). The two-pointer branch order is equal → elif GREATER
// (l-=1) → else (k+=1) — the "too small" case has no explicit condition, it's just whatever's
// left. Deduplication is via resultSet (a Python set of tuples), then unpacked into a list.

function generateSteps(): Step[] {
  const original = [1, 0, -1, 0, -2, 2];
  const target = 0;
  const nums = [...original].sort((a, b) => a - b); // [-2,-1,0,0,1,2]
  const lenNums = nums.length;
  const steps: Step[] = [];
  const resultSet = new Set<string>();

  const snap = (iIdx: number, jIdx: number, kIdx: number, lIdx: number) =>
    nums.map((v, idx) => ({
      value: v,
      state:
        idx === iIdx || idx === jIdx
          ? ('active' as const)
          : idx >= kIdx && idx <= lIdx && kIdx <= lIdx
          ? ('window' as const)
          : idx < iIdx
          ? ('visited' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation: `nums.sort(): [${original.join(', ')}] → [${nums.join(', ')}]. lenNums = ${lenNums}. resultSet = set() — dedup happens via the set, there's no explicit duplicate-index skip.`,
    anchor: { match: 'nums.sort()', to: { match: 'resultSet = set()' } },
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [{ label: 'target', value: target }],
    },
    variables: [
      { name: 'nums', value: `[${nums.join(', ')}]` },
      { name: 'target', value: target },
    ],
  });

  for (let i = 0; i < lenNums - 3; i++) {
    steps.push({
      explanation: `for i in range(lenNums-3): i=${i}, nums[i]=${nums[i]}.`,
      anchor: { match: 'for i in range(lenNums-3):', to: { match: 'for j in range(i+1, lenNums-2):' } },
      state: {
        type: 'array',
        cells: nums.map((v, idx) => ({
          value: v,
          state: (idx === i ? 'active' : idx < i ? 'visited' : 'default') as 'active' | 'visited' | 'default',
        })),
        pointers: [{ index: i, label: 'i' }],
      },
      variables: [{ name: 'i', value: i }, { name: 'nums[i]', value: nums[i] }],
    });

    for (let j = i + 1; j < lenNums - 2; j++) {
      let k = j + 1;
      let l = lenNums - 1;
      const runningTarget = target - nums[i] - nums[j];

      steps.push({
        explanation: `for j in range(i+1, lenNums-2): j=${j}, nums[j]=${nums[j]}. k, l = j+1, len(nums)-1 → k=${k}, l=${l}. runningTarget = target - nums[i] - nums[j] = ${target} - ${nums[i]} - ${nums[j]} = ${runningTarget}.`,
        anchor: { match: 'for j in range(i+1, lenNums-2):', to: { match: 'runningTarget = target - nums[i] - nums[j]' } },
        state: {
          type: 'array',
          cells: snap(i, j, k, l),
          pointers: [
            { index: i, label: 'i' },
            { index: j, label: 'j' },
            { index: k, label: 'k' },
            { index: l, label: 'l' },
          ],
        },
        variables: [
          { name: 'j', value: j },
          { name: 'nums[j]', value: nums[j] },
          { name: 'runningTarget', value: runningTarget },
        ],
      });

      while (k < l) {
        const pairSum = nums[k] + nums[l];

        if (pairSum === runningTarget) {
          const quadKey = `(${nums[i]}, ${nums[j]}, ${nums[k]}, ${nums[l]})`;
          resultSet.add(quadKey);
          steps.push({
            explanation: `nums[k]+nums[l] = ${nums[k]}+${nums[l]} = ${pairSum} == runningTarget ${runningTarget} → resultSet.add(${quadKey}). k+=1, l-=1.`,
            // nth 1: this if-branch's own 'l-=1'; hit 2 is the else-branch's 'l-=1' further down.
            anchor: { match: 'if nums[k] + nums[l] == runningTarget:', to: { match: 'l-=1', nth: 1 } },
            state: {
              type: 'array',
              cells: nums.map((v, idx) => ({
                value: v,
                state: (idx === i || idx === j || idx === k || idx === l
                  ? 'found'
                  : idx < i
                  ? 'visited'
                  : 'default') as 'found' | 'visited' | 'default',
              })),
              pointers: [
                { index: i, label: 'i' },
                { index: j, label: 'j' },
                { index: k, label: 'k' },
                { index: l, label: 'l' },
              ],
              counters: [{ label: 'resultSet', value: `{${[...resultSet].join(', ')}}` }],
            },
            variables: [
              { name: 'pairSum', value: pairSum, highlight: true },
              { name: 'resultSet', value: `{${[...resultSet].join(', ')}}`, highlight: true },
            ],
          });
          k += 1;
          l -= 1;
        } else if (pairSum > runningTarget) {
          steps.push({
            explanation: `nums[k]+nums[l] = ${nums[k]}+${nums[l]} = ${pairSum} > runningTarget ${runningTarget} → l-=1.`,
            // nth 2: hit 1 is the if-branch's own 'l-=1' above; this elif-branch's is the second.
            anchor: { match: 'elif nums[k] + nums[l] > runningTarget:', to: { match: 'l-=1', nth: 2 } },
            state: {
              type: 'array',
              cells: snap(i, j, k, l),
              pointers: [
                { index: i, label: 'i' },
                { index: j, label: 'j' },
                { index: k, label: 'k' },
                { index: l, label: 'l' },
              ],
            },
            variables: [
              { name: 'pairSum', value: pairSum, highlight: true },
              { name: 'action', value: 'l-=1' },
            ],
          });
          l -= 1;
        } else {
          steps.push({
            explanation: `nums[k]+nums[l] = ${nums[k]}+${nums[l]} = ${pairSum}. Not equal, not greater → falls to else: k+=1.`,
            // nth 2: hit 1 is the if-branch's own 'k+=1' above; this else-branch's is the second.
            anchor: { match: 'else:', to: { match: 'k+=1', nth: 2 } },
            state: {
              type: 'array',
              cells: snap(i, j, k, l),
              pointers: [
                { index: i, label: 'i' },
                { index: j, label: 'j' },
                { index: k, label: 'k' },
                { index: l, label: 'l' },
              ],
            },
            variables: [
              { name: 'pairSum', value: pairSum, highlight: true },
              { name: 'action', value: 'k+=1' },
            ],
          });
          k += 1;
        }
      }
    }
  }

  // The attempt does `for a,b,c,d in resultSet:` — CPython set iteration order is NOT
  // insertion order in general. Verified for this exact input via
  // `python -c "print(list({(-2,-1,1,2),(-1,0,0,1),(-2,0,0,2)}))"` → the CPython order IS
  // [(-2,-1,1,2), (-1,0,0,1), (-2,0,0,2)], which matches this simulation's insertion order,
  // so no reordering is needed here.
  steps.push({
    explanation: `All (i, j) pairs processed. result = []; for a,b,c,d in resultSet: result.append([a,b,c,d]) — unpack the set into a list. Result: [${[...resultSet].join(', ')}]. O(n³) time (two outer loops + a two-pointer inner scan), O(n) space for output.`,
    anchor: { match: 'result = []', to: { match: 'return result' } },
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: 'visited' as const })),
      pointers: [],
      counters: [{ label: 'result', value: [...resultSet].join(', ') }],
    },
    variables: [{ name: 'return', value: [...resultSet].join(', '), highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Sort + Two Nested Loops + Two Pointers',
  variant: 'sort-two-pointers',
  generateSteps,
};

export const fourSumMeta: AlgorithmMeta = {
  id: 'four-sum',
  lcNumber: 18,
  title: '4Sum',
  difficulty: 'Medium',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers', 'Sorting'],
  timeComplexity: 'O(n³)',
  spaceComplexity: 'O(n)',
  description:
    'Given an array nums of n integers and an integer target, return an array of all unique quadruplets [nums[a], nums[b], nums[c], nums[d]] such that the four indices are distinct and their values sum to target.',
  examples: [
    {
      input: 'nums = [1,0,-1,0,-2,2], target = 0',
      output: '[[-2,-1,1,2],[-2,0,0,2],[-1,0,0,1]]',
    },
    {
      input: 'nums = [2,2,2,2,2], target = 8',
      output: '[[2,2,2,2]]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 200',
    '-10⁹ ≤ nums[i] ≤ 10⁹',
    '-10⁹ ≤ target ≤ 10⁹',
  ],
  hint: 'Sort the array. Fix two outer indices i and j (O(n²)), then run a two-pointer search with k and l on the remaining subarray to find pairs that complete the quadruplet. Use a result set to automatically deduplicate.',
  solutions: [solution],
};
