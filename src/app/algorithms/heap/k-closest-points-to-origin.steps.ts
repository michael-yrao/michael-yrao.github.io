import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's kClosest_20260703 verbatim: euclideanDistance(x, y) takes the raw
// coordinates directly (not two points), the heap variable is named `heap` (not `maxHeap`),
// and eviction is a `while len(heap) > k` guard run once per point pushed — since the heap
// grows by exactly 1 per iteration, it always pops at most once here.

function generateSteps(): Step[] {
  const points: [number, number][] = [[3, 3], [5, -1], [-2, 4]];
  const k = 2;
  const steps: Step[] = [];
  const d2 = (p: [number, number]) => p[0] * p[0] + p[1] * p[1];
  const dist = (p: [number, number]) => Math.sqrt(d2(p)).toFixed(2);
  const ptStr = (p: [number, number]) => `(${p[0]},${p[1]})`;

  // max-heap kept as a distance-descending array (farthest on top at index 0).
  let heap: [number, number][] = [];
  const inHeap = (p: [number, number]) => heap.some((h) => h[0] === p[0] && h[1] === p[1]);
  const heapStr = () => (heap.length ? heap.map((p) => `${ptStr(p)}:d=${dist(p)}`).join(', ') : '∅');

  const snap = (activeIdx: number | null) => ({
    type: 'array' as const,
    cells: points.map((p, i) => ({
      value: ptStr(p),
      state: i === activeIdx ? ('active' as const) : inHeap(p) ? ('window' as const) : ('default' as const),
    })),
    pointers: activeIdx !== null ? [{ index: activeIdx, label: 'point' }] : [],
    counters: [
      { label: 'k', value: k },
      { label: 'heap (farthest on top)', value: heapStr() },
    ],
  });

  steps.push({
    explanation: `Keep a size-k heap, keyed by distance from the origin. euclideanDistance(x, y) takes the coordinates directly. The farthest of the current k sits on top, so when a closer point arrives we evict the farthest. What survives is the k closest. (Python pushes (−distance, (x,y)) into a min-heap to mimic a max-heap.)`,
    anchor: { match: 'heap = []' },
    state: snap(null),
    variables: [{ name: 'k', value: k }, { name: 'points', value: points.map(ptStr).join(', ') }],
  });

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    heap.push(p);
    heap.sort((a, b) => d2(b) - d2(a));
    steps.push({
      explanation: `Point ${ptStr(p)}: distance = euclideanDistance(${p[0]}, ${p[1]}) = ${dist(p)}. Push (−distance, (x,y)) onto the heap (size ${heap.length}).`,
      anchor: { match: 'heapq.heappush(heap,(-distance, (x,y)))' },
      state: snap(i),
      variables: [
        { name: 'point', value: ptStr(p), highlight: true },
        { name: 'distance', value: dist(p) },
        { name: 'heap size', value: heap.length },
      ],
    });
    if (heap.length > k) {
      const evicted = heap[0];
      heap = heap.slice(1);
      steps.push({
        explanation: `while len(heap) > k: len(heap)=${heap.length + 1} > k=${k} → pop the farthest: ${ptStr(evicted)} (d=${dist(evicted)}). It can't be among the ${k} closest, so discard it. (The heap only ever grows by 1 per point, so this while loop pops at most once here.)`,
        anchor: { match: 'while len(heap) > k:' },
        state: snap(null),
        variables: [
          { name: 'evicted', value: ptStr(evicted), highlight: true },
          { name: 'heap size', value: heap.length },
        ],
      });
    }
  }

  const result = heap.map(ptStr);
  steps.push({
    explanation: `Heap now holds the ${k} closest points: ${heap.map((p) => `${ptStr(p)}(d=${dist(p)})`).join(', ')}. Pop them into the result → [${result.join(', ')}]. O(n log k) time, O(k) space.`,
    anchor: { match: 'while heap:', to: { match: 'result.append([x,y])' } },
    state: {
      type: 'array',
      cells: points.map((p) => ({ value: ptStr(p), state: inHeap(p) ? ('found' as const) : ('eliminated' as const) })),
      pointers: [],
      counters: [{ label: 'result', value: `[${result.join(', ')}]` }],
    },
    variables: [{ name: 'return', value: `[${result.join(', ')}]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Max-Heap (size k)',
  variant: 'max-heap-k',
  generateSteps,
  timeComplexity: 'O(n log k)',
  spaceComplexity: 'O(k)',
};

export const kClosestPointsMeta: AlgorithmMeta = {
  id: 'k-closest-points-to-origin',
  lcNumber: 973,
  title: 'K Closest Points to Origin',
  difficulty: 'Medium',
  category: 'heap',
  tags: ['Heap', 'Priority Queue', 'Math', 'Sorting'],
  timeComplexity: 'O(n log k)',
  spaceComplexity: 'O(k)',
  description:
    'Given an array of points on the X-Y plane and an integer k, return the k closest points to the origin (0, 0), measured by Euclidean distance. The answer may be returned in any order.',
  examples: [
    {
      input: 'points = [[1,3],[-2,2]], k = 1',
      output: '[[-2,2]]',
      explanation: '√8 < √10, so (-2,2) is closer.',
    },
    {
      input: 'points = [[3,3],[5,-1],[-2,4]], k = 2',
      output: '[[3,3],[-2,4]]',
    },
  ] as ProblemExample[],
  constraints: ['1 ≤ k ≤ points.length ≤ 10⁴', '-10⁴ ≤ xi, yi ≤ 10⁴'],
  hint: 'Compare points by distance from the origin (you can skip the square root and compare x²+y²). A size-k max-heap keeps the k smallest distances: when it overflows, pop the largest. O(n log k).',
  solutions: [solution],
};
