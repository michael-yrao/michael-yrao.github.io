import { AlgorithmMeta, Category, ProblemExample } from '../models/algorithm.model';
import { twoSumMeta } from '../../algorithms/arrays-hash/two-sum.steps';
import { containsDuplicateMeta } from '../../algorithms/arrays-hash/contains-duplicate.steps';
import { bestTimeBuySellMeta } from '../../algorithms/sliding-window/best-time-buy-sell-stock.steps';
import { binarySearchMeta } from '../../algorithms/binary-search/binary-search.steps';
import { validParenthesesMeta } from '../../algorithms/stack/valid-parentheses.steps';
import { numberOfIslandsMeta } from '../../algorithms/graphs/number-of-islands.steps';
import { reverseLinkedListMeta } from '../../algorithms/linked-list/reverse-linked-list.steps';
import { rottingOrangesMeta } from '../../algorithms/graphs/rotting-oranges.steps';

const stub = (
  id: string,
  lcNumber: number,
  title: string,
  difficulty: AlgorithmMeta['difficulty'],
  category: Category,
  tags: string[],
  time: string,
  space: string
): AlgorithmMeta => ({
  id,
  lcNumber,
  title,
  difficulty,
  category,
  tags,
  timeComplexity: time,
  spaceComplexity: space,
  description: '',
  examples: [] as ProblemExample[],
  constraints: [],
  hint: 'Visualization coming soon.',
  solutions: [{ label: '', pythonCode: '', generateSteps: () => [] }],
});

