import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Placeholder for a `result` slot not yet appended — result starts empty and
// grows one `.append()` at a time, so an unfilled slot is never really a 0.
const UNFILLED_SLOT = '·';

// ── Solution 1: Prefix & Suffix ──────────────────────────────────────────────
//
// Traces cse-progress's productExceptSelf_20260724 verbatim: lenNums,
// prefixProduct, postfixProduct (not prefix/suffix), and result STARTS EMPTY
// and is built with `.append(product)` in the final loop — not a preallocated
// array written by index.

function generateSteps(): Step[] {
  const nums = [1, 2, 3, 4];
  const n = nums.length;
  const prefixProduct = Array(n).fill(1);
  const postfixProduct = Array(n).fill(1);
  const steps: Step[] = [];

  // ── Intro ──────────────────────────────────────────────────────
  steps.push({
    explanation:
      'No division allowed. Key insight: result[i] = (product of everything to the left of i) × (product of everything to the right of i). Build prefixProduct and postfixProduct arrays, then multiply them into result.',
    anchor: { match: 'lenNums = len(nums)', to: { match: 'postfixProduct = [1] * lenNums' } },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'prefixProduct', value: '[1, 1, 1, 1]' },
        { label: 'postfixProduct', value: '[1, 1, 1, 1]' },
      ],
    },
    variables: [
      { name: 'nums', value: `[${nums.join(', ')}]` },
    ],
  });

  // ── Build prefixProduct ───────────────────────────────────────────────
  for (let i = 1; i < n; i++) {
    prefixProduct[i] = prefixProduct[i - 1] * nums[i - 1];
    steps.push({
      explanation: `prefixProduct[${i}] = prefixProduct[${i - 1}] × nums[${i - 1}] = ${prefixProduct[i - 1]} × ${nums[i - 1]} = ${prefixProduct[i]}. This is the product of all elements strictly to the LEFT of index ${i}.`,
      anchor: { match: 'prefixProduct[i] = prefixProduct[i-1] * nums[i-1]' },
      state: {
        type: 'array',
        cells: prefixProduct.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'nums', value: `[${nums.join(', ')}]` },
          { label: 'postfixProduct', value: '[1, 1, 1, 1]' },
        ],
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: `prefixProduct[${i}]`, value: prefixProduct[i], highlight: true },
      ],
    });
  }

  // ── Build postfixProduct ───────────────────────────────────────────────
  for (let i = n - 2; i >= 0; i--) {
    postfixProduct[i] = postfixProduct[i + 1] * nums[i + 1];
    steps.push({
      explanation: `postfixProduct[${i}] = postfixProduct[${i + 1}] × nums[${i + 1}] = ${postfixProduct[i + 1]} × ${nums[i + 1]} = ${postfixProduct[i]}. This is the product of all elements strictly to the RIGHT of index ${i}.`,
      anchor: { match: 'postfixProduct[i] = postfixProduct[i+1] * nums[i+1]' },
      state: {
        type: 'array',
        cells: postfixProduct.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j > i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'nums', value: `[${nums.join(', ')}]` },
          { label: 'prefixProduct', value: `[${prefixProduct.join(', ')}]` },
        ],
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: `postfixProduct[${i}]`, value: postfixProduct[i], highlight: true },
      ],
    });
  }

  // ── Build result (starts empty, appended to) ────────────────────────────
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    const product = prefixProduct[i] * postfixProduct[i];
    result.push(product);
    steps.push({
      explanation: `product = prefixProduct[${i}] × postfixProduct[${i}] = ${prefixProduct[i]} × ${postfixProduct[i]} = ${product}. result.append(product) → [${result.join(', ')}].`,
      anchor: { match: 'product = prefixProduct[i] * postfixProduct[i]', to: { match: 'result.append(product)' } },
      state: {
        type: 'array',
        cells: nums.map((_, j) => ({
          value: j < result.length ? result[j] : UNFILLED_SLOT,
          state: j === i ? ('active' as const) : j < i ? ('found' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        counters: [
          { label: 'prefixProduct', value: `[${prefixProduct.join(', ')}]` },
          { label: 'postfixProduct', value: `[${postfixProduct.join(', ')}]` },
        ],
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: `prefixProduct[${i}]`, value: prefixProduct[i] },
        { name: `postfixProduct[${i}]`, value: postfixProduct[i] },
        { name: 'product', value: product, highlight: true },
      ],
    });
  }

  // ── Final ──────────────────────────────────────────────────────
  steps.push({
    explanation: `Result: [${result.join(', ')}]. Each value is the product of every other element, computed in O(n) time with no division.`,
    anchor: { match: 'return result' },
    state: {
      type: 'array',
      cells: result.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'prefixProduct', value: `[${prefixProduct.join(', ')}]` },
        { label: 'postfixProduct', value: `[${postfixProduct.join(', ')}]` },
      ],
    },
    variables: [
      { name: 'result', value: `[${result.join(', ')}]`, highlight: true },
    ],
  });

  return steps;
}

const prefixSuffixSolution: SolutionVariant = {
  label: 'Prefix & Suffix',
  variant: 'prefix-suffix',
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
};

