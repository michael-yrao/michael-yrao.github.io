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

export const longestConsecutiveSequenceMeta: AlgorithmMeta = {
  id: 'longest-consecutive-sequence',
  lcNumber: 128,
  title: 'Longest Consecutive Sequence',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Hash Set'],
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
  solutions: [solution],
};
