import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's KthLargest verbatim: the constructor evicts with a `while
// len(self.heap) > self.k` loop (pops at most once per pushed num here, since the heap
// grows by 1 per num), while add() evicts with a single `if` — same net effect, different
// guard.

function generateSteps(): Step[] {
  const k = 3;
  const initNums = [4, 5, 8, 2];
  const adds = [3, 5, 10, 9, 4];
  const steps: Step[] = [];
  let heap: number[] = []; // min-heap shown as ascending array; index 0 = kth largest

  const snap = (activeIdx: number[]) => ({
    type: 'array' as const,
    cells: heap.map((v, i) => ({
      value: v,
      state: i === 0 ? ('min-ptr' as const) : activeIdx.includes(i) ? ('active' as const) : ('default' as const),
    })),
    pointers: heap.length ? [{ index: 0, label: 'kth largest' }] : [],
    counters: [
      { label: 'k', value: k },
      { label: 'minHeap (kth-largest on top)', value: heap.length ? `[${heap.join(', ')}]` : '∅' },
    ],
  });

  steps.push({
    explanation: `Keep a MIN-heap of the k largest values seen so far. Its smallest element — the top — is exactly the kth largest. Whenever the heap grows past size k, pop the smallest. Constructor: KthLargest(k=${k}, [${initNums.join(', ')}]).`,
    anchor: { match: 'def __init__(self, k: int, nums: List[int]):' },
    state: snap([]),
    variables: [{ name: 'k', value: k }, { name: 'nums', value: `[${initNums.join(', ')}]` }],
  });

  for (const n of initNums) {
    heap.push(n);
    heap.sort((a, b) => a - b);
    steps.push({
      explanation: `Constructor: heapq.heappush(self.heap, ${n}) → [${heap.join(', ')}] (size ${heap.length}).`,
      anchor: { match: 'heapq.heappush(self.heap,n)' },
      state: snap([heap.indexOf(n)]),
      variables: [{ name: 'pushed', value: n, highlight: true }, { name: 'size', value: heap.length }],
    });
    if (heap.length > k) {
      const popped = heap[0];
      heap = heap.slice(1);
      steps.push({
        explanation: `while len(self.heap) > self.k: size ${heap.length + 1} > k=${k} → pop the smallest (${popped}); it's not in the top ${k}. → [${heap.join(', ')}].`,
        // nth 1 hit: contract line 86 `heapq.heappop(self.heap)` (__init__'s evict).
        // skips line 92, add()'s `heapq.heappop(self.heap)`.
        anchor: { match: 'while len(self.heap) > self.k:', to: { match: 'heapq.heappop(self.heap)', nth: 1 } },
        state: snap([]),
        variables: [{ name: 'popped', value: popped, highlight: true }, { name: 'size', value: heap.length }],
      });
    }
  }

  steps.push({
    explanation: `Constructor done. self.heap = [${heap.join(', ')}]; the top (${heap[0]}) is the ${k}th largest so far.`,
    // Spans the whole init loop (`for n in nums:` ... its `heapq.heappop(self.heap)`).
    // nth: 1 picks the FIRST heappop hit in the file — the constructor's (contract line
    // 86) — so this never lands on add()'s heappop (contract line 92, nth: 2).
    anchor: { match: 'for n in nums:', to: { match: 'heapq.heappop(self.heap)', nth: 1 } },
    state: snap([0]),
    variables: [{ name: 'kth largest', value: heap[0], highlight: true }],
  });

  for (const val of adds) {
    heap.push(val);
    heap.sort((a, b) => a - b);
    steps.push({
      explanation: `add(${val}): heapq.heappush(self.heap, ${val}) → [${heap.join(', ')}] (size ${heap.length}).`,
      anchor: { match: 'heapq.heappush(self.heap, val)' },
      state: snap([heap.indexOf(val)]),
      variables: [{ name: 'val', value: val, highlight: true }, { name: 'size', value: heap.length }],
    });
    if (heap.length > k) {
      const popped = heap[0];
      heap = heap.slice(1);
      steps.push({
        explanation: `if len(self.heap) > self.k: size ${heap.length + 1} > k=${k} → pop the smallest (${popped}) → [${heap.join(', ')}].`,
        // nth 2 hit: contract line 92 `heapq.heappop(self.heap)` (add()'s evict).
        // skips line 86, __init__'s `heapq.heappop(self.heap)`.
        anchor: { match: 'if len(self.heap) > self.k:', to: { match: 'heapq.heappop(self.heap)', nth: 2 } },
        state: snap([]),
        variables: [{ name: 'popped', value: popped }, { name: 'size', value: heap.length }],
      });
    }
    steps.push({
      explanation: `Return self.heap[0] = ${heap[0]} — the ${k}th largest after adding ${val}.`,
      anchor: { match: 'return self.heap[0]' },
      state: snap([0]),
      variables: [{ name: 'return', value: heap[0], highlight: true }],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Min-Heap (size k)',
  variant: 'min-heap-k',
  generateSteps,
  timeComplexity: 'O(log k) per add',
  spaceComplexity: 'O(k)',
};

export const kthLargestInStreamMeta: AlgorithmMeta = {
  id: 'kth-largest-element-in-stream',
  lcNumber: 703,
  title: 'Kth Largest Element in a Stream',
  difficulty: 'Easy',
  category: 'heap',
  tags: ['Heap', 'Priority Queue', 'Design', 'Stream'],
  timeComplexity: 'O(log k) per add',
  spaceComplexity: 'O(k)',
  description:
    'Design a class that, given an integer k and a stream of values, returns the kth largest element after each new value is added. (The kth largest in the sorted order of all values so far, with duplicates counted.)',
  examples: [
    {
      input: 'KthLargest(3, [4,5,8,2]); add(3),add(5),add(10),add(9),add(4)',
      output: '[4, 5, 5, 8, 8]',
      explanation: 'A size-3 min-heap keeps the 3 largest; its top is the 3rd largest after each add.',
    },
  ] as ProblemExample[],
  constraints: ['0 ≤ nums.length ≤ 10⁴', '1 ≤ k ≤ nums.length + 1', '-10⁴ ≤ nums[i], val ≤ 10⁴', 'At most 10⁴ calls to add'],
  hint: "You don't need all the values sorted — only the kth largest. Keep a min-heap capped at size k: the k largest values stay in it, and the smallest of those (the heap top) is your answer. Each add is O(log k).",
  solutions: [solution],
};
