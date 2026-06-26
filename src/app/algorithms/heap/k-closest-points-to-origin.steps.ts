import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Solution + comments sourced from cse-review: dsa/leetcode/heap/973_k_closest_points_to_origin.py
const PYTHON_CODE = `import heapq
import math

class Solution:
    def kClosest(self, points: List[List[int]], k: int) -> List[List[int]]:

        def euclideanDistance(origin, destination):
            x1, y1 = origin[0], origin[1]
            x2, y2 = destination[0], destination[1]

            return math.sqrt(((x2 - x1)**2 + (y2 - y1)**2))

        # we want the kth smallest so that means we should have a max heap
        # a max heap of size k
        # we need to store distance -> (x,y) in the heap

        maxHeap = []

        for x, y in points:
            dist = euclideanDistance((x,y),(0,0))
            heapq.heappush(maxHeap, (-dist,(x,y)))
            while len(maxHeap) > k:
                heapq.heappop(maxHeap)

        result = []

        while maxHeap:
            currentCoordinate = heapq.heappop(maxHeap)[1]
            result.append((currentCoordinate[0],currentCoordinate[1]))

        return result`;

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
      { label: 'maxHeap (farthest on top)', value: heapStr() },
    ],
  });

  steps.push({
    explanation: `Keep a MAX-heap of size k, keyed by distance from the origin. The farthest of the current k sits on top, so when a closer point arrives we evict the farthest. What survives is the k closest. (Python pushes (−dist, point) into a min-heap to mimic a max-heap.)`,
    highlightLine: 13,
    state: snap(null),
    variables: [{ name: 'k', value: k }, { name: 'points', value: points.map(ptStr).join(', ') }],
  });

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    heap.push(p);
    heap.sort((a, b) => d2(b) - d2(a));
    steps.push({
      explanation: `Point ${ptStr(p)}: distance = √(${p[0]}² + ${p[1]}²) = ${dist(p)}. Push it onto the heap (size ${heap.length}).`,
      highlightLine: 21,
      state: snap(i),
      variables: [
        { name: 'point', value: ptStr(p), highlight: true },
        { name: 'dist', value: dist(p) },
        { name: 'heap size', value: heap.length },
      ],
    });
    if (heap.length > k) {
      const evicted = heap[0];
      heap = heap.slice(1);
      steps.push({
        explanation: `Heap size ${heap.length + 1} > k=${k} → pop the farthest: ${ptStr(evicted)} (d=${dist(evicted)}). It can't be among the ${k} closest, so discard it.`,
        highlightLine: 23,
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
    highlightLine: 31,
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
  pythonCode: PYTHON_CODE,
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
