import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generators ──────────────────────────────────────────────────────────
//
// prefix-arrays traces cse-progress's trap verbatim: leftMax/rightMax arrays built in two
// passes, then a third pass computes currentWater = max(0, min(leftMax[i],rightMax[i]) -
// height[i]) and accumulates it into totalWater on the fly — no water[] array is kept.
//
// two-pointers traces trapTwoPointer verbatim: l/r start at the ends, leftMax/rightMax seed
// from height[l]/height[r]; while leftMax < rightMax the left side is the bottleneck (l
// advances first, then leftMax updates, then res accumulates); otherwise the right side is
// (symmetric). `if not height: return 0` guards the empty case up front.

function generatePrefixSteps(): Step[] {
  const height = [0, 1, 0, 2, 1, 0, 2, 1];
  const n = height.length;
  const leftMax = Array(n).fill(0);
  const rightMax = Array(n).fill(0);
  const steps: Step[] = [];

  steps.push({
    explanation:
      'leftMax = [0]*len(height), rightMax = [0]*len(height), totalWater = 0. Build leftMax and rightMax in two passes, then accumulate currentWater = max(0, min(leftMax[i],rightMax[i]) - height[i]) into totalWater in a third pass — no water[] array is kept.',
    anchor: { match: 'leftMax = [0] * len(height)', to: { match: 'totalWater = 0' } },
    state: {
      type: 'array',
      cells: height.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'leftMax', value: `[${leftMax.join(', ')}]` },
        { label: 'rightMax', value: `[${rightMax.join(', ')}]` },
      ],
    },
    variables: [{ name: 'height', value: `[${height.join(', ')}]` }],
  });

  // Build leftMax
  for (let i = 1; i < n; i++) {
    leftMax[i] = Math.max(leftMax[i - 1], height[i - 1]);
    steps.push({
      explanation: `leftMax[${i}] = max(leftMax[${i - 1}]=${leftMax[i - 1]}, height[${i - 1}]=${height[i - 1]}) = ${leftMax[i]}.`,
      anchor: { match: 'for i in range(1,len(height)):', to: { match: 'leftMax[i] = max(leftMax[i-1], height[i-1])' } },
      state: {
        type: 'array',
        cells: leftMax.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'height', value: `[${height.join(', ')}]` },
          { label: 'rightMax', value: `[${rightMax.join(', ')}]` },
        ],
      },
      variables: [
        { name: 'i', value: i },
        { name: `leftMax[${i}]`, value: leftMax[i], highlight: true },
      ],
    });
  }

  // Build rightMax
  for (let i = n - 2; i >= 0; i--) {
    rightMax[i] = Math.max(rightMax[i + 1], height[i + 1]);
    steps.push({
      explanation: `rightMax[${i}] = max(rightMax[${i + 1}]=${rightMax[i + 1]}, height[${i + 1}]=${height[i + 1]}) = ${rightMax[i]}.`,
      anchor: { match: 'for i in range(len(height)-2,-1,-1):', to: { match: 'rightMax[i] = max(rightMax[i+1],height[i+1])' } },
      state: {
        type: 'array',
        cells: rightMax.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j > i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'height', value: `[${height.join(', ')}]` },
          { label: 'leftMax', value: `[${leftMax.join(', ')}]` },
        ],
      },
      variables: [
        { name: 'i', value: i },
        { name: `rightMax[${i}]`, value: rightMax[i], highlight: true },
      ],
    });
  }

  // Accumulate totalWater
  let totalWater = 0;
  const rendered = [...height];
  for (let i = 0; i < n; i++) {
    const currentWater = Math.max(0, Math.min(leftMax[i], rightMax[i]) - height[i]);
    totalWater += currentWater;
    rendered[i] = currentWater;
    steps.push({
      explanation: `i=${i}: currentWater = max(0, min(leftMax[i]=${leftMax[i]}, rightMax[i]=${rightMax[i]}) - height[i]=${height[i]}) = ${currentWater}. totalWater += currentWater → ${totalWater}.`,
      anchor: { match: 'for i in range(len(height)):', to: { match: 'totalWater += currentWater' } },
      state: {
        type: 'array',
        cells: height.map((v, j) => ({
          value: j <= i ? rendered[j] : v,
          state: j < i ? (rendered[j] > 0 ? ('found' as const) : ('visited' as const)) : j === i ? ('active' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'leftMax', value: `[${leftMax.join(', ')}]` },
          { label: 'rightMax', value: `[${rightMax.join(', ')}]` },
          { label: 'totalWater', value: totalWater },
        ],
      },
      variables: [
        { name: 'i', value: i },
        { name: 'currentWater', value: currentWater, highlight: true },
        { name: 'totalWater', value: totalWater, highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `Return totalWater = ${totalWater}. O(n) time, O(n) space for the two auxiliary arrays.`,
    anchor: { match: 'return totalWater' },
    state: {
      type: 'array',
      cells: rendered.map((v) => ({ value: v, state: v > 0 ? ('found' as const) : ('eliminated' as const) })),
      pointers: [],
      counters: [
        { label: 'leftMax', value: `[${leftMax.join(', ')}]` },
        { label: 'rightMax', value: `[${rightMax.join(', ')}]` },
        { label: 'totalWater', value: totalWater },
      ],
    },
    variables: [{ name: 'return', value: totalWater, highlight: true }],
  });

  return steps;
}

function generateTwoPointerSteps(): Step[] {
  const height = [0, 1, 0, 2, 1, 0, 2, 1];
  const steps: Step[] = [];
  let l = 0;
  let r = height.length - 1;
  let leftMax = height[l];
  let rightMax = height[r];
  let res = 0;

  steps.push({
    explanation:
      'if not height: return 0 guards the empty case. l, r = 0, len(height)-1; leftMax, rightMax = height[l], height[r]; res = 0. While leftMax < rightMax the left side is the bottleneck; otherwise the right side is — that running max IS the potential water at the side that moves.',
    anchor: { match: 'l, r = 0, len(height) - 1', to: { match: 'res = 0' } },
    state: {
      type: 'array',
      cells: height.map((v, i) => ({
        value: v,
        state: i === l ? ('active' as const) : i === r ? ('min-ptr' as const) : ('default' as const),
      })),
      pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
      counters: [
        { label: 'leftMax', value: leftMax },
        { label: 'rightMax', value: rightMax },
        { label: 'res', value: res },
      ],
    },
    variables: [
      { name: 'l', value: l },
      { name: 'r', value: r },
      { name: 'leftMax', value: leftMax },
      { name: 'rightMax', value: rightMax },
    ],
  });

  while (l < r) {
    if (leftMax < rightMax) {
      l++;
      leftMax = Math.max(leftMax, height[l]);
      res += leftMax - height[l];
      steps.push({
        explanation: `leftMax(${leftMax}) < rightMax(${rightMax}): left side is the bottleneck. l+=1 → ${l}. leftMax = max(leftMax, height[l]) = ${leftMax}. res += leftMax - height[l] = ${leftMax}-${height[l]} → res=${res}.`,
        anchor: { match: 'if leftMax < rightMax:', to: { match: 'res += leftMax - height[l]' } },
        state: {
          type: 'array',
          cells: height.map((v, i) => ({
            value: v,
            state:
              i < l
                ? ('visited' as const)
                : i === l
                ? ('active' as const)
                : i === r
                ? ('min-ptr' as const)
                : i > r
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
          counters: [
            { label: 'leftMax', value: leftMax },
            { label: 'rightMax', value: rightMax },
            { label: 'res', value: res },
          ],
        },
        variables: [
          { name: 'l', value: l, highlight: true },
          { name: 'leftMax', value: leftMax, highlight: true },
          { name: 'res', value: res, highlight: true },
        ],
      });
    } else {
      r--;
      rightMax = Math.max(rightMax, height[r]);
      res += rightMax - height[r];
      steps.push({
        explanation: `leftMax(${leftMax}) >= rightMax(${rightMax}): right side is the bottleneck. r-=1 → ${r}. rightMax = max(rightMax, height[r]) = ${rightMax}. res += rightMax - height[r] = ${rightMax}-${height[r]} → res=${res}.`,
        anchor: { match: 'else:', to: { match: 'res += rightMax - height[r]' } },
        state: {
          type: 'array',
          cells: height.map((v, i) => ({
            value: v,
            state:
              i < l
                ? ('visited' as const)
                : i === l
                ? ('active' as const)
                : i === r
                ? ('min-ptr' as const)
                : i > r
                ? ('visited' as const)
                : ('default' as const),
          })),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
          counters: [
            { label: 'leftMax', value: leftMax },
            { label: 'rightMax', value: rightMax },
            { label: 'res', value: res },
          ],
        },
        variables: [
          { name: 'r', value: r, highlight: true },
          { name: 'rightMax', value: rightMax, highlight: true },
          { name: 'res', value: res, highlight: true },
        ],
      });
    }
  }

  steps.push({
    explanation: `l(${l}) meets r(${r}) — done. Return res = ${res}. O(n) time, O(1) space — no auxiliary arrays needed.`,
    anchor: { match: 'return res' },
    state: {
      type: 'array',
      cells: height.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [{ index: l, label: 'l=r' }],
      counters: [
        { label: 'leftMax', value: leftMax },
        { label: 'rightMax', value: rightMax },
        { label: 'res', value: res },
      ],
    },
    variables: [{ name: 'return', value: res, highlight: true }],
  });

  return steps;
}

const prefixSolution: SolutionVariant = {
  label: 'Prefix Arrays',
  variant: 'prefix-arrays',
  generateSteps: generatePrefixSteps,
};

const twoPointerSolution: SolutionVariant = {
  label: 'Two Pointers',
  variant: 'two-pointers',
  generateSteps: generateTwoPointerSteps,
};

export const trappingRainWaterMeta: AlgorithmMeta = {
  id: 'trapping-rain-water',
  lcNumber: 42,
  title: 'Trapping Rain Water',
  difficulty: 'Hard',
  category: 'two-pointers',
  tags: ['Array', 'Two Pointers', 'Dynamic Programming'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
  examples: [
    {
      input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]',
      output: '6',
      explanation: 'The elevation map traps 6 units of rain water.',
    },
    {
      input: 'height = [4,2,0,3,2,5]',
      output: '9',
    },
  ] as ProblemExample[],
  constraints: [
    'n == height.length',
    '1 ≤ n ≤ 2 × 10⁴',
    '0 ≤ height[i] ≤ 10⁵',
  ],
  hint: 'Water at index i = min(max height to its left, max height to its right) − height[i]. Precompute those maxes in two arrays (O(n) space), or use two pointers to eliminate the arrays entirely (O(1) space).',
  solutions: [prefixSolution, twoPointerSolution],
};
