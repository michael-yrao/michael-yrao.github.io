import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced from cse-review: dsa/leetcode/heap/703_kth_largest_element_in_stream.py
const PYTHON_CODE = `import heapq

class KthLargest:

    def __init__(self, k: int, nums: List[int]):
        self.k = k
        self.heap = []
        # heap by default is minheap so what we should do is create a minheap
        # of size k so that the smallest value is our return value
        for n in nums:
            heapq.heappush(self.heap,n)
            while len(self.heap) > self.k:
                heapq.heappop(self.heap)

    def add(self, val: int) -> int:
        # adds a value to nums and returns kth largest
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)
        return self.heap[0]`;

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
    highlightLine: 8,
    state: snap([]),
    variables: [{ name: 'k', value: k }, { name: 'nums', value: `[${initNums.join(', ')}]` }],
  });

  for (const n of initNums) {
    heap.push(n);
    heap.sort((a, b) => a - b);
    steps.push({
      explanation: `Constructor: push ${n} → [${heap.join(', ')}] (size ${heap.length}).`,
      highlightLine: 11,
      state: snap([heap.indexOf(n)]),
      variables: [{ name: 'pushed', value: n, highlight: true }, { name: 'size', value: heap.length }],
    });
    if (heap.length > k) {
      const popped = heap[0];
      heap = heap.slice(1);
      steps.push({
        explanation: `Size ${heap.length + 1} > k=${k} → pop the smallest (${popped}); it's not in the top ${k}. → [${heap.join(', ')}].`,
        highlightLine: 13,
        state: snap([]),
        variables: [{ name: 'popped', value: popped, highlight: true }, { name: 'size', value: heap.length }],
      });
    }
  }

  steps.push({
    explanation: `Constructor done. minHeap = [${heap.join(', ')}]; the top (${heap[0]}) is the ${k}th largest so far.`,
    highlightLine: 13,
    state: snap([0]),
    variables: [{ name: 'kth largest', value: heap[0], highlight: true }],
  });

  for (const val of adds) {
    heap.push(val);
    heap.sort((a, b) => a - b);
    steps.push({
      explanation: `add(${val}): push ${val} → [${heap.join(', ')}] (size ${heap.length}).`,
      highlightLine: 17,
      state: snap([heap.indexOf(val)]),
      variables: [{ name: 'val', value: val, highlight: true }, { name: 'size', value: heap.length }],
    });
    if (heap.length > k) {
      const popped = heap[0];
      heap = heap.slice(1);
      steps.push({
        explanation: `Size ${heap.length + 1} > k=${k} → pop the smallest (${popped}) → [${heap.join(', ')}].`,
        highlightLine: 19,
        state: snap([]),
        variables: [{ name: 'popped', value: popped }, { name: 'size', value: heap.length }],
      });
    }
    steps.push({
      explanation: `Return heap[0] = ${heap[0]} — the ${k}th largest after adding ${val}.`,
      highlightLine: 20,
      state: snap([0]),
      variables: [{ name: 'return', value: heap[0], highlight: true }],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Min-Heap (size k)',
  pythonCode: PYTHON_CODE,
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
