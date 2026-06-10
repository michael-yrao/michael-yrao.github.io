import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `import heapq

class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        freq = {}
        for n in nums:
            freq[n] = 1 + freq.get(n, 0)

        min_heap = []
        for key, value in freq.items():
            heapq.heappush(min_heap, (value, key))
            if len(min_heap) > k:
                heapq.heappop(min_heap)

        return [key for _, key in min_heap]`;

function generateSteps(): Step[] {
  const nums = [1, 1, 1, 2, 2, 3];
  const k = 2;
  const steps: Step[] = [];
  const freq: Record<number, number> = {};

  steps.push({
    explanation: `Find the top ${k} most frequent elements in [${nums.join(',')}]. Phase 1: build a frequency map. Phase 2: maintain a min-heap of size k — pop the least frequent when we exceed k, so only the top-k survive.`,
    highlightLine: 4,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [{ name: 'k', value: k }],
  });

  // Phase 1: build freq map
  for (let i = 0; i < nums.length; i++) {
    freq[nums[i]] = (freq[nums[i]] ?? 0) + 1;
    steps.push({
      explanation: `freq[${nums[i]}] = ${freq[nums[i]]}.`,
      highlightLine: 6,
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...freq },
      },
      variables: [
        { name: `freq[${nums[i]}]`, value: freq[nums[i]], highlight: true },
      ],
    });
  }

  // Phase 2: min-heap simulation
  // freq = {1:3, 2:2, 3:1}
  // heap entries = (value, key)
  const heapEntries: [number, number][] = [];

  const heapStr = () => heapEntries.map(([v, k]) => `(freq=${v},val=${k})`).join(', ');

  steps.push({
    explanation: `Frequency map complete: {${Object.entries(freq).map(([k, v]) => `${k}:${v}`).join(', ')}}. Now iterate over entries and maintain a min-heap of size k=${k}. The heap key is frequency — this lets us cheaply evict the least frequent element.`,
    highlightLine: 9,
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
      hashmap: { ...freq },
      counters: [{ label: 'heap', value: '(empty)' }],
    },
    variables: [{ name: 'freq', value: `{${Object.entries(freq).map(([k, v]) => `${k}:${v}`).join(', ')}}` }],
  });

  for (const [key, value] of Object.entries(freq).map(([k, v]) => [Number(k), v] as [number, number])) {
    // Push
    heapEntries.push([value, key]);
    heapEntries.sort((a, b) => a[0] - b[0]); // simulate min-heap

    steps.push({
      explanation: `Push (freq=${value}, val=${key}) onto heap. Heap size = ${heapEntries.length}.`,
      highlightLine: 11,
      state: {
        type: 'array',
        cells: nums.map(v => ({
          value: v,
          state: v === key ? ('active' as const) : ('visited' as const),
        })),
        pointers: [],
        hashmap: { ...freq },
        counters: [{ label: 'heap (min first)', value: heapStr() }],
      },
      variables: [
        { name: 'pushed', value: `(freq=${value}, val=${key})`, highlight: true },
        { name: 'heap size', value: heapEntries.length },
      ],
    });

    if (heapEntries.length > k) {
      const popped = heapEntries.shift()!;
      steps.push({
        explanation: `Heap size ${heapEntries.length + 1} > k=${k}. Pop minimum: (freq=${popped[0]}, val=${popped[1]}) — val=${popped[1]} is less frequent than our current top-k.`,
        highlightLine: 13,
        state: {
          type: 'array',
          cells: nums.map(v => ({
            value: v,
            state: v === popped[1] ? ('eliminated' as const) : ('visited' as const),
          })),
          pointers: [],
          hashmap: { ...freq },
          counters: [{ label: 'heap (min first)', value: heapStr() }],
        },
        variables: [
          { name: 'popped', value: `val=${popped[1]}`, highlight: true },
          { name: 'heap size', value: heapEntries.length },
        ],
      });
    }
  }

  const result = heapEntries.map(([, k]) => k);

  steps.push({
    explanation: `Heap contains the top-${k} most frequent: ${heapEntries.map(([v, k]) => `val=${k}(freq=${v})`).join(', ')}. Result: [${result.join(', ')}]. O(n log k) time.`,
    highlightLine: 15,
    state: {
      type: 'array',
      cells: nums.map(v => ({
        value: v,
        state: result.includes(v) ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      hashmap: { ...freq },
      counters: [{ label: 'result', value: `[${result.join(', ')}]` }],
    },
    variables: [{ name: 'return', value: `[${result.join(', ')}]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'HashMap + Min-Heap',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const topKFrequentElementsMeta: AlgorithmMeta = {
  id: 'top-k-frequent-elements',
  lcNumber: 347,
  title: 'Top K Frequent Elements',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Hash Map', 'Bucket Sort', 'Heap'],
  timeComplexity: 'O(n log k)',
  spaceComplexity: 'O(n)',
  description:
    'Given an integer array nums and an integer k, return the k most frequent elements. You may return the answer in any order.',
  examples: [
    { input: 'nums = [1,1,1,2,2,3], k = 2', output: '[1,2]' },
    { input: 'nums = [1], k = 1', output: '[1]' },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 10⁵',
    '-10⁴ ≤ nums[i] ≤ 10⁴',
    'k is in the range [1, the number of unique elements in the array].',
    'It is guaranteed that the answer is unique.',
  ],
  hint: 'Build a frequency map, then maintain a min-heap of size k keyed by frequency. Push every (freq, element) pair. When the heap exceeds size k, pop the minimum — this always evicts the least frequent element seen so far. What remains are the top-k.',
  solutions: [solution],
};
