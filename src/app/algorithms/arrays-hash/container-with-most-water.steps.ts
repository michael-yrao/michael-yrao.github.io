import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's maxArea verbatim: areaHeight/areaWidth/currentMaxArea
// computed as separate named steps before folding into maxArea, then move the
// shorter wall (`if height[l] < height[r]: l += 1 else: r -= 1`).

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
    anchor: { match: 'def maxArea(self, height: List[int]) -> int:' },
    state: {
      type: 'array',
      cells: height.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [{ label: 'maxArea', value: 0 }],
    },
    variables: [{ name: 'height', value: `[${height.join(',')}]` }],
  });

  let l = 0;
  let r = height.length - 1;
  let maxArea = 0;
  let bestL = 0;
  let bestR = height.length - 1;

  while (l < r) {
    const areaHeight = Math.min(height[l], height[r]);
    const areaWidth = r - l;
    const currentMaxArea = areaHeight * areaWidth;
    const previousMaxArea = maxArea;
    const improved = currentMaxArea > previousMaxArea;
    if (improved) {
      maxArea = currentMaxArea;
      bestL = l;
      bestR = r;
    }

    steps.push({
      explanation: `l=${l}(h=${height[l]}), r=${r}(h=${height[r]}): areaHeight = min(${height[l]},${height[r]}) = ${areaHeight}. areaWidth = ${r} − ${l} = ${areaWidth}. currentMaxArea = ${areaHeight} × ${areaWidth} = ${currentMaxArea}. maxArea = max(${previousMaxArea}, ${currentMaxArea}) = ${maxArea}${improved ? ' ← new best!' : ''}. Move ${height[l] < height[r] ? 'l (shorter wall)' : 'r (shorter or equal wall)'} inward.`,
      anchor: {
        match: 'areaHeight = min(height[l], height[r])',
        to: { match: height[l] < height[r] ? 'l += 1' : 'r -= 1' },
      },
      state: {
        type: 'array',
        cells: snap(l, r, bestL, bestR),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        counters: [{ label: 'maxArea', value: maxArea }],
      },
      variables: [
        { name: 'areaHeight', value: areaHeight },
        { name: 'areaWidth', value: areaWidth },
        { name: 'currentMaxArea', value: currentMaxArea, highlight: improved },
        { name: 'maxArea', value: maxArea },
      ],
    });

    if (height[l] < height[r]) {
      l++;
    } else {
      r--;
    }
  }

  steps.push({
    explanation: `l(${l}) met r(${r}). Best container: walls at indices ${bestL} and ${bestR} (heights ${height[bestL]}, ${height[bestR]}), maxArea = ${maxArea}. O(n) time, O(1) space.`,
    // nth: 2 — hit 1 is the leading "# return maxArea" plan comment; hit 2 is the actual `return maxArea` statement.
    anchor: { match: 'return maxArea', nth: 2 },
    state: {
      type: 'array',
      cells: height.map((v, i) => ({
        value: v,
        state: i === bestL || i === bestR ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      counters: [{ label: 'maxArea', value: maxArea }],
    },
    variables: [{ name: 'return', value: maxArea, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointers',
  variant: 'two-pointers',
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
