import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution: Extended Boyer-Moore ───────────────────────────────────────────
//
// Traces cse-progress's majorityElementBoyerMoore verbatim: freqMap increments
// FIRST, then `if len(freqMap) <= 2: continue` (skip eviction while there are
// at most 2 candidates); only past that continue does it decrement every
// candidate via `for n, count in freqMap.items(): freqMap[n] = count - 1` and
// evict zeros via a second `for n in list(freqMap):` pass. Verification
// re-counts from nums against minSize = len(nums)//3.

function generateSteps(): Step[] {
  const nums = [1, 1, 1, 3, 3, 2, 2, 2];
  const minSize = Math.floor(nums.length / 3);
  const steps: Step[] = [];
  const freqMap: Record<number, number> = {};

  steps.push({
    explanation:
      'At most 2 elements can appear more than ⌊n/3⌋ times. Extended Boyer-Moore: maintain a map of at most 2 candidates. When a 3rd distinct value appears, decrement every candidate\'s count and evict any that hit zero. The survivors are potential majority elements — verify them in a second pass against minSize = len(nums)//3.',
    anchor: { match: 'minSize = len(nums)//3', to: { match: 'freqMap = defaultdict(int)' } },
    state: {
      type: 'array',
      cells: nums.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [{ name: 'minSize', value: minSize }],
  });

  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    freqMap[n] = (freqMap[n] ?? 0) + 1;

    const mapSnapshot = () => ({ ...freqMap });

    if (Object.keys(freqMap).length <= 2) {
      steps.push({
        explanation: `i=${i}, n=${n}: freqMap[${n}] = ${freqMap[n]}. len(freqMap) = ${Object.keys(freqMap).length} ≤ 2 → continue (skip the decrement/evict block).`,
        anchor: { match: 'freqMap[n] += 1', to: { match: 'continue' } },
        state: {
          type: 'array',
          cells: nums.map((v, j) => ({
            value: v,
            state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
          })),
          pointers: [{ index: i, label: 'i' }],
          hashmap: mapSnapshot(),
        },
        variables: [
          { name: 'n', value: n },
          { name: `freqMap[${n}]`, value: freqMap[n], highlight: true },
          { name: 'len(freqMap)', value: Object.keys(freqMap).length },
        ],
      });
      continue;
    }

    // 3rd distinct: show before decrement
    steps.push({
      explanation: `i=${i}, n=${n}: freqMap[${n}] = ${freqMap[n]}. len(freqMap) = ${Object.keys(freqMap).length} — past the continue, so every candidate gets decremented.`,
      anchor: { match: 'freqMap[n] += 1', to: { match: 'if len(freqMap) <= 2:' } },
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: mapSnapshot(),
      },
      variables: [
        { name: 'n', value: n, highlight: true },
        { name: 'len(freqMap)', value: Object.keys(freqMap).length },
      ],
    });

    // Decrement every candidate: `for n, count in freqMap.items(): freqMap[n] = count - 1`
    for (const key of Object.keys(freqMap)) {
      freqMap[Number(key)] = freqMap[Number(key)] - 1;
    }

    steps.push({
      explanation: `for n, count in freqMap.items(): freqMap[n] = count - 1 — every candidate loses one. Map is now ${JSON.stringify(freqMap)}.`,
      anchor: { match: 'for n, count in freqMap.items():', to: { match: 'freqMap[n] = count - 1' } },
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: mapSnapshot(),
      },
      variables: [{ name: 'map after decrement', value: JSON.stringify(freqMap), highlight: true }],
    });

    // Evict zeros: `for n in list(freqMap): if freqMap[n] == 0: freqMap.pop(n)`
    for (const key of Object.keys(freqMap)) {
      if (freqMap[Number(key)] === 0) delete freqMap[Number(key)];
    }

    steps.push({
      explanation: `for n in list(freqMap): if freqMap[n] == 0: freqMap.pop(n) — evict any candidate that hit zero. Map is now ${Object.keys(freqMap).length === 0 ? 'empty' : JSON.stringify(freqMap)}.`,
      anchor: { match: 'for n in list(freqMap):', to: { match: 'freqMap.pop(n)' } },
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({
          value: v,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: mapSnapshot(),
      },
      variables: [{ name: 'map after evict', value: JSON.stringify(freqMap), highlight: true }],
    });
  }

  // Verify pass: `for n in freqMap: if nums.count(n) > minSize: result.append(n)`
  const result = Object.keys(freqMap)
    .map(Number)
    .filter(n => nums.filter(x => x === n).length > minSize);

  steps.push({
    explanation: `Candidates after scan: ${JSON.stringify(freqMap)}. Verify each with nums.count(n) > minSize (${minSize}), since decrementing may have left the stored counts below the true frequency.`,
    anchor: { match: 'if nums.count(n) > minSize:', to: { match: 'result.append(n)' } },
    state: {
      type: 'array',
      cells: nums.map(v => ({
        value: v,
        state: result.includes(v) ? ('found' as const) : ('eliminated' as const),
      })),
      pointers: [],
      hashmap: Object.fromEntries(
        Object.keys(freqMap).map(k => [k, `count=${nums.filter(x => x === Number(k)).length} > ${minSize}? ${nums.filter(x => x === Number(k)).length > minSize}`])
      ),
    },
    variables: [{ name: 'return', value: `[${result.join(', ')}]`, highlight: true }],
  });

  return steps;
}

