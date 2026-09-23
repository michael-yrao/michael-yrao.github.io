import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's lastStoneWeight_20260726 verbatim: both pops are unconditional
// (the loop condition `len(maxHeap) > 1` already guarantees a second element, so there's
// no separate empty-heap guard), the diff is `abs(firstStone - secondStone)` (both popped
// values are still negative — heapq.heappop returns the raw negated entries, no `-` at pop
// time), and the final check is `if not maxHeap: return 0` else `return -heapq.heappop(maxHeap)`
// — a pop, not a peek.

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
    explanation: `Push −stone for every stone, so heapq's min-heap holds the negated weights and the heaviest stone is always at index 0. maxHeap = [${heap.join(', ')}] (shown here as the positive weights).`,
    anchor: { match: 'heapq.heappush(maxHeap, -stone)' },
    state: snap([]),
    variables: [{ name: 'stones', value: `[${stones.join(', ')}]` }, { name: 'maxHeap', value: `[${heap.join(', ')}]` }],
  });

  while (heap.length > 1) {
    const first = heap[0];
    const second = heap[1];
    steps.push({
      explanation: `The loop condition already guarantees a second element, so both pops are unconditional: firstStone=${first}, secondStone=${second} (heapq.heappop returns the raw negated entries — internally −${first} and −${second}).`,
      anchor: { match: 'firstStone = heapq.heappop(maxHeap)', to: { match: 'secondStone = heapq.heappop(maxHeap)' } },
      state: snap([0, 1]),
      variables: [
        { name: 'firstStone', value: first, highlight: true },
        { name: 'secondStone', value: second, highlight: true },
      ],
    });

    heap = heap.slice(2);
    const diff = Math.abs(first - second);
    if (diff !== 0) {
      heap.push(diff);
      heap.sort((a, b) => b - a);
      steps.push({
        explanation: `abs(firstStone − secondStone) = abs(${first} − ${second}) = ${diff} ≠ 0 → push −${diff} back onto the heap (shown here as ${diff}) → [${heap.join(', ')}].`,
        anchor: { match: 'abs(firstStone - secondStone) != 0', to: { match: 'heapq.heappush(maxHeap, -abs(firstStone - secondStone))' } },
        state: snap([heap.indexOf(diff)]),
        variables: [{ name: 'diff (abs)', value: diff, highlight: true }, { name: 'maxHeap', value: `[${heap.join(', ')}]` }],
      });
    } else {
      steps.push({
        explanation: `abs(firstStone − secondStone) = 0 → equal weights, both stones are destroyed. The if is false, so nothing is pushed back → [${heap.join(', ')}].`,
        anchor: { match: 'abs(firstStone - secondStone) != 0' },
        state: snap([]),
        variables: [{ name: 'diff (abs)', value: 0 }, { name: 'maxHeap', value: `[${heap.join(', ')}]` }],
      });
    }
  }

  const isEmpty = heap.length === 0;
  const result = isEmpty ? 0 : heap[0];
  steps.push({
    explanation: isEmpty
      ? `maxHeap is empty → return 0.`
      : `maxHeap still holds 1 stone → return −heapq.heappop(maxHeap) = ${result}. This pops the last entry (not a peek). Each smash is O(log n) and there are O(n) smashes → O(n log n).`,
    anchor: isEmpty
      ? { match: 'if not maxHeap:', to: { match: 'return 0' } }
      : { match: 'return -heapq.heappop(maxHeap)' },
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
  variant: 'max-heap',
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
