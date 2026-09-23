import { AlgorithmMeta, SolutionVariant, Step, ArrayState, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's sortArrayMergeSort_20260725 verbatim: this attempt is
// SLICE-based, not index-based. `mergeSort(inputArray)` recursively slices
// `inputArray[:mid]` / `inputArray[mid:]` and returns a NEW array each call —
// it never mutates a shared array via l/m/r indices. `merge(leftArray,
// rightArray)` builds a NEW resultArray with `.append()`, tracked by two local
// pointers li/ri, not a third "numsPointer" writing back into a source array.

const cellsFor = (arr: readonly number[], activeIdx?: number) =>
  arr.map((v, i) => ({ value: v, state: (i === activeIdx ? 'active' : 'default') as 'active' | 'default' }));

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nums = [5, 2, 3, 1];

  steps.push({
    explanation:
      'Sort nums=[5,2,3,1] using Merge Sort. mergeSort(inputArray) slices the array in half and recurses on each NEW slice until len(inputArray) <= 1, then merge() combines two sorted slices into a brand-new resultArray. Time O(n log n), Space O(n) for the new arrays created at every level.',
    anchor: { match: 'def sortArrayMergeSort_20260725(self, nums: List[int]) -> List[int]:' },
    state: { type: 'array', cells: cellsFor(nums), pointers: [], arrayLabel: 'nums' } as ArrayState,
  });

  // ── merge(leftArray, rightArray): builds resultArray via .append() ─────────
  function simulateMerge(leftArray: number[], rightArray: number[], label: string): number[] {
    const resultArray: number[] = [];
    let li = 0;
    let ri = 0;

    while (li < leftArray.length && ri < rightArray.length) {
      if (leftArray[li] < rightArray[ri]) {
        steps.push({
          explanation: `${label}: leftArray[${li}]=${leftArray[li]} < rightArray[${ri}]=${rightArray[ri]} → resultArray.append(leftArray[li]), li+=1. resultArray=[${[...resultArray, leftArray[li]].join(',')}].`,
          anchor: {
            match: 'if leftArray[li] < rightArray[ri]:',
            // nth:1 li+=1 is the main-loop's own increment; nth:2 (used by the drain step below) is the drain loop's.
            to: { match: 'li+=1', nth: 1 },
          },
          state: {
            type: 'array',
            cells: [...cellsFor(leftArray, li), ...cellsFor(rightArray, ri)],
            pointers: [],
            arrayLabel: `${label}: leftArray=[${leftArray.join(',')}] rightArray=[${rightArray.join(',')}]`,
            counters: [{ label: 'resultArray', value: `[${resultArray.join(',')}]` }],
          } as ArrayState,
        });
        resultArray.push(leftArray[li]);
        li++;
      } else {
        steps.push({
          explanation: `${label}: leftArray[${li}]=${leftArray[li]} >= rightArray[${ri}]=${rightArray[ri]} → resultArray.append(rightArray[ri]), ri+=1. resultArray=[${[...resultArray, rightArray[ri]].join(',')}].`,
          anchor: {
            match: 'else:',
            // nth:1 ri+=1 is the main-loop's own increment; nth:2 (used by the drain step below) is the drain loop's.
            to: { match: 'ri+=1', nth: 1 },
          },
          state: {
            type: 'array',
            cells: [...cellsFor(leftArray, li), ...cellsFor(rightArray, ri)],
            pointers: [],
            arrayLabel: `${label}: leftArray=[${leftArray.join(',')}] rightArray=[${rightArray.join(',')}]`,
            counters: [{ label: 'resultArray', value: `[${resultArray.join(',')}]` }],
          } as ArrayState,
        });
        resultArray.push(rightArray[ri]);
        ri++;
      }
    }

    if (li < leftArray.length) {
      const drained = leftArray.slice(li);
      steps.push({
        explanation: `${label}: rightArray exhausted. Drain the rest of leftArray (${JSON.stringify(drained)}) into resultArray. resultArray=[${[...resultArray, ...drained].join(',')}].`,
        // nth:2 skips the main-loop's li+=1 (hit 1) and lands on this drain loop's own li+=1.
        anchor: { match: 'while li < len(leftArray):', to: { match: 'li+=1', nth: 2 } },
        state: {
          type: 'array',
          cells: cellsFor(leftArray, li),
          pointers: [],
          arrayLabel: `${label}: draining leftArray`,
          counters: [{ label: 'resultArray', value: `[${resultArray.join(',')}]` }],
        } as ArrayState,
      });
      resultArray.push(...drained);
    } else if (ri < rightArray.length) {
      const drained = rightArray.slice(ri);
      steps.push({
        explanation: `${label}: leftArray exhausted. Drain the rest of rightArray (${JSON.stringify(drained)}) into resultArray. resultArray=[${[...resultArray, ...drained].join(',')}].`,
        // nth:2 skips the main-loop's ri+=1 (hit 1) and lands on this drain loop's own ri+=1.
        anchor: { match: 'while ri < len(rightArray):', to: { match: 'ri+=1', nth: 2 } },
        state: {
          type: 'array',
          cells: cellsFor(rightArray, ri),
          pointers: [],
          arrayLabel: `${label}: draining rightArray`,
          counters: [{ label: 'resultArray', value: `[${resultArray.join(',')}]` }],
        } as ArrayState,
      });
      resultArray.push(...drained);
    }

    steps.push({
      explanation: `${label}: return resultArray = [${resultArray.join(',')}].`,
      anchor: { match: 'return resultArray' },
      state: {
        type: 'array',
        cells: cellsFor(resultArray),
        pointers: [],
        arrayLabel: `${label}: resultArray (merged)`,
      } as ArrayState,
    });

    return resultArray;
  }

  // ── mergeSort(inputArray): slices into two NEW arrays, recurses, merges ────
  function simulateMergeSort(inputArray: number[], label: string): number[] {
    if (inputArray.length <= 1) {
      steps.push({
        explanation: `mergeSort(${label}=[${inputArray.join(',')}]): len(inputArray) <= 1 → base case, return inputArray unchanged.`,
        anchor: { match: 'if len(inputArray) <= 1:', to: { match: 'return inputArray' } },
        state: { type: 'array', cells: cellsFor(inputArray), pointers: [], arrayLabel: `${label} (base case)` } as ArrayState,
      });
      return inputArray;
    }

    const mid = Math.floor(inputArray.length / 2);
    const leftSlice = inputArray.slice(0, mid);
    const rightSlice = inputArray.slice(mid);

    steps.push({
      explanation: `mergeSort(${label}=[${inputArray.join(',')}]): mid = len(inputArray)//2 = ${mid}. leftSide = mergeSort(inputArray[:${mid}]) on [${leftSlice.join(',')}], rightSide = mergeSort(inputArray[${mid}:]) on [${rightSlice.join(',')}] — both brand-new slices, not the original array.`,
      anchor: { match: 'mid = len(inputArray) // 2', to: { match: 'rightSide = mergeSort(inputArray[mid:])' } },
      state: {
        type: 'array',
        cells: [...cellsFor(leftSlice), ...cellsFor(rightSlice)],
        pointers: [],
        arrayLabel: `${label}: split into [${leftSlice.join(',')}] | [${rightSlice.join(',')}]`,
      } as ArrayState,
    });

    const leftSide = simulateMergeSort(leftSlice, `${label}.left`);
    const rightSide = simulateMergeSort(rightSlice, `${label}.right`);
    const merged = simulateMerge(leftSide, rightSide, `merge(${label})`);

    steps.push({
      explanation: `mergeSort(${label}): return merge(leftSide, rightSide) = [${merged.join(',')}].`,
      anchor: { match: 'return merge(leftSide, rightSide)' },
      state: { type: 'array', cells: cellsFor(merged), pointers: [], arrayLabel: `${label} (sorted)` } as ArrayState,
    });

    return merged;
  }

  const sorted = simulateMergeSort(nums, 'mergeSort(nums)');

  steps.push({
    explanation: `All recursive calls complete. return mergeSort(nums) = [${sorted.join(',')}]. Merge Sort divides into O(log n) levels, each doing O(n) work of comparisons and appends → O(n log n) total. Space O(n): every call slices and builds brand-new arrays.`,
    anchor: { match: 'return mergeSort(nums)' },
    state: {
      type: 'array',
      cells: sorted.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'output', value: `[${sorted.join(',')}]` },
        { label: 'time', value: 'O(n log n)' },
        { label: 'space', value: 'O(n)' },
      ],
    } as ArrayState,
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Merge Sort (Divide & Conquer)',
  variant: 'merge-sort',
  generateSteps,
};

export const sortAnArrayMeta: AlgorithmMeta = {
  id: 'sort-an-array',
  lcNumber: 912,
  title: 'Sort an Array',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Merge Sort', 'Heap Sort'],
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(n)',
  description:
    'Sort an array of integers in ascending order in O(n log n) time with minimal space. Must not use built-in sort functions.',
  examples: [
    {
      input: 'nums = [5,2,3,1]',
      output: '[1,2,3,5]',
    },
    {
      input: 'nums = [5,1,1,2,0,0]',
      output: '[0,0,1,1,2,5]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ nums.length ≤ 5 × 10⁴',
    '-5 × 10⁴ ≤ nums[i] ≤ 5 × 10⁴',
  ],
  hint: 'Merge Sort: mergeSort(inputArray) slices the array in half and recurses on each new slice until length <= 1, then merge(leftArray, rightArray) builds a brand-new resultArray by comparing the two sorted slices with two local pointers (li, ri) and appending the smaller front element each time. Drain whichever slice still has elements left once the other is exhausted.',
  solutions: [solution],
};