// ── Solution 2: O(1) extra space (store prefix in result, then multiply suffix) ──
//
// Traces cse-progress's productExceptSelfPrefixSumEfficient verbatim:
// result, prefix, suffix — identical variable names, two passes.

function generateStepsEfficient(): Step[] {
  const nums = [1, 2, 3, 4];
  const n = nums.length;
  const steps: Step[] = [];
  const result = Array(n).fill(1);
  let prefix = 1;
  let suffix = 1;

  const snap = (active: number | null, isDone: (i: number) => boolean) => ({
    type: 'array' as const,
    cells: result.map((v, i) => ({
      value: v,
      state: i === active ? ('active' as const) : isDone(i) ? ('visited' as const) : ('default' as const),
    })),
    pointers: active !== null ? [{ index: active, label: 'i' }] : [],
    counters: [
      { label: 'prefix', value: prefix },
      { label: 'suffix', value: suffix },
    ],
  });

  steps.push({
    explanation:
      "Follow-up: O(1) extra space. The output array doesn't count, so we reuse it. Pass 1 fills result[i] with the product of everything to the LEFT (a running prefix). Pass 2 multiplies in the product of everything to the RIGHT (a running suffix). Just two scalar variables — no prefix/suffix arrays.",
    anchor: { match: 'result = [1] * len(nums)', to: { match: 'prefix = suffix = 1' } },
    state: snap(null, () => false),
    variables: [
      { name: 'result', value: `[${result.join(', ')}]` },
      { name: 'prefix', value: 1 },
      { name: 'suffix', value: 1 },
    ],
  });

  for (let i = 0; i < n; i++) {
    const old = prefix;
    result[i] = prefix;
    prefix *= nums[i];
    steps.push({
      explanation: `Pass 1, i=${i}: result[${i}] = prefix = ${old} (product of everything left of index ${i}). Then prefix ×= nums[${i}]=${nums[i]} → ${prefix}.`,
      anchor: { match: 'result[i] = prefix', to: { match: 'prefix *= nums[i]' } },
      state: snap(i, (j) => j < i),
      variables: [
        { name: 'i', value: i },
        { name: `result[${i}]`, value: result[i], highlight: true },
        { name: 'prefix', value: prefix },
      ],
    });
  }

  steps.push({
    explanation: `After pass 1, result = [${result.join(', ')}] — each cell holds its left-product. Now scan right-to-left with a running suffix starting at 1.`,
    anchor: { match: 'for i in range(len(nums)-1,-1,-1):' },
    state: snap(null, () => true),
    variables: [
      { name: 'result', value: `[${result.join(', ')}]` },
      { name: 'suffix', value: 1 },
    ],
  });

  for (let i = n - 1; i >= 0; i--) {
    const old = suffix;
    result[i] *= suffix;
    suffix *= nums[i];
    steps.push({
      explanation: `Pass 2, i=${i}: result[${i}] ×= suffix = ${old} → ${result[i]} (now folds in the right-product too). Then suffix ×= nums[${i}]=${nums[i]} → ${suffix}.`,
      anchor: { match: 'result[i] *= suffix', to: { match: 'suffix *= nums[i]' } },
      state: snap(i, (j) => j > i),
      variables: [
        { name: 'i', value: i },
        { name: `result[${i}]`, value: result[i], highlight: true },
        { name: 'suffix', value: suffix },
      ],
    });
  }

  steps.push({
    explanation: `Done. result = [${result.join(', ')}]. O(n) time and O(1) extra space — no auxiliary arrays, just the prefix and suffix scalars.`,
    anchor: { match: 'return result' },
    state: {
      type: 'array',
      cells: result.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'prefix', value: prefix },
        { label: 'suffix', value: suffix },
      ],
    },
    variables: [{ name: 'result', value: `[${result.join(', ')}]`, highlight: true }],
  });

  return steps;
}

const efficientSolution: SolutionVariant = {
  label: 'O(1) Space (prefix then suffix)',
  variant: 'o1-space',
  generateSteps: generateStepsEfficient,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
};

export const productOfArrayExceptSelfMeta: AlgorithmMeta = {
  id: 'product-of-array-except-self',
  lcNumber: 238,
  title: 'Product of Array Except Self',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Prefix Sum'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given an integer array nums, return an array answer such that answer[i] is equal to the product of all the elements of nums except nums[i]. The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer. You must write an algorithm that runs in O(n) time and without using the division operation.',
  examples: [
    {
      input: 'nums = [1, 2, 3, 4]',
      output: '[24, 12, 8, 6]',
    },
    {
      input: 'nums = [-1, 1, 0, -3, 3]',
      output: '[0, 0, 9, 0, 0]',
    },
  ] as ProblemExample[],
  constraints: [
    '2 ≤ nums.length ≤ 10⁵',
    '-30 ≤ nums[i] ≤ 30',
    'The product of any prefix or suffix of nums is guaranteed to fit in a 32-bit integer.',
  ],
  hint: 'result[i] needs everything except nums[i]. Split that into "everything to the left" and "everything to the right." Each half can be computed in a single pass.',
  solutions: [prefixSuffixSolution, efficientSolution],
};
