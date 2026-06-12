import { AlgorithmMeta, SolutionVariant, Step, ArrayState, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import List

class Solution:
    def sortArrayMergeSort(self, nums: List[int]) -> List[int]:
        # recursive divide and conquer
        # using two pointer (left and right to keep track of the sub-arrays)
        # since its recursive, we should create a helper

        def merge(array, l, m, r):
            leftArray = array[l:m+1] # array[left:right] is inclusive of left and exclusive of right
            rightArray = array[m+1:r+1]

            # we'll use 3 pointers here
            # numsPointer to increment and perform the merge in source array starting from the left
            # leftPointer to traverse through leftArray
            # rightPointer to traverse through rightArray

            numsPointer, leftPointer, rightPointer = l, 0, 0

            while leftPointer < len(leftArray) and rightPointer < len(rightArray):
                if leftArray[leftPointer] < rightArray[rightPointer]:
                    array[numsPointer] = leftArray[leftPointer]
                    leftPointer+=1
                else:
                    array[numsPointer] = rightArray[rightPointer]
                    rightPointer+=1
                numsPointer+=1

            # handle case where original array is skewed
            # thus we are exiting prior while without having through all of both arrays

            while leftPointer < len(leftArray):
                array[numsPointer] = leftArray[leftPointer]
                leftPointer+=1
                numsPointer+=1

            while rightPointer < len(rightArray):
                array[numsPointer] = rightArray[rightPointer]
                rightPointer+=1
                numsPointer+=1

        def mergeSort(array, l, r):
            # two pointer to keep track of sub-arrays
            # base case: array size = 1, which means l = r
            if l == r:
                return array
            # split the array in half to recurse through
            m = (l + r) // 2
            # split arrays recursively halving each time
            mergeSort(array, l, m)
            mergeSort(array, m+1, r)
            # merge the split arrays
            merge(array, l, m, r)
            return array

        return mergeSort(nums, 0, len(nums)-1)`;

// ── Step generator ────────────────────────────────────────────────────────────

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nums = [5, 2, 3, 1];

  // Working copy we mutate as merge sort proceeds
  const arr = [...nums];

  steps.push({
    explanation:
      'Sort nums=[5,2,3,1] using Merge Sort. Strategy: divide and conquer — recursively split the array in half until each sub-array has size 1, then merge sorted halves back together. Time O(n log n), Space O(n) for temporary arrays.',
    highlightLine: 4,
    state: {
      type: 'array',
      cells: arr.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'input', value: '[5,2,3,1]' },
        { label: 'l', value: 0 },
        { label: 'r', value: 3 },
      ],
    } as ArrayState,
  });

  // ── Divide phase ──────────────────────────────────────────────────────────

  steps.push({
    explanation:
      'mergeSort(array, l=0, r=3): l != r so we split. m = (0+3)//2 = 1. Left half = array[0..1] = [5,2], right half = array[2..3] = [3,1].',
    highlightLine: 44,
    state: {
      type: 'array',
      cells: [
        { value: 5, state: 'window' as const },
        { value: 2, state: 'window' as const },
        { value: 3, state: 'active' as const },
        { value: 1, state: 'active' as const },
      ],
      pointers: [
        { index: 0, label: 'l' },
        { index: 1, label: 'm' },
        { index: 3, label: 'r' },
      ],
      counters: [
        { label: 'call', value: 'mergeSort(0,3)' },
        { label: 'm', value: 1 },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'Recurse left: mergeSort(array, l=0, r=1). m = (0+1)//2 = 0. Left = array[0..0] = [5], right = array[1..1] = [2].',
    highlightLine: 47,
    state: {
      type: 'array',
      cells: [
        { value: 5, state: 'window' as const },
        { value: 2, state: 'window' as const },
        { value: 3, state: 'default' as const },
        { value: 1, state: 'default' as const },
      ],
      pointers: [
        { index: 0, label: 'l/m' },
        { index: 1, label: 'r' },
      ],
      counters: [
        { label: 'call', value: 'mergeSort(0,1)' },
        { label: 'm', value: 0 },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'mergeSort(array, l=0, r=0): base case l==r — single element [5], already sorted. Return.',
    highlightLine: 42,
    state: {
      type: 'array',
      cells: [
        { value: 5, state: 'found' as const },
        { value: 2, state: 'default' as const },
        { value: 3, state: 'default' as const },
        { value: 1, state: 'default' as const },
      ],
      pointers: [{ index: 0, label: 'l=r=0' }],
      counters: [{ label: 'call', value: 'mergeSort(0,0) → base' }],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'mergeSort(array, l=1, r=1): base case l==r — single element [2], already sorted. Return.',
    highlightLine: 42,
    state: {
      type: 'array',
      cells: [
        { value: 5, state: 'found' as const },
        { value: 2, state: 'found' as const },
        { value: 3, state: 'default' as const },
        { value: 1, state: 'default' as const },
      ],
      pointers: [{ index: 1, label: 'l=r=1' }],
      counters: [{ label: 'call', value: 'mergeSort(1,1) → base' }],
    } as ArrayState,
  });

  // ── Merge [5,2] → [2,5] ──────────────────────────────────────────────────

  steps.push({
    explanation:
      'merge(array, l=0, m=0, r=1): leftArray=[5], rightArray=[2]. Compare leftArray[0]=5 vs rightArray[0]=2. 5 >= 2 → place 2 at array[0], rightPointer++, numsPointer++.',
    highlightLine: 20,
    state: {
      type: 'array',
      cells: [
        { value: 5, state: 'active' as const },
        { value: 2, state: 'active' as const },
        { value: 3, state: 'default' as const },
        { value: 1, state: 'default' as const },
      ],
      pointers: [
        { index: 0, label: 'numsPtr' },
        { index: 1, label: 'rPtr→2' },
      ],
      counters: [
        { label: 'leftArray', value: '[5]' },
        { label: 'rightArray', value: '[2]' },
        { label: 'compare', value: '5 >= 2 → place 2' },
      ],
    } as ArrayState,
  });

  arr[0] = 2;
  steps.push({
    explanation:
      'rightPointer exhausted. Drain leftArray: place 5 at array[1]. merge done. array[0..1] = [2,5].',
    highlightLine: 32,
    state: {
      type: 'array',
      cells: [
        { value: 2, state: 'found' as const },
        { value: 5, state: 'found' as const },
        { value: 3, state: 'default' as const },
        { value: 1, state: 'default' as const },
      ],
      pointers: [],
      counters: [
        { label: 'merged [0..1]', value: '[2,5]' },
        { label: 'comparisons', value: 1 },
      ],
    } as ArrayState,
  });
  arr[1] = 5;

  // ── Divide right half [3,1] ───────────────────────────────────────────────

  steps.push({
    explanation:
      'Recurse right: mergeSort(array, l=2, r=3). m = (2+3)//2 = 2. Left = array[2..2] = [3], right = array[3..3] = [1]. Both are base cases.',
    highlightLine: 48,
    state: {
      type: 'array',
      cells: [
        { value: 2, state: 'visited' as const },
        { value: 5, state: 'visited' as const },
        { value: 3, state: 'window' as const },
        { value: 1, state: 'window' as const },
      ],
      pointers: [
        { index: 2, label: 'l/m' },
        { index: 3, label: 'r' },
      ],
      counters: [{ label: 'call', value: 'mergeSort(2,3)' }],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'mergeSort(2,2) and mergeSort(3,3) both hit base case. Now merge(array, l=2, m=2, r=3): leftArray=[3], rightArray=[1]. 3 >= 1 → place 1 first, then 3.',
    highlightLine: 20,
    state: {
      type: 'array',
      cells: [
        { value: 2, state: 'visited' as const },
        { value: 5, state: 'visited' as const },
        { value: 3, state: 'active' as const },
        { value: 1, state: 'active' as const },
      ],
      pointers: [
        { index: 2, label: 'lPtr→3' },
        { index: 3, label: 'rPtr→1' },
      ],
      counters: [
        { label: 'compare', value: '3 >= 1 → place 1' },
        { label: 'comparisons', value: 2 },
      ],
    } as ArrayState,
  });

  arr[2] = 1;
  arr[3] = 3;
  steps.push({
    explanation:
      'merge done. array[2..3] = [1,3]. Both halves are now sorted: left=[2,5], right=[1,3]. Final merge needed.',
    highlightLine: 32,
    state: {
      type: 'array',
      cells: [
        { value: 2, state: 'visited' as const },
        { value: 5, state: 'visited' as const },
        { value: 1, state: 'found' as const },
        { value: 3, state: 'found' as const },
      ],
      pointers: [],
      counters: [{ label: 'merged [2..3]', value: '[1,3]' }],
    } as ArrayState,
  });

  // ── Final merge [2,5] + [1,3] → [1,2,3,5] ───────────────────────────────

  steps.push({
    explanation:
      'Final merge(array, l=0, m=1, r=3): leftArray=[2,5], rightArray=[1,3]. Compare left[0]=2 vs right[0]=1. 2 >= 1 → place 1 at array[0], rightPointer++.',
    highlightLine: 20,
    state: {
      type: 'array',
      cells: [
        { value: 2, state: 'active' as const },
        { value: 5, state: 'window' as const },
        { value: 1, state: 'active' as const },
        { value: 3, state: 'window' as const },
      ],
      pointers: [
        { index: 0, label: 'numsPtr' },
        { index: 0, label: 'lPtr→2' },
        { index: 2, label: 'rPtr→1' },
      ],
      counters: [
        { label: 'leftArray', value: '[2,5]' },
        { label: 'rightArray', value: '[1,3]' },
        { label: 'compare', value: '2 >= 1 → place 1' },
        { label: 'comparisons', value: 3 },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'Compare left[0]=2 vs right[1]=3. 2 < 3 → place 2 at array[1], leftPointer++.',
    highlightLine: 21,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'found' as const },
        { value: 2, state: 'active' as const },
        { value: 5, state: 'window' as const },
        { value: 3, state: 'active' as const },
      ],
      pointers: [{ index: 1, label: 'numsPtr' }],
      counters: [
        { label: 'compare', value: '2 < 3 → place 2' },
        { label: 'comparisons', value: 4 },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'Compare left[1]=5 vs right[1]=3. 5 >= 3 → place 3 at array[2], rightPointer++. rightArray exhausted. Drain leftArray: place 5 at array[3].',
    highlightLine: 23,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'found' as const },
        { value: 2, state: 'found' as const },
        { value: 3, state: 'active' as const },
        { value: 5, state: 'active' as const },
      ],
      pointers: [{ index: 2, label: 'numsPtr' }],
      counters: [
        { label: 'compare', value: '5 >= 3 → place 3, then drain 5' },
        { label: 'comparisons', value: 5 },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'All merges complete. Final sorted array: [1,2,3,5]. Merge Sort divides into O(log n)=2 levels, each level does O(n) work → O(n log n) total. Space O(n) for temporary left/right arrays during merge.',
    highlightLine: 51,
    state: {
      type: 'array',
      cells: [1, 2, 3, 5].map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'output', value: '[1,2,3,5]' },
        { label: 'time', value: 'O(n log n)' },
        { label: 'space', value: 'O(n)' },
        { label: 'total comparisons', value: 5 },
      ],
    } as ArrayState,
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Merge Sort (Divide & Conquer)',
  pythonCode: PYTHON_CODE,
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
  hint: 'Merge Sort: recursively split the array in half (using l/m/r pointers) until single elements, then merge sorted halves using 3 pointers (numsPointer, leftPointer, rightPointer). Drain remaining elements from whichever sub-array is not exhausted first.',
  solutions: [solution],
};
