import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PREFIX_CODE = `class Solution:
    def trap(self, height: List[int]) -> int:
        # knowing water at each index = min(leftMax, rightMax) - height[i]
        # we need to keep track of leftMax and rightMax of each index
        # leftMax and rightMax stands for the walls for which this current index
        # can trap water

        # height   = [0,1,0,2,1,0,1,3,2,1,2,1]
        # leftMax  = [0,0,1,1,2,2,2,2,3,3,3,3]
        # rightMax = [3,3,3,3,3,3,3,2,2,2,1,0]
        # water    = [0,0,1,0,1,2,1,0,0,1,0,0]

        leftMax = [0] * len(height)
        rightMax = [0] * len(height)
        totalWater = 0

        for i in range(1, len(height)):
            leftMax[i] = max(leftMax[i-1], height[i-1])

        for i in range(len(height)-2, -1, -1):
            rightMax[i] = max(rightMax[i+1], height[i+1])

        for i in range(len(height)):
            currentWater = max(0, min(leftMax[i], rightMax[i]) - height[i])
            totalWater += currentWater

        return totalWater`;

const TWO_PTR_CODE = `class Solution:
    def trap(self, height: List[int]) -> int:
        # water[i] = min(leftMax, rightMax) - height[i]; the smaller side is the bottleneck
        # two pointers: always process the side whose max is smaller — that side's max is the true potential water
        # this lets us compute the running max from each side without storing full leftMax/rightMax arrays

        if not height:
            return 0

        l, r = 0, len(height) - 1
        leftMax, rightMax = height[l], height[r]
        res = 0
        while l < r:
            if leftMax < rightMax:
                l += 1                             # move inward — boundary cells themselves hold no water
                leftMax = max(leftMax, height[l])  # update running max from the left
                res += leftMax - height[l]         # potential water - actual height = trapped water
            else:
                r -= 1
                rightMax = max(rightMax, height[r])
                res += rightMax - height[r]
        return res`;

function generatePrefixSteps(): Step[] {
  const height = [0, 1, 0, 2, 1, 0, 2, 1];
  const n = height.length;
  const leftMax = Array(n).fill(0);
  const rightMax = Array(n).fill(0);
  const steps: Step[] = [];

  steps.push({
    explanation:
      'Water at index i = min(leftMax[i], rightMax[i]) − height[i], where leftMax[i] is the tallest wall to the left and rightMax[i] to the right. Build both arrays in two passes, then compute water in a third.',
    highlightLine: 2,
    state: {
      type: 'array',
      cells: height.map(v => ({ value: v, state: 'default' as const })),
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
      explanation: `leftMax[${i}] = max(leftMax[${i - 1}]=${leftMax[i - 1] - (leftMax[i] !== leftMax[i - 1] ? (leftMax[i] - leftMax[i - 1]) : 0)}, height[${i - 1}]=${height[i - 1]}) = ${leftMax[i]}.`,
      highlightLine: 6,
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
      highlightLine: 8,
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

  // Compute water
  let total = 0;
  const water = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    water[i] = Math.max(0, Math.min(leftMax[i], rightMax[i]) - height[i]);
    total += water[i];
    steps.push({
      explanation: `i=${i}: min(leftMax=${leftMax[i]}, rightMax=${rightMax[i]}) − height=${height[i]} = ${water[i]} unit${water[i] !== 1 ? 's' : ''} of water. Running total: ${total}.`,
      highlightLine: 11,
      state: {
        type: 'array',
        cells: height.map((v, j) => ({
          value: j <= i ? water[j] : v,
          state: j < i ? (water[j] > 0 ? ('found' as const) : ('visited' as const)) : j === i ? ('active' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'leftMax', value: `[${leftMax.join(', ')}]` },
          { label: 'rightMax', value: `[${rightMax.join(', ')}]` },
          { label: 'total', value: total },
        ],
      },
      variables: [
        { name: 'i', value: i },
        { name: `water[${i}]`, value: water[i], highlight: true },
        { name: 'total', value: total, highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `Total trapped water = ${total}. O(n) time, O(n) space for the two auxiliary arrays.`,
    highlightLine: 12,
    state: {
      type: 'array',
      cells: water.map(v => ({
        value: v,
        state: v > 0 ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      counters: [
        { label: 'leftMax', value: `[${leftMax.join(', ')}]` },
        { label: 'rightMax', value: `[${rightMax.join(', ')}]` },
        { label: 'total', value: total },
      ],
    },
    variables: [{ name: 'return', value: total, highlight: true }],
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
      'Key insight: water at i is bounded by the shorter wall. We only need the running max from each side, not the full arrays. Two pointers l and r move inward — always process the side with the smaller max, since that side is the bottleneck.',
    highlightLine: 3,
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
        explanation: `leftMax(${leftMax}) < rightMax(${rightMax}): left side is bottleneck. Move l to ${l}. leftMax=max(${leftMax},${height[l]})=${leftMax}. water += ${leftMax}-${height[l]}=${leftMax - height[l]}. res=${res}.`,
        highlightLine: 8,
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
          { name: 'water', value: leftMax - height[l] },
          { name: 'res', value: res, highlight: true },
        ],
      });
    } else {
      r--;
      rightMax = Math.max(rightMax, height[r]);
      res += rightMax - height[r];
      steps.push({
        explanation: `leftMax(${leftMax}) >= rightMax(${rightMax}): right side is bottleneck. Move r to ${r}. rightMax=max(${rightMax},${height[r]})=${rightMax}. water += ${rightMax}-${height[r]}=${rightMax - height[r]}. res=${res}.`,
        highlightLine: 11,
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
          { name: 'water', value: rightMax - height[r] },
          { name: 'res', value: res, highlight: true },
        ],
      });
    }
  }

  steps.push({
    explanation: `l(${l}) meets r(${r}) — done. Total = ${res}. O(n) time, O(1) space — no auxiliary arrays needed.`,
    highlightLine: 13,
    state: {
      type: 'array',
      cells: height.map((_, i) => ({
        value: height[i],
        state: ('found' as const),
      })),
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
  pythonCode: PREFIX_CODE,
  generateSteps: generatePrefixSteps,
};

const twoPointerSolution: SolutionVariant = {
  label: 'Two Pointers',
  pythonCode: TWO_PTR_CODE,
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
