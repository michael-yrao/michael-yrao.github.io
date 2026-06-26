import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced from cse-review: dsa/leetcode/heap/1046_last_stone_weight.py
const PYTHON_CODE = `import heapq

class Solution:
    def lastStoneWeight(self, stones: List[int]) -> int:
        # go through the list and heapify the array as a max heap
        # pop twice to smash, if diff is not zero, insert diff into heap
        # continue until we are left with heap of size 1 or less

        maxHeap = []

        for stone in stones:
            # must push negative since python heap is minHeap by default
            heapq.heappush(maxHeap, -stone)

        # we want to stop the loop when we only have 1 stone or 0 stone left
        while len(maxHeap) > 1:
            firstStone = -heapq.heappop(maxHeap)
            secondStone = 0
            if len(maxHeap) > 0:
                secondStone = -heapq.heappop(maxHeap)
            diff = firstStone - secondStone
            if diff != 0:
                heapq.heappush(maxHeap, -diff)

        if len(maxHeap) == 1:
            return -maxHeap[0]
        return 0`;

function generateSteps(): Step[] {
  const stones = [2, 7, 4, 1, 8, 1];
  const steps: Step[] = [];
  // Represent the max-heap as a descending-sorted array (Python negates into a
  // min-heap; conceptually it's a max-heap — the two heaviest are always on top).
  let heap = [...stones].sort((a, b) => b - a);

  const snap = (activeIdx: number[], doneIdx: number[] = []) => ({
    type: 'array' as const,
    cells: heap.map((v, i) => ({
      value: v,
      state: activeIdx.includes(i) ? ('active' as const) : doneIdx.includes(i) ? ('found' as const) : ('default' as const),
    })),
    pointers: [],
    counters: [{ label: 'heap size', value: heap.length }],
  });

  steps.push({
    explanation: `Heapify the stones into a max-heap so the two heaviest are always on top. (Python's heapq is a min-heap, so it pushes −stone; we show the conceptual max-heap as a descending list.) maxHeap = [${heap.join(', ')}].`,
    highlightLine: 10,
    state: snap([]),
    variables: [{ name: 'stones', value: `[${stones.join(', ')}]` }, { name: 'maxHeap', value: `[${heap.join(', ')}]` }],
  });

  while (heap.length > 1) {
    const first = heap[0];
    const second = heap[1];
    steps.push({
      explanation: `Pop the two heaviest stones: y=${first} and x=${second}. Smash them together.`,
      highlightLine: 17,
      state: snap([0, 1]),
      variables: [
        { name: 'firstStone (y)', value: first, highlight: true },
        { name: 'secondStone (x)', value: second, highlight: true },
      ],
    });

    heap = heap.slice(2);
    const diff = first - second;
    if (diff !== 0) {
      heap.push(diff);
      heap.sort((a, b) => b - a);
      steps.push({
        explanation: `${first} − ${second} = ${diff} ≠ 0 → the heavier stone survives with weight ${diff}. Push ${diff} back into the heap → [${heap.join(', ')}].`,
        highlightLine: 23,
        state: snap([heap.indexOf(diff)]),
        variables: [{ name: 'diff', value: diff, highlight: true }, { name: 'maxHeap', value: `[${heap.join(', ')}]` }],
      });
    } else {
      steps.push({
        explanation: `${first} − ${second} = 0 → equal weights, both stones are destroyed. Nothing pushed back → [${heap.join(', ')}].`,
        highlightLine: 22,
        state: snap([]),
        variables: [{ name: 'diff', value: 0 }, { name: 'maxHeap', value: `[${heap.join(', ')}]` }],
      });
    }
  }

  const result = heap.length === 1 ? heap[0] : 0;
  steps.push({
    explanation: `Heap has ${heap.length} stone(s) left. Return ${result}. Each smash is O(log n) (heap push/pop) and there are O(n) smashes → O(n log n).`,
    highlightLine: heap.length === 1 ? 26 : 27,
    state: {
      type: 'array',
      cells: heap.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [{ label: 'result', value: result }],
    },
    variables: [{ name: 'return', value: result, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Max-Heap',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(n)',
};

export const lastStoneWeightMeta: AlgorithmMeta = {
  id: 'last-stone-weight',
  lcNumber: 1046,
  title: 'Last Stone Weight',
  difficulty: 'Easy',
  category: 'heap',
  tags: ['Heap', 'Priority Queue', 'Array'],
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(n)',
  description:
    'You are given an array of stones where stones[i] is the weight of the ith stone. Each turn, smash the two heaviest stones together: if equal, both are destroyed; otherwise the lighter is destroyed and the heavier becomes their difference. Return the weight of the last remaining stone, or 0 if none remain.',
  examples: [
    {
      input: 'stones = [2,7,4,1,8,1]',
      output: '1',
      explanation: 'Smash 8&7→1 → [2,4,1,1,1]; 4&2→2 → [2,1,1,1]; 2&1→1 → [1,1,1]; 1&1→0 → [1]. Last stone = 1.',
    },
    { input: 'stones = [1]', output: '1' },
  ] as ProblemExample[],
  constraints: ['1 ≤ stones.length ≤ 30', '1 ≤ stones[i] ≤ 1000'],
  hint: 'You repeatedly need the two largest elements. What data structure gives you the max in O(log n) per removal? Use a max-heap; push the difference back when the two heaviest differ.',
  solutions: [solution],
};