export const ALL_ALGORITHMS: AlgorithmMeta[] = [
  // ── Arrays & Hash ─────────────────────────────────────────────────────────
  twoSumMeta,
  stub('plus-one', 66, 'Plus One', 'Easy', 'arrays-hash', ['Array', 'Math'], 'O(n)', 'O(1)'),
  stub('remove-element', 27, 'Remove Element', 'Easy', 'arrays-hash', ['Array', 'Two Pointers'], 'O(n)', 'O(1)'),
  containsDuplicateMeta,
  stub('valid-anagram', 242, 'Valid Anagram', 'Easy', 'arrays-hash', ['Hash Map', 'String', 'Sorting'], 'O(n)', 'O(n)'),
  stub('concatenation-of-array', 1929, 'Concatenation of Array', 'Easy', 'arrays-hash', ['Array'], 'O(n)', 'O(n)'),
  stub('majority-element', 169, 'Majority Element', 'Easy', 'arrays-hash', ['Array', 'Hash Map', 'Boyer-Moore'], 'O(n)', 'O(1)'),
  stub('rotate-array', 189, 'Rotate Array', 'Medium', 'arrays-hash', ['Array', 'Math', 'Two Pointers'], 'O(n)', 'O(1)'),
  stub('longest-common-prefix', 14, 'Longest Common Prefix', 'Easy', 'arrays-hash', ['String', 'Trie'], 'O(m·n)', 'O(1)'),
  stub('majority-element-ii', 229, 'Majority Element II', 'Medium', 'arrays-hash', ['Array', 'Hash Map', 'Boyer-Moore'], 'O(n)', 'O(1)'),
  stub('best-time-buy-sell-stock-ii', 122, 'Best Time to Buy and Sell Stock II', 'Medium', 'arrays-hash', ['Array', 'Greedy'], 'O(n)', 'O(1)'),
  stub('product-of-array-except-self', 238, 'Product of Array Except Self', 'Medium', 'arrays-hash', ['Array', 'Prefix Sum'], 'O(n)', 'O(1)'),
  stub('top-k-frequent-elements', 347, 'Top K Frequent Elements', 'Medium', 'arrays-hash', ['Array', 'Hash Map', 'Bucket Sort', 'Heap'], 'O(n)', 'O(n)'),
  stub('group-anagrams', 49, 'Group Anagrams', 'Medium', 'arrays-hash', ['Hash Map', 'String', 'Sorting'], 'O(n·k log k)', 'O(n)'),
  stub('sort-colors', 75, 'Sort Colors', 'Medium', 'arrays-hash', ['Array', 'Two Pointers', 'Dutch Flag'], 'O(n)', 'O(1)'),
  stub('valid-sudoku', 36, 'Valid Sudoku', 'Medium', 'arrays-hash', ['Array', 'Hash Set', 'Matrix'], 'O(1)', 'O(1)'),
  stub('sort-an-array', 912, 'Sort an Array', 'Medium', 'arrays-hash', ['Array', 'Merge Sort', 'Heap Sort'], 'O(n log n)', 'O(n)'),
  stub('longest-consecutive-sequence', 128, 'Longest Consecutive Sequence', 'Medium', 'arrays-hash', ['Array', 'Hash Set'], 'O(n)', 'O(n)'),
  stub('container-with-most-water', 11, 'Container With Most Water', 'Medium', 'arrays-hash', ['Array', 'Two Pointers', 'Greedy'], 'O(n)', 'O(1)'),

  // ── Two Pointers ──────────────────────────────────────────────────────────
  stub('merge-strings-alternatively', 1768, 'Merge Strings Alternately', 'Easy', 'two-pointers', ['Two Pointers', 'String'], 'O(n)', 'O(n)'),
  stub('move-zeros', 283, 'Move Zeroes', 'Easy', 'two-pointers', ['Array', 'Two Pointers'], 'O(n)', 'O(1)'),
  stub('reverse-string', 344, 'Reverse String', 'Easy', 'two-pointers', ['Two Pointers', 'String'], 'O(n)', 'O(1)'),
  stub('valid-palindrome', 125, 'Valid Palindrome', 'Easy', 'two-pointers', ['Two Pointers', 'String'], 'O(n)', 'O(1)'),
  stub('remove-dup-from-sorted-array', 26, 'Remove Duplicates from Sorted Array', 'Easy', 'two-pointers', ['Array', 'Two Pointers'], 'O(n)', 'O(1)'),
  stub('merge-sorted-array', 88, 'Merge Sorted Array', 'Easy', 'two-pointers', ['Array', 'Two Pointers', 'Sorting'], 'O(m+n)', 'O(1)'),
  stub('two-sum-ii', 167, 'Two Sum II', 'Medium', 'two-pointers', ['Array', 'Two Pointers', 'Binary Search'], 'O(n)', 'O(1)'),
  stub('valid-palindrome-ii', 680, 'Valid Palindrome II', 'Easy', 'two-pointers', ['Two Pointers', 'String', 'Greedy'], 'O(n)', 'O(1)'),
  stub('remove-dup-sorted-array-ii', 80, 'Remove Duplicates from Sorted Array II', 'Medium', 'two-pointers', ['Array', 'Two Pointers'], 'O(n)', 'O(1)'),
  stub('three-sum', 15, '3Sum', 'Medium', 'two-pointers', ['Array', 'Two Pointers', 'Sorting'], 'O(n²)', 'O(n)'),
  stub('trapping-rain-water', 42, 'Trapping Rain Water', 'Hard', 'two-pointers', ['Array', 'Two Pointers', 'Dynamic Programming'], 'O(n)', 'O(1)'),
  stub('four-sum', 18, '4Sum', 'Medium', 'two-pointers', ['Array', 'Two Pointers', 'Sorting'], 'O(n³)', 'O(n)'),

  // ── Sliding Window ────────────────────────────────────────────────────────
  bestTimeBuySellMeta,
  stub('contains-duplicate-ii', 219, 'Contains Duplicate II', 'Easy', 'sliding-window', ['Array', 'Hash Map', 'Sliding Window'], 'O(n)', 'O(k)'),
  stub('permutation-in-string', 567, 'Permutation in String', 'Medium', 'sliding-window', ['Hash Map', 'Sliding Window', 'Two Pointers'], 'O(n)', 'O(1)'),
  stub('longest-repeating-char-replacement', 424, 'Longest Repeating Character Replacement', 'Medium', 'sliding-window', ['Hash Map', 'Sliding Window'], 'O(n)', 'O(1)'),
  stub('minimum-window-substring', 76, 'Minimum Window Substring', 'Hard', 'sliding-window', ['Hash Map', 'Sliding Window', 'Two Pointers'], 'O(n)', 'O(k)'),

  // ── Binary Search ─────────────────────────────────────────────────────────
  binarySearchMeta,
  stub('find-minimum-in-rotated-sorted-array', 153, 'Find Minimum in Rotated Sorted Array', 'Medium', 'binary-search', ['Array', 'Binary Search'], 'O(log n)', 'O(1)'),
  stub('search-a-2d-matrix', 74, 'Search a 2D Matrix', 'Medium', 'binary-search', ['Array', 'Binary Search', 'Matrix'], 'O(log(m·n))', 'O(1)'),
  stub('search-in-rotated-sorted-array', 33, 'Search in Rotated Sorted Array', 'Medium', 'binary-search', ['Array', 'Binary Search'], 'O(log n)', 'O(1)'),
  stub('find-peak-element', 162, 'Find Peak Element', 'Medium', 'binary-search', ['Array', 'Binary Search'], 'O(log n)', 'O(1)'),
  stub('single-element-in-sorted-array', 540, 'Single Element in a Sorted Array', 'Medium', 'binary-search', ['Array', 'Binary Search'], 'O(log n)', 'O(1)'),
  stub('koko-eating-bananas', 875, 'Koko Eating Bananas', 'Medium', 'binary-search', ['Array', 'Binary Search'], 'O(n log m)', 'O(1)'),
  stub('capacity-to-ship-packages', 1011, 'Capacity To Ship Packages Within D Days', 'Medium', 'binary-search', ['Array', 'Binary Search'], 'O(n log m)', 'O(1)'),
  stub('time-based-key-value-store', 981, 'Time Based Key-Value Store', 'Medium', 'binary-search', ['Hash Map', 'Binary Search', 'Design'], 'O(log n)', 'O(n)'),
  stub('successful-pairs-spells-potions', 2300, 'Successful Pairs of Spells and Potions', 'Medium', 'binary-search', ['Array', 'Binary Search', 'Sorting'], 'O(n log n)', 'O(n)'),

  // ── Linked List ───────────────────────────────────────────────────────────
  reverseLinkedListMeta,
  stub('linked-list-cycle', 141, 'Linked List Cycle', 'Easy', 'linked-list', ['Linked List', 'Two Pointers', "Floyd's"], 'O(n)', 'O(1)'),
  stub('merge-two-sorted-lists', 21, 'Merge Two Sorted Lists', 'Easy', 'linked-list', ['Linked List', 'Recursion'], 'O(n+m)', 'O(1)'),
  stub('remove-nth-node-from-end', 19, 'Remove Nth Node From End of List', 'Medium', 'linked-list', ['Linked List', 'Two Pointers'], 'O(n)', 'O(1)'),
  stub('reorder-list', 143, 'Reorder List', 'Medium', 'linked-list', ['Linked List', 'Two Pointers', 'Stack'], 'O(n)', 'O(1)'),

  // ── Trees ─────────────────────────────────────────────────────────────────
  stub('invert-binary-tree', 226, 'Invert Binary Tree', 'Easy', 'trees', ['Tree', 'DFS', 'BFS', 'Recursion'], 'O(n)', 'O(h)'),
  stub('max-depth-of-binary-tree', 104, 'Maximum Depth of Binary Tree', 'Easy', 'trees', ['Tree', 'DFS', 'BFS', 'Recursion'], 'O(n)', 'O(h)'),
  stub('diameter-of-binary-tree', 543, 'Diameter of Binary Tree', 'Easy', 'trees', ['Tree', 'DFS'], 'O(n)', 'O(h)'),
  stub('balanced-binary-tree', 110, 'Balanced Binary Tree', 'Easy', 'trees', ['Tree', 'DFS', 'Recursion'], 'O(n)', 'O(h)'),
  stub('same-tree', 100, 'Same Tree', 'Easy', 'trees', ['Tree', 'DFS', 'BFS', 'Recursion'], 'O(n)', 'O(h)'),
  stub('subtree-of-another-tree', 572, 'Subtree of Another Tree', 'Easy', 'trees', ['Tree', 'DFS', 'String Matching'], 'O(m·n)', 'O(m+n)'),
  stub('binary-tree-level-order-traversal', 102, 'Binary Tree Level Order Traversal', 'Medium', 'trees', ['Tree', 'BFS', 'Queue'], 'O(n)', 'O(n)'),
  stub('lowest-common-ancestor-bst', 235, 'Lowest Common Ancestor of BST', 'Medium', 'trees', ['Tree', 'DFS', 'BST'], 'O(h)', 'O(1)'),
  stub('validate-bst', 98, 'Validate Binary Search Tree', 'Medium', 'trees', ['Tree', 'DFS', 'BST'], 'O(n)', 'O(h)'),
  stub('count-good-nodes', 1448, 'Count Good Nodes in Binary Tree', 'Medium', 'trees', ['Tree', 'DFS'], 'O(n)', 'O(h)'),

  // ── Graphs ────────────────────────────────────────────────────────────────
  numberOfIslandsMeta,
  stub('max-area-of-island', 695, 'Max Area of Island', 'Medium', 'graphs', ['BFS', 'DFS', 'Graph', 'Matrix'], 'O(m×n)', 'O(m×n)'),
  stub('clone-graph', 133, 'Clone Graph', 'Medium', 'graphs', ['DFS', 'BFS', 'Graph', 'Hash Map'], 'O(V+E)', 'O(V)'),
  rottingOrangesMeta,

  // ── Stack ─────────────────────────────────────────────────────────────────
  validParenthesesMeta,

  // ── Greedy ────────────────────────────────────────────────────────────────
  stub('maximum-subarray', 53, 'Maximum Subarray', 'Medium', 'greedy', ['Array', "Kadane's Algorithm", 'Dynamic Programming'], 'O(n)', 'O(1)'),

  // ── Dynamic Programming ───────────────────────────────────────────────────
  stub('valid-palindrome-iii', 1216, 'Valid Palindrome III', 'Hard', 'dynamic-programming', ['String', 'Dynamic Programming'], 'O(n²)', 'O(n²)'),
];

