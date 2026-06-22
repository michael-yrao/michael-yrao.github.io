import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        # only start counting from sequence beginnings to avoid O(n²) inner loops
        # a number is a sequence start only if (num - 1) is not in the set
        # a set (not map) suffices — we only need membership checks, not stored lengths

        if not nums:
            return 0
        consecutiveSet = set(nums)
        longest = 0

        for num in consecutiveSet:
            if (num - 1) not in consecutiveSet:
                # this is a sequence start — extend forward until the chain breaks
                length = 1
                while (num + length) in consecutiveSet:
                    length += 1
                longest = max(longest, length)

        return longest`;

function generateSteps(): Step[] {
  const nums = [100, 4, 200, 1, 3, 2];
  const numSet = new Set(nums);
  const steps: Step[] = [];
  let longest = 0;

  const snapDefault = () =>
    nums.map(v => ({ value: v, state: 'default' as const }));

  const snapWithSeq = (seq: number[], checking: number | null) =>
    nums.map(v => ({
      value: v,
      state:
        v === checking
          ? ('active' as const)
          : seq.includes(v)
          ? ('found' as const)
          : seq.length > 0 && nums.indexOf(v) < nums.indexOf(seq[0])
          ? ('visited' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation:
      'Key insight: only start counting from sequence beginnings — a number is a start if (num − 1) is not in the set. This avoids redundant inner loops and keeps overall complexity O(n).',
    highlightLine: 3,
    state: {
      type: 'array',
      cells: snapDefault(),
      pointers: [],
      hashmap: Object.fromEntries([...numSet].map(v => [v, 1])),
    },
    variables: [
      { name: 'set', value: `{${[...numSet].sort((a, b) => a - b).join(', ')}}` },
    ],
  });

  const visited = new Set<number>();

  for (const num of numSet) {
    // Check if num is a sequence start
    if (!numSet.has(num - 1)) {
      // It's a start — extend
      let length = 1;
      const seq = [num];

      steps.push({
        explanation: `num=${num}: (${num}-1)=${num - 1} not in set → this is a sequence start! Begin extending.`,
        highlightLine: 5,
        state: {
          type: 'array',
          cells: nums.map(v => ({
            value: v,
            state:
              v === num
                ? ('active' as const)
                : visited.has(v)
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [],
          hashmap: Object.fromEntries([...numSet].map(v => [v, 1])),
          counters: [{ label: 'longest', value: longest }],
        },
        variables: [
          { name: 'num', value: num, highlight: true },
          { name: 'is start', value: 'true' },
          { name: 'length', value: length },
        ],
      });

      while (numSet.has(num + length)) {
        seq.push(num + length);
        length++;
        steps.push({
          explanation: `${num + length - 1} is in set → sequence extends to length ${length}. Current: [${seq.join('→')}].`,
          highlightLine: 8,
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
            counters: [{ label: 'longest', value: longest }],
          },
          variables: [
            { name: 'num+length', value: num + length - 1, highlight: true },
            { name: 'length', value: length, highlight: true },
          ],
        });
      }

      const prevLongest = longest;
      longest = Math.max(longest, length);
      seq.forEach(v => visited.add(v));

      steps.push({
        explanation: `Sequence [${seq.join('→')}] has length ${length}. longest = max(${prevLongest}, ${length}) = ${longest}.`,
        highlightLine: 9,
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
          counters: [{ label: 'longest', value: longest }],
        },
        variables: [
          { name: 'length', value: length },
          { name: 'longest', value: longest, highlight: true },
        ],
      });
    } else {
      visited.add(num);
      steps.push({
        explanation: `num=${num}: (${num}-1)=${num - 1} IS in set → not a sequence start. Skip to avoid redundant work.`,
        highlightLine: 5,
        state: {
          type: 'array',
          cells: nums.map(v => ({
            value: v,
            state:
              v === num
                ? ('eliminated' as const)
                : visited.has(v)
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [],
          hashmap: Object.fromEntries([...numSet].map(v => [v, 1])),
          counters: [{ label: 'longest', value: longest }],
        },
        variables: [
          { name: 'num', value: num },
          { name: 'is start', value: 'false — skip' },
        ],
      });
    }
  }

  steps.push({
    explanation: `All elements checked. Longest consecutive sequence = ${longest}. O(n) time — each element is visited at most twice (once as start check, once during extension).`,
    highlightLine: 10,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
      counters: [{ label: 'longest', value: longest }],
    },
    variables: [{ name: 'return', value: longest, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'HashSet',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

// ── Solution 2: HashMap (endpoint run-length merge) ───────────────────────────

const PYTHON_CODE_MAP = `class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        numSet = set(nums)
        numMap = {}
        longest = 0

        for n in numSet:
            # numMap[n-1] = length ending at n-1
            leftSequenceLength = numMap.get(n-1,0)
            # numMap[n+1] = length starting at n+1
            rightSequenceLength = numMap.get(n+1,0)
            # Add left sequence length, right sequence length and 1 for current value to get current sequence length
            numMap[n] = leftSequenceLength + rightSequenceLength + 1
            # set starting left sequence to new value
            numMap[n-leftSequenceLength] = numMap[n]
            # set ending right sequence to new value
            numMap[n+rightSequenceLength] = numMap[n]
            longest = max(longest, numMap[n])

        return longest`;

function generateStepsMap(): Step[] {
  const nums = [100, 4, 200, 1, 3, 2];
  const order = [...new Set(nums)];
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
    highlightLine: 3,
    state: snap(null),
    variables: [
      { name: 'numSet', value: `{${order.join(', ')}}` },
      { name: 'longest', value: 0 },
    ],
  });

  for (const n of order) {
    const left = numMap[n - 1] || 0;
    const right = numMap[n + 1] || 0;
    const total = left + right + 1;
    numMap[n] = total;
    numMap[n - left] = total;
    numMap[n + right] = total;
    longest = Math.max(longest, total);
    steps.push({
      explanation: `n=${n}: left run ending at ${n - 1} = ${left}, right run starting at ${n + 1} = ${right}. Merge → numMap[${n}] = ${left}+${right}+1 = ${total}. Stamp that length onto the outer endpoints numMap[${n - left}] and numMap[${n + right}]. longest = ${longest}.`,
      highlightLine: 13,
      state: snap(n),
      variables: [
        { name: 'n', value: n, highlight: true },
        { name: 'left', value: left },
        { name: 'right', value: right },
        { name: 'numMap[n]', value: total, highlight: true },
        { name: 'longest', value: longest, highlight: longest === total },
      ],
    });
  }

  steps.push({
    explanation: `All values processed. The longest run is ${longest} — the 1–2–3–4 chain, assembled as 3 glued 2 (right run) and 2 glued 1 (left run). Return ${longest}.`,
    highlightLine: 20,
    state: snap(null),
    variables: [{ name: 'return', value: longest, highlight: true }],
  });

  return steps;
}

const mapSolution: SolutionVariant = {
  label: 'HashMap (endpoint merge)',
  pythonCode: PYTHON_CODE_MAP,
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
