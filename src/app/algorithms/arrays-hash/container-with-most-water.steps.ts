import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def maxArea(self, height: List[int]) -> int:
        l, r = 0, len(height) - 1
        maxWater = 0
        while l < r:
            water = min(height[l], height[r]) * (r - l)
            maxWater = max(maxWater, water)
            if height[l] < height[r]:
                l += 1
            else:
                r -= 1
        return maxWater`;

function generateSteps(): Step[] {
  const height = [1, 8, 6, 2, 5, 4, 8, 3, 7];
  const steps: Step[] = [];

  const snap = (l: number, r: number, bestL: number, bestR: number) =>
    height.map((v, i) => ({
      value: v,
      state:
        (i === bestL || i === bestR) && bestL !== l
          ? ('found' as const)
          : i === l
          ? ('active' as const)
          : i === r
          ? ('min-ptr' as const)
          : i > l && i < r
          ? ('window' as const)
          : ('eliminated' as const),
    }));

  steps.push({
    explanation:
      'Container width = r − l. Height is capped by the shorter wall: min(h[l], h[r]). Always move the shorter wall inward — moving the taller one can only shrink width while keeping the height cap the same or lower, so it can never help.',
    highlightLine: 2,
    state: {
      type: 'array',
      cells: height.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [{ label: 'maxWater', value: 0 }],
    },
    variables: [{ name: 'height', value: `[${height.join(',')}]` }],
  });

  let l = 0;
  let r = height.length - 1;
  let maxWater = 0;
  let bestL = 0;
  let bestR = height.length - 1;

  while (l < r) {
    const water = Math.min(height[l], height[r]) * (r - l);
    const improved = water > maxWater;
    if (improved) {
      maxWater = water;
      bestL = l;
      bestR = r;
    }

    steps.push({
      explanation: `l=${l}(h=${height[l]}), r=${r}(h=${height[r]}): water = min(${height[l]},${height[r]}) × ${r - l} = ${water}. maxWater = ${maxWater}${improved ? ' ← new best!' : ''}. Move ${height[l] < height[r] ? 'l (shorter wall)' : 'r (shorter or equal wall)'} inward.`,
      highlightLine: height[l] < height[r] ? 8 : 10,
      state: {
        type: 'array',
        cells: snap(l, r, bestL, bestR),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        counters: [{ label: 'maxWater', value: maxWater }],
      },
      variables: [
        { name: 'water', value: water, highlight: improved },
        { name: 'maxWater', value: maxWater },
      ],
    });

    if (height[l] < height[r]) {
      l++;
    } else {
      r--;
    }
  }

  steps.push({
    explanation: `l(${l}) met r(${r}). Best container: walls at indices ${bestL} and ${bestR} (heights ${height[bestL]}, ${height[bestR]}), water = ${maxWater}. O(n) time, O(1) space.`,
    highlightLine: 11,
    state: {
      type: 'array',
      cells: height.map((v, i) => ({
        value: v,
        state: i === bestL || i === bestR ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      counters: [{ label: 'maxWater', value: maxWater }],
    },
    variables: [{ name: 'return', value: maxWater, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const containerWithMostWaterMeta: AlgorithmMeta = {
  id: 'container-with-most-water',
  lcNumber: 11,
  title: 'Container With Most Water',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Two Pointers', 'Greedy'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container that holds the most water. Return the maximum amount of water a container can store.',
  examples: [
    {
      input: 'height = [1,8,6,2,5,4,8,3,7]',
      output: '49',
      explanation: 'Lines at index 1 (h=8) and index 8 (h=7): min(8,7)×7 = 49.',
    },
    {
      input: 'height = [1,1]',
      output: '1',
    },
  ] as ProblemExample[],
  constraints: [
    'n == height.length',
    '2 ≤ n ≤ 10⁵',
    '0 ≤ height[i] ≤ 10⁴',
  ],
  hint: 'Start with the widest container (l=0, r=n−1). Moving the taller wall inward can only decrease or maintain width while the height cap stays the same — it can never improve the area. So always move the shorter wall. This guarantees you never miss the optimal pair.',
  solutions: [solution],
};