export const ALGORITHMS_BY_CATEGORY: Record<Category, AlgorithmMeta[]> = {
  'arrays-hash': ALL_ALGORITHMS.filter((a) => a.category === 'arrays-hash'),
  'two-pointers': ALL_ALGORITHMS.filter((a) => a.category === 'two-pointers'),
  'sliding-window': ALL_ALGORITHMS.filter((a) => a.category === 'sliding-window'),
  'binary-search': ALL_ALGORITHMS.filter((a) => a.category === 'binary-search'),
  'linked-list': ALL_ALGORITHMS.filter((a) => a.category === 'linked-list'),
  'trees': ALL_ALGORITHMS.filter((a) => a.category === 'trees'),
  'graphs': ALL_ALGORITHMS.filter((a) => a.category === 'graphs'),
  'stack': ALL_ALGORITHMS.filter((a) => a.category === 'stack'),
  'greedy': ALL_ALGORITHMS.filter((a) => a.category === 'greedy'),
  'dynamic-programming': ALL_ALGORITHMS.filter((a) => a.category === 'dynamic-programming'),
};

export function findAlgorithm(category: Category, id: string): AlgorithmMeta | undefined {
  return ALGORITHMS_BY_CATEGORY[category]?.find((a) => a.id === id);
}

export function getCategoryNeighbors(
  category: Category,
  id: string
): { prev: AlgorithmMeta | null; next: AlgorithmMeta | null } {
  const list = ALGORITHMS_BY_CATEGORY[category] ?? [];
  const idx = list.findIndex((a) => a.id === id);
  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx < list.length - 1 ? list[idx + 1] : null,
  };
}