// ── Solution: Frequency Map (intuitive O(n) space) ───────────────────────────
//
// Traces cse-progress's majorityElement verbatim (this problem's first
// attempt): minSize, freqMap, one counting pass, then a filter pass appending
// keys whose value exceeds minSize.

function generateStepsFreq(): Step[] {
  const nums = [1, 1, 1, 3, 3, 2, 2, 2];
  const minSize = Math.floor(nums.length / 3);
  const steps: Step[] = [];
  const freq: Record<number, number> = {};

  steps.push({
    explanation: `Frequency-map approach (the intuitive one). minSize = len(nums)//3 = ${nums.length}//3 = ${minSize}. Count every value, then return those appearing MORE than minSize times. Uses a full map — O(n) space — vs Boyer-Moore's O(1).`,
    anchor: { match: 'minSize = len(nums)//3' },
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
      hashmap: {},
      hashmapLabel: 'freqMap',
      counters: [{ label: 'minSize (n/3)', value: minSize }],
    },
    variables: [{ name: 'minSize', value: minSize }],
  });

  for (let i = 0; i < nums.length; i++) {
    freq[nums[i]] = (freq[nums[i]] || 0) + 1;
    steps.push({
      explanation: `i=${i}: freqMap[${nums[i]}] → ${freq[nums[i]]}.`,
      anchor: { match: 'freqMap[n] += 1' },
      state: {
        type: 'array',
        cells: nums.map((v, j) => ({ value: v, state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const) })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...freq },
        hashmapLabel: 'freqMap',
        counters: [{ label: 'minSize (n/3)', value: minSize }],
      },
      variables: [
        { name: 'i', value: i },
        { name: `freqMap[${nums[i]}]`, value: freq[nums[i]], highlight: true },
      ],
    });
  }

  const result: number[] = [];
  for (const k of Object.keys(freq).map(Number)) {
    const v = freq[k];
    const pass = v > minSize;
    if (pass) result.push(k);
    steps.push({
      explanation: `Check key ${k}: count = ${v}. ${pass ? `${v} > ${minSize} → include ${k} in the result.` : `${v} ≤ ${minSize} → exclude.`}`,
      anchor: pass
        ? { match: 'if value > minSize:', to: { match: 'returnList.append(key)' } }
        : { match: 'if value > minSize:' },
      state: {
        type: 'array',
        cells: nums.map((x) => ({ value: x, state: x === k ? (pass ? ('found' as const) : ('eliminated' as const)) : ('visited' as const) })),
        pointers: [],
        hashmap: { ...freq },
        hashmapLabel: 'freqMap',
        counters: [{ label: 'minSize (n/3)', value: minSize }],
      },
      variables: [
        { name: 'key', value: k, highlight: true },
        { name: 'count', value: v },
        { name: `> ${minSize}?`, value: pass ? 'yes' : 'no', highlight: pass },
      ],
    });
  }

  steps.push({
    explanation: `Done. Keys with count > ${minSize}: [${result.join(', ')}]. Return them. O(n) time and O(n) space — the Boyer-Moore variant gets this down to O(1) space.`,
    anchor: { match: 'return returnList' },
    state: {
      type: 'array',
      cells: nums.map((v) => ({ value: v, state: result.includes(v) ? ('found' as const) : ('eliminated' as const) })),
      pointers: [],
      hashmap: { ...freq },
      hashmapLabel: 'freqMap',
      counters: [{ label: 'minSize (n/3)', value: minSize }],
    },
    variables: [{ name: 'return', value: `[${result.join(', ')}]`, highlight: true }],
  });

  return steps;
}

const freqSolution: SolutionVariant = {
  label: 'Frequency Map',
  variant: 'freq-map',
  generateSteps: generateStepsFreq,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
};

const solution: SolutionVariant = {
  label: 'Extended Boyer-Moore',
  variant: 'boyer-moore',
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
};

export const majorityElementIIMeta: AlgorithmMeta = {
  id: 'majority-element-ii',
  lcNumber: 229,
  title: 'Majority Element II',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Hash Map', 'Boyer-Moore'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array of size n, find all elements that appear more than ⌊n/3⌋ times. There can be at most two such elements.',
  examples: [
    {
      input: 'nums = [3,2,3]',
      output: '[3]',
    },
    {
      input: 'nums = [1,1,1,3,3,2,2,2]',
      output: '[1,2]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 5 × 10⁴',
    '-10⁹ ≤ nums[i] ≤ 10⁹',
  ],
  hint: 'Extension of Boyer-Moore: at most 2 elements can exceed n/3. Keep a map of at most 2 candidates. When a 3rd distinct value appears, decrement all counts and evict zeros — this "cancels" one occurrence of each candidate against the new value. After the scan, do a verification pass to confirm real counts exceed n/3.',
  solutions: [freqSolution, solution],
};
