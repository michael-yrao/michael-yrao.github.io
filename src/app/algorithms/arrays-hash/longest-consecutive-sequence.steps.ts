import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// CPython does NOT iterate a set in insertion order (small ints hash to
// themselves, so it's roughly numeric-bucket order). Both attempts below do
// `for n in numSet:` where numSet = set(nums), so we trace CPython's real
// order, not JS's insertion order — verified with
// `python -c "print(list(set([100,4,200,1,3,2])))"` → [1, 2, 3, 100, 4, 200].
const NUM_SET_ITERATION_ORDER = [1, 2, 3, 100, 4, 200];

// ── Solution 1: HashSet ───────────────────────────────────────────────────────
//
// Traces cse-progress's longestConsecutive_20260629 verbatim: numSet,
// maxConsecutive, n, counter (not consecutiveSet/longest/num/length). No early
// return for an empty nums — the loop over numSet simply wouldn't execute.

function generateSteps(): Step[] {
  const nums = [100, 4, 200, 1, 3, 2];
  const numSet = new Set(nums);
  const steps: Step[] = [];
  let maxConsecutive = 0;

  const snapDefault = () =>
    nums.map(v => ({ value: v, state: 'default' as const }));

  steps.push({
    explanation:
      'Key insight: only start counting from sequence beginnings — n is a start if (n − 1) is not in numSet. This avoids redundant inner loops and keeps overall complexity O(n).',
    anchor: { match: 'numSet = set(nums)', to: { match: 'maxConsecutive = 0' } },
    state: {
      type: 'array',
      cells: snapDefault(),
      pointers: [],
      hashmap: Object.fromEntries([...numSet].map(v => [v, 1])),
    },
    variables: [
      { name: 'numSet', value: `{${NUM_SET_ITERATION_ORDER.join(', ')}}` },
    ],
  });

  const visited = new Set<number>();

  for (const n of NUM_SET_ITERATION_ORDER) {
    // Check if n is a sequence start
    if (!numSet.has(n - 1)) {
      // It's a start — extend
      let counter = 1;
      const seq = [n];

      steps.push({
        explanation: `n=${n}: (${n}-1)=${n - 1} not in numSet → this is a sequence start! counter = 1.`,
        anchor: { match: 'if n - 1 not in numSet:', to: { match: 'counter = 1' } },
        state: {
          type: 'array',
          cells: nums.map(v => ({
            value: v,
            state:
              v === n
                ? ('active' as const)
                : visited.has(v)
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [],
          hashmap: Object.fromEntries([...numSet].map(v => [v, 1])),
          counters: [{ label: 'maxConsecutive', value: maxConsecutive }],
        },
        variables: [
          { name: 'n', value: n, highlight: true },
          { name: 'is start', value: 'true' },
          { name: 'counter', value: counter },
        ],
      });

      while (numSet.has(n + counter)) {
        seq.push(n + counter);
        counter++;
        steps.push({
          explanation: `${n + counter - 1} is in numSet → counter extends to ${counter}. Current: [${seq.join('→')}].`,
          anchor: { match: 'while n + counter in numSet:', to: { match: 'counter+=1' } },
          state: {
            type: 'array',
            cells: nums.map(v => ({
              value: v,
              state:
                seq.includes(v)
                  ? ('found' as const)
                  : visited.has(v)
                  ? ('visited' as const)
                  : ('default' as const),
            })),
            pointers: [],
            hashmap: Object.fromEntries([...numSet].map(v => [v, 1])),
            counters: [{ label: 'maxConsecutive', value: maxConsecutive }],
          },
          variables: [
            { name: 'n+counter', value: n + counter - 1, highlight: true },
            { name: 'counter', value: counter, highlight: true },
          ],
        });
      }

      const prevMax = maxConsecutive;
      maxConsecutive = Math.max(maxConsecutive, counter);
      seq.forEach(v => visited.add(v));

      steps.push({
        explanation: `Sequence [${seq.join('→')}] has counter=${counter}. maxConsecutive = max(${prevMax}, ${counter}) = ${maxConsecutive}.`,
        anchor: { match: 'maxConsecutive = max(maxConsecutive, counter)' },
        state: {
          type: 'array',
          cells: nums.map(v => ({
            value: v,
            state:
              seq.includes(v)
                ? ('found' as const)
                : visited.has(v)
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [],
          hashmap: Object.fromEntries([...numSet].map(v => [v, 1])),
          counters: [{ label: 'maxConsecutive', value: maxConsecutive }],
        },
        variables: [
          { name: 'counter', value: counter },
          { name: 'maxConsecutive', value: maxConsecutive, highlight: true },
        ],
      });
    } else {
      visited.add(n);
      steps.push({
        explanation: `n=${n}: (${n}-1)=${n - 1} IS in numSet → not a sequence start. Skip to avoid redundant work.`,
        anchor: { match: 'if n - 1 not in numSet:' },
        state: {
          type: 'array',
          cells: nums.map(v => ({
            value: v,
            state:
              v === n
                ? ('eliminated' as const)
                : visited.has(v)
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [],
          hashmap: Object.fromEntries([...numSet].map(v => [v, 1])),
          counters: [{ label: 'maxConsecutive', value: maxConsecutive }],
        },
        variables: [
          { name: 'n', value: n },
          { name: 'is start', value: 'false — skip' },
        ],
      });
    }
  }

  steps.push({
    explanation: `All elements checked. Longest consecutive sequence = ${maxConsecutive}. O(n) time — each element is visited at most twice (once as start check, once during extension).`,
    anchor: { match: 'return maxConsecutive' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
      counters: [{ label: 'maxConsecutive', value: maxConsecutive }],
    },
    variables: [{ name: 'return', value: maxConsecutive, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'HashSet',
  variant: 'hashset',
  generateSteps,
};

// ── Solution 2: HashMap (endpoint run-length merge) ───────────────────────────
//
// Traces cse-progress's longestConsecutiveMap verbatim: numSet, numMap,
// longest, leftSequenceLength, rightSequenceLength — one step per n glues the
// left and right runs and stamps the merged length onto both outer endpoints.

function generateStepsMap(): Step[] {
  const nums = [100, 4, 200, 1, 3, 2];
  const order = NUM_SET_ITERATION_ORDER;
  const steps: Step[] = [];
  const numMap: Record<number, number> = {};
  let longest = 0;

  const snap = (active: number | null) => ({
    type: 'array' as const,
    cells: nums.map((v) => ({
      value: v,
      state: v === active ? ('active' as const) : numMap[v] !== undefined ? ('visited' as const) : ('default' as const),
    })),
    pointers: active !== null ? [{ index: nums.indexOf(active), label: 'n' }] : [],
    hashmap: { ...numMap } as Record<string | number, number>,
    hashmapLabel: 'numMap',
    counters: [{ label: 'longest', value: longest }],
  });

  steps.push({
    explanation:
      "HashMap approach: numMap[x] stores the length of the consecutive run that has x as an ENDPOINT. For each value, glue its left run (ending at n−1) to its right run (starting at n+1), then write the merged length onto the two OUTER endpoints. O(n) — no per-run scanning.",
    anchor: { match: 'numSet = set(nums)', to: { match: 'longest = 0' } },
    state: snap(null),
    variables: [
      { name: 'numSet', value: `{${order.join(', ')}}` },
      { name: 'longest', value: 0 },
    ],
  });

  for (const n of order) {
    const leftSequenceLength = numMap[n - 1] || 0;
    const rightSequenceLength = numMap[n + 1] || 0;
    const total = leftSequenceLength + rightSequenceLength + 1;
    numMap[n] = total;
    numMap[n - leftSequenceLength] = total;
    numMap[n + rightSequenceLength] = total;
    longest = Math.max(longest, total);
    steps.push({
      explanation: `n=${n}: leftSequenceLength ending at ${n - 1} = ${leftSequenceLength}, rightSequenceLength starting at ${n + 1} = ${rightSequenceLength}. Merge → numMap[${n}] = ${leftSequenceLength}+${rightSequenceLength}+1 = ${total}. Stamp that length onto the outer endpoints numMap[${n - leftSequenceLength}] and numMap[${n + rightSequenceLength}]. longest = ${longest}.`,
      anchor: { match: 'leftSequenceLength = numMap.get(n-1,0)', to: { match: 'longest = max(longest, numMap[n])' } },
      state: snap(n),
      variables: [
        { name: 'n', value: n, highlight: true },
        { name: 'leftSequenceLength', value: leftSequenceLength },
        { name: 'rightSequenceLength', value: rightSequenceLength },
        { name: 'numMap[n]', value: total, highlight: true },
        { name: 'longest', value: longest, highlight: longest === total },
      ],
    });
  }

  steps.push({
    explanation: `All values processed. The longest run is ${longest} — the 1–2–3–4 chain, assembled purely through LEFT merges in this iteration order: 1 seeds a run of length 1, 2 glues onto 1's run (length 2), 3 glues onto that (length 3), 4 glues onto that (length 4). rightSequenceLength stays 0 throughout since each larger neighbor hasn't been visited yet. Return ${longest}.`,
    anchor: { match: 'return longest' },
    state: snap(null),
    variables: [{ name: 'return', value: longest, highlight: true }],
  });

  return steps;
}

const mapSolution: SolutionVariant = {
  label: 'HashMap (endpoint merge)',
  variant: 'endpoint-map',
  generateSteps: generateStepsMap,
};

export const longestConsecutiveSequenceMeta: AlgorithmMeta = {
  id: 'longest-consecutive-sequence',
  lcNumber: 128,
  title: 'Longest Consecutive Sequence',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Hash Set', 'Hash Map'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an unsorted array of integers nums, return the length of the longest consecutive elements sequence. You must write an algorithm that runs in O(n) time.',
  examples: [
    {
      input: 'nums = [100,4,200,1,3,2]',
      output: '4',
      explanation: 'The longest consecutive sequence is [1,2,3,4] with length 4.',
    },
    {
      input: 'nums = [0,3,7,2,5,8,4,6,0,1]',
      output: '9',
    },
  ] as ProblemExample[],
  constraints: [
    '0 ≤ nums.length ≤ 10⁵',
    '-10⁹ ≤ nums[i] ≤ 10⁹',
  ],
  hint: 'Put all numbers in a set for O(1) lookup. A number starts a sequence only if num-1 is not in the set. From each start, count forward while consecutive numbers exist. This ensures the inner while-loop runs O(n) total across all outer iterations.',
  solutions: [solution, mapSolution],
};
