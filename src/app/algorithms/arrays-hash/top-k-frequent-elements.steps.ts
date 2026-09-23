import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Heap helpers ──────────────────────────────────────────────────────────────
//
// Mirrors CPython's heapq exactly (array-based binary min-heap, tuples compared
// lexicographically by [freq, num]): a bare list, no post-hoc sort. The site's
// old simulation re-sorted the whole array after every push, which keeps the
// array FULLY sorted — heapq never does that, so its array order (and the
// order the final result comes off it) can differ from a sorted list.

type HeapEntry = readonly [freq: number, num: number];

function compareEntries(a: HeapEntry, b: HeapEntry): number {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
}

/** Bubbles heap[pos] up toward heap[startpos] while it's smaller than its parent. */
function siftDown(heap: HeapEntry[], startPos: number, pos: number): void {
  const newItem = heap[pos];
  let currentPos = pos;
  while (currentPos > startPos) {
    const parentPos = (currentPos - 1) >> 1;
    const parent = heap[parentPos];
    if (compareEntries(newItem, parent) >= 0) break;
    heap[currentPos] = parent;
    currentPos = parentPos;
  }
  heap[currentPos] = newItem;
}

/** Bubbles heap[pos] down to a leaf via its smaller child, then sifts it back up. */
function siftUp(heap: HeapEntry[], pos: number): void {
  const endPos = heap.length;
  const startPos = pos;
  const newItem = heap[pos];
  let currentPos = pos;
  let childPos = 2 * currentPos + 1;
  while (childPos < endPos) {
    const rightPos = childPos + 1;
    if (rightPos < endPos && compareEntries(heap[childPos], heap[rightPos]) >= 0) {
      childPos = rightPos;
    }
    heap[currentPos] = heap[childPos];
    currentPos = childPos;
    childPos = 2 * currentPos + 1;
  }
  heap[currentPos] = newItem;
  siftDown(heap, startPos, currentPos);
}

function heapPush(heap: HeapEntry[], item: HeapEntry): void {
  heap.push(item);
  siftDown(heap, 0, heap.length - 1);
}

function heapPop(heap: HeapEntry[]): HeapEntry {
  const lastElt = heap.pop()!;
  if (heap.length === 0) return lastElt;
  const returnItem = heap[0];
  heap[0] = lastElt;
  siftUp(heap, 0);
  return returnItem;
}

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's topKFrequent_20260530 verbatim: `freqMap[n] = 1 +
// freqMap.get(n,0)`, then `heapq.heappush(heap, (freqMap[num],num))` for each
// num in freqMap.keys(), popping once (`if len(heap) > k:`, not `while`) when
// it grows past k, then reading the result straight off the heap array in
// `for freq, value in heap: result.append(value)` — no sort.

function generateSteps(): Step[] {
  const nums = [1, 1, 1, 2, 2, 3];
  const k = 2;
  const steps: Step[] = [];
  const freq: Record<number, number> = {};

  steps.push({
    explanation: `Find the top ${k} most frequent elements in [${nums.join(',')}]. Phase 1: build a frequency map. Phase 2: maintain a min-heap of size k — pop when it exceeds k, so only the top-k survive.`,
    anchor: { match: 'freqMap = {}' },
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
      explanation: `freqMap[${nums[i]}] = 1 + freqMap.get(${nums[i]},0) = ${freq[nums[i]]}.`,
      anchor: { match: 'freqMap[n] = 1 + freqMap.get(n,0)' },
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
        { name: `freqMap[${nums[i]}]`, value: freq[nums[i]], highlight: true },
      ],
    });
  }

  // Phase 2: min-heap simulation — a real array-based heap, not a sorted list.
  const heap: HeapEntry[] = [];
  const heapStr = () => (heap.length ? heap.map(([f, n]) => `(freq=${f},val=${n})`).join(', ') : '(empty)');

  steps.push({
    explanation: `Frequency map complete: {${Object.entries(freq).map(([n, f]) => `${n}:${f}`).join(', ')}}. Now iterate over freqMap.keys() and maintain heap as a min-heap of size k=${k}, keyed by (freq, num).`,
    anchor: { match: 'heap = []' },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'visited' as const })),
      pointers: [],
      hashmap: { ...freq },
      counters: [{ label: 'heap', value: '(empty)' }],
    },
    variables: [{ name: 'freqMap', value: `{${Object.entries(freq).map(([n, f]) => `${n}:${f}`).join(', ')}}` }],
  });

  for (const num of Object.keys(freq).map(Number)) {
    const entryFreq = freq[num];

    heapPush(heap, [entryFreq, num]);

    steps.push({
      explanation: `heapq.heappush(heap, (${entryFreq}, ${num})). Heap array (heap order, not sorted): ${heapStr()}.`,
      anchor: { match: 'heapq.heappush(heap, (freqMap[num],num))' },
      state: {
        type: 'array',
        cells: nums.map(v => ({
          value: v,
          state: v === num ? ('active' as const) : ('visited' as const),
        })),
        pointers: [],
        hashmap: { ...freq },
        counters: [{ label: 'heap', value: heapStr() }],
      },
      variables: [
        { name: 'pushed', value: `(freq=${entryFreq}, val=${num})`, highlight: true },
        { name: 'len(heap)', value: heap.length },
      ],
    });

    if (heap.length > k) {
      const popped = heapPop(heap);
      steps.push({
        explanation: `len(heap) = ${heap.length + 1} > k=${k}. heapq.heappop(heap) removes the minimum: (freq=${popped[0]}, val=${popped[1]}). Heap array now: ${heapStr()}.`,
        anchor: { match: 'if len(heap) > k:', to: { match: 'heapq.heappop(heap)' } },
        state: {
          type: 'array',
          cells: nums.map(v => ({
            value: v,
            state: v === popped[1] ? ('eliminated' as const) : ('visited' as const),
          })),
          pointers: [],
          hashmap: { ...freq },
          counters: [{ label: 'heap', value: heapStr() }],
        },
        variables: [
          { name: 'popped', value: `val=${popped[1]}`, highlight: true },
          { name: 'len(heap)', value: heap.length },
        ],
      });
    }
  }

  const result = heap.map(([, entryNum]) => entryNum);

  steps.push({
    explanation: `Build result by reading the heap array in its current order (no sort): ${heapStr()} → for freq, value in heap: result.append(value). Result so far: [${result.join(', ')}].`,
    anchor: { match: 'for freq, value in heap:', to: { match: 'result.append(value)' } },
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
    variables: [{ name: 'result', value: `[${result.join(', ')}]`, highlight: true }],
  });

  steps.push({
    explanation: `Return result = [${result.join(', ')}] — the top-${k} most frequent elements, in heap array order (not sorted by frequency). O(n log k) time.`,
    anchor: { match: 'return result' },
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
  variant: 'min-heap',
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
