import { Category, CATEGORY_ICONS, CATEGORY_LABELS } from '../models/algorithm.model';

export interface CodeTemplate {
  title: string;
  code: string;
}

export interface KeyProblem {
  id: string;
  title: string;
  lcNumber: number;
  category: Category;
}

export interface CheatSheet {
  category: Category;
  whenToUse: string;
  signals: string[];
  templates: CodeTemplate[];
  pitfalls: string[];
  keyProblems: KeyProblem[];
}

export const CHEAT_SHEETS: CheatSheet[] = [
  {
    category: 'arrays-hash',
    whenToUse:
      'Reach for a hash map or set when you need O(1) lookups, want to count or group elements, or need to answer "have I seen this before?" in constant time.',
    signals: [
      '"Does X exist?" or "have I seen X before?"',
      'Count occurrences or frequencies of elements',
      'Group elements by a shared property (e.g., anagram key)',
      'Find pairs or complements summing to a target — avoid O(n²) nesting',
      'Store indices alongside values to back-reference them later',
    ],
    templates: [
      {
        title: 'Complement lookup (Two Sum pattern)',
        code: `seen = {}
for i, x in enumerate(nums):
    complement = target - x
    if complement in seen:
        return [seen[complement], i]
    seen[x] = i`,
      },
      {
        title: 'Frequency map',
        code: `freq = {}
for x in items:
    freq[x] = freq.get(x, 0) + 1

# Pythonic shorthand:
# from collections import Counter
# freq = Counter(items)`,
      },
    ],
    pitfalls: [
      'Using a list for membership checks — list.contains is O(n), set lookup is O(1)',
      'Bare dict[key] raises KeyError on a missing key — use dict.get(key, 0) for counts',
      'Adding to the map before checking for a complement causes false self-matches (target=4, value=2 → 2+2=4 but same index)',
      'Modifying a collection while iterating over it — iterate a copy or collect changes first',
    ],
    keyProblems: [
      { id: 'two-sum', title: 'Two Sum', lcNumber: 1, category: 'arrays-hash' },
      { id: 'group-anagrams', title: 'Group Anagrams', lcNumber: 49, category: 'arrays-hash' },
      { id: 'longest-consecutive-sequence', title: 'Longest Consecutive Sequence', lcNumber: 128, category: 'arrays-hash' },
    ],
  },
  {
    category: 'two-pointers',
    whenToUse:
      'Use two pointers on a sorted array or string when searching for a pair, triplet, or re-arranging elements in-place — it collapses an O(n²) nested search to O(n).',
    signals: [
      'Input is sorted (or can be sorted) and you need a pair or triplet summing to a target',
      'Palindrome check — comparing characters from both ends inward',
      'Partition: move certain elements to one end in-place (zeros, negatives)',
      'Merge two sorted arrays or linked lists',
      'Fast/slow pointers for cycle detection or finding the middle of a linked list',
    ],
    templates: [
      {
        title: 'Converging pointers (pair search)',
        code: `left, right = 0, len(arr) - 1
while left < right:
    s = arr[left] + arr[right]
    if s == target:
        return [left, right]
    elif s < target:
        left += 1
    else:
        right -= 1`,
      },
      {
        title: 'Fast / slow pointers (cycle / middle)',
        code: `slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
# slow is at the midpoint
# if they ever meet, a cycle exists`,
      },
    ],
    pitfalls: [
      'Applying two pointers to an unsorted array without sorting first — produces wrong results',
      'Not skipping duplicate values in 3Sum — the output will contain duplicate triplets',
      'Infinite loop from failing to advance a pointer after processing a match',
      'Off-by-one: use left < right (not <=) when the pointers must not cross',
    ],
    keyProblems: [
      { id: 'valid-palindrome', title: 'Valid Palindrome', lcNumber: 125, category: 'two-pointers' },
      { id: 'three-sum', title: 'Three Sum', lcNumber: 15, category: 'two-pointers' },
      { id: 'trapping-rain-water', title: 'Trapping Rain Water', lcNumber: 42, category: 'two-pointers' },
    ],
  },
  {
    category: 'sliding-window',
    whenToUse:
      'When a problem asks for the longest or shortest contiguous subarray or substring satisfying a condition, grow the right edge freely and shrink the left edge conditionally.',
    signals: [
      '"Contiguous subarray" or "substring" with a max/min length constraint',
      'Fixed-size window: sum, average, or product over exactly k elements',
      'Longest run where a condition holds — e.g., at most k distinct characters',
      'Minimum window containing all required characters or elements',
    ],
    templates: [
      {
        title: 'Variable-size window',
        code: `left = 0
window = {}
result = 0
for right in range(len(s)):
    window[s[right]] = window.get(s[right], 0) + 1
    while not is_valid(window):   # shrink until valid
        window[s[left]] -= 1
        if window[s[left]] == 0:
            del window[s[left]]
        left += 1
    result = max(result, right - left + 1)`,
      },
      {
        title: 'Fixed-size window of size k',
        code: `window_sum = sum(nums[:k])
result = window_sum
for i in range(k, len(nums)):
    window_sum += nums[i] - nums[i - k]
    result = max(result, window_sum)`,
      },
    ],
    pitfalls: [
      'Updating the result inside the shrink loop instead of outside — misses valid states',
      'Using a dict for counts but not deleting the key when count reaches zero — size check breaks',
      'Conflating "at most k" vs "exactly k" — exactly k = (at most k) − (at most k−1)',
      'Shrinking the window when it is already empty — guard with left <= right before shrinking',
    ],
    keyProblems: [
      { id: 'best-time-to-buy-and-sell-stock', title: 'Best Time to Buy and Sell Stock', lcNumber: 121, category: 'sliding-window' },
      { id: 'minimum-window-substring', title: 'Minimum Window Substring', lcNumber: 76, category: 'sliding-window' },
      { id: 'longest-repeating-char-replacement', title: 'Longest Repeating Character Replacement', lcNumber: 424, category: 'sliding-window' },
    ],
  },
  {
    category: 'binary-search',
    whenToUse:
      'Binary search works on any monotonic yes/no boundary, not just sorted arrays. Use it when you can test a candidate answer cheaply and the search space is sorted or monotonically structured.',
    signals: [
      'Sorted or rotated-sorted input — find a target value',
      '"O(log n)" hinted in the problem constraints',
      '"Minimum X that satisfies condition Y" — binary search on the answer',
      '"Maximum X such that condition Z holds" — same idea, opposite direction',
      'Repeated halving: each test eliminates half the remaining search space',
    ],
    templates: [
      {
        title: 'Standard binary search (find exact target)',
        code: `left, right = 0, len(nums) - 1
while left <= right:
    mid = (left + right) // 2
    if nums[mid] == target:
        return mid
    elif nums[mid] < target:
        left = mid + 1
    else:
        right = mid - 1
return -1`,
      },
      {
        title: 'Binary search on answer (find minimum feasible value)',
        code: `left, right = lower_bound, upper_bound
while left < right:
    mid = (left + right) // 2
    if is_feasible(mid):
        right = mid        # mid could be the answer; don't exclude it
    else:
        left = mid + 1
return left`,
      },
    ],
    pitfalls: [
      'left <= right (find exact) vs left < right (find boundary) — mixing them causes off-by-one',
      'right = mid vs right = mid − 1 — if mid can be the answer, use right = mid',
      'Rotated sorted array: identify which half is sorted first, then decide which side the target is on',
      'Integer overflow on mid — (left + right) // 2 is safe in Python; in Java/C++ use left + (right − left) / 2',
    ],
    keyProblems: [
      { id: 'binary-search', title: 'Binary Search', lcNumber: 704, category: 'binary-search' },
      { id: 'search-in-rotated-sorted-array', title: 'Search in Rotated Sorted Array', lcNumber: 33, category: 'binary-search' },
      { id: 'koko-eating-bananas', title: 'Koko Eating Bananas', lcNumber: 875, category: 'binary-search' },
    ],
  },
  {
    category: 'linked-list',
    whenToUse:
      'Operate on linked structures with pointer surgery. Reversals, cycle detection, merges, and finding the middle all follow standard two-pointer or dummy-head patterns.',
    signals: [
      'Input is a ListNode — reversal, re-ordering, or restructuring in-place',
      '"Detect cycle" or "find the start of a cycle" — fast/slow pointers meet',
      '"Remove nth node from end" — unknown length requires a two-pointer or two-pass approach',
      '"Merge two sorted linked lists" — dummy head + pointer advance',
      '"Reorder list" — find the middle, reverse the second half, then interleave',
    ],
    templates: [
      {
        title: 'Iterative reversal',
        code: `prev, curr = None, head
while curr:
    nxt = curr.next   # save next BEFORE clobbering
    curr.next = prev
    prev = curr
    curr = nxt
return prev           # prev is now the new head`,
      },
      {
        title: 'Dummy head (merge / insertion)',
        code: `dummy = ListNode(0)
curr = dummy
while l1 and l2:
    if l1.val <= l2.val:
        curr.next = l1; l1 = l1.next
    else:
        curr.next = l2; l2 = l2.next
    curr = curr.next
curr.next = l1 or l2
return dummy.next`,
      },
    ],
    pitfalls: [
      'Clobbering curr.next before saving it — always do nxt = curr.next first',
      'Returning curr after reversal — curr is None at loop exit; return prev instead',
      'Forgetting edge cases: empty list (head is None) or a single-node list',
      'Fast/slow: check fast and fast.next before accessing fast.next.next to avoid AttributeError',
    ],
    keyProblems: [
      { id: 'reverse-linked-list', title: 'Reverse Linked List', lcNumber: 206, category: 'linked-list' },
      { id: 'merge-two-sorted-lists', title: 'Merge Two Sorted Lists', lcNumber: 21, category: 'linked-list' },
      { id: 'linked-list-cycle', title: 'Linked List Cycle', lcNumber: 141, category: 'linked-list' },
    ],
  },
  {
    category: 'trees',
    whenToUse:
      'For hierarchy problems: DFS recursion handles depth, paths, validation, and ancestor queries. BFS (level-order queue) handles anything that needs level-by-level processing or shortest distance in a tree.',
    signals: [
      'Input is a TreeNode — depth, height, diameter, or path problems',
      '"Level by level" — BFS with a queue, snapshot length before each level',
      '"Lowest common ancestor" or "validate BST" — DFS with bounds passed down',
      '"Mirror", "symmetric", or "same tree" — compare left and right subtrees recursively',
      '"Count good nodes", "path sum" — DFS carrying running state (max seen, current sum)',
    ],
    templates: [
      {
        title: 'DFS recursion (post-order)',
        code: `def dfs(node):
    if not node:
        return base_case
    left  = dfs(node.left)
    right = dfs(node.right)
    return combine(left, right, node.val)`,
      },
      {
        title: 'BFS level-order',
        code: `from collections import deque
q = deque([root])
while q:
    for _ in range(len(q)):   # snapshot size BEFORE the inner loop
        node = q.popleft()
        process(node)
        if node.left:  q.append(node.left)
        if node.right: q.append(node.right)`,
      },
    ],
    pitfalls: [
      'Missing the null base case — always return a sensible default when node is None',
      'BFS: not snapshotting len(q) before the inner loop — the queue grows as you process and levels blur together',
      'BST validation: comparing a node only to its direct parent misses deeper violations — pass down min/max bounds',
      'Pre/in/post confusion: post-order (children first) is most natural for computing an aggregate; in-order produces sorted values from a BST',
    ],
    keyProblems: [
      { id: 'invert-binary-tree', title: 'Invert Binary Tree', lcNumber: 226, category: 'trees' },
      { id: 'binary-tree-level-order-traversal', title: 'Binary Tree Level Order Traversal', lcNumber: 102, category: 'trees' },
      { id: 'validate-bst', title: 'Validate BST', lcNumber: 98, category: 'trees' },
    ],
  },
  {
    category: 'graphs',
    whenToUse:
      'For connectivity, regions, reachability, or dependency ordering in a network. BFS finds shortest paths in unweighted graphs; DFS reaches all reachable nodes; topological sort orders tasks with prerequisites.',
    signals: [
      'Grid with cells to flood-fill or count connected regions ("islands")',
      'Adjacency list — "path exists?" or "how many connected components?"',
      'Multi-source spreading: multiple starting points at time t=0 (e.g., rotten oranges)',
      'Prerequisite / dependency chain — detect a cycle or find a valid execution order',
      '"Clone graph" — traverse every node and reconstruct the structure',
    ],
    templates: [
      {
        title: 'BFS on adjacency list',
        code: `from collections import deque
q = deque([start])
visited = {start}
while q:
    node = q.popleft()
    for nei in graph[node]:
        if nei not in visited:
            visited.add(nei)   # mark BEFORE enqueuing, not after
            q.append(nei)`,
      },
      {
        title: 'DFS on a grid',
        code: `DIRS = [(0,1),(0,-1),(1,0),(-1,0)]

def dfs(r, c):
    if r < 0 or r >= rows or c < 0 or c >= cols:
        return
    if grid[r][c] != '1':
        return
    grid[r][c] = '0'   # mark visited in-place
    for dr, dc in DIRS:
        dfs(r + dr, c + dc)`,
      },
    ],
    pitfalls: [
      'Marking visited AFTER dequeue instead of BEFORE enqueue — duplicates flood the queue',
      'Forgetting to initialise visited before entering the loop — infinite loops on cycles',
      'Topological sort: if the result has fewer than n nodes, a cycle exists and no valid order is possible',
      'Multi-source BFS: push ALL sources into the queue at the start — not one round at a time',
    ],
    keyProblems: [
      { id: 'number-of-islands', title: 'Number of Islands', lcNumber: 200, category: 'graphs' },
      { id: 'clone-graph', title: 'Clone Graph', lcNumber: 133, category: 'graphs' },
      { id: 'course-schedule', title: 'Course Schedule', lcNumber: 207, category: 'graphs' },
    ],
  },
  {
    category: 'stack',
    whenToUse:
      'Reach for a stack when you need "most recently seen first" (LIFO) access: matching open/close pairs, evaluating nested expressions, or remembering the last element before backtracking.',
    signals: [
      'Parentheses or bracket matching ("valid parentheses", "decode string")',
      '"Next greater element" or "previous smaller element" — monotonic stack',
      'Expression evaluation (reverse-Polish notation, operators with precedence)',
      'Nested structure that unwinds cleanly from right to left',
      '"Undo" or "pop the most recent action"',
    ],
    templates: [
      {
        title: 'Bracket matching',
        code: `pairs = {')': '(', ']': '[', '}': '{'}
stack = []
for c in s:
    if c in '([{':
        stack.append(c)
    elif not stack or stack[-1] != pairs[c]:
        return False
    else:
        stack.pop()
return not stack   # must be empty after processing all characters`,
      },
      {
        title: 'Monotonic stack (next greater element)',
        code: `result = [-1] * len(nums)
stack = []   # stores indices
for i, n in enumerate(nums):
    while stack and nums[stack[-1]] < n:
        result[stack.pop()] = n
    stack.append(i)`,
      },
    ],
    pitfalls: [
      'Popping without checking if the stack is empty first — raises IndexError',
      'Forgetting the final check — after the loop, stack must be empty for fully balanced input',
      'Using list.pop(0) for a queue — pop(0) is O(n); use collections.deque for O(1) popleft',
    ],
    keyProblems: [
      { id: 'valid-parentheses', title: 'Valid Parentheses', lcNumber: 20, category: 'stack' },
    ],
  },
  {
    category: 'greedy',
    whenToUse:
      'When a locally optimal choice at each step provably leads to a global optimum — no backtracking required. Greedy needs a correctness argument (exchange argument or proof by contradiction), not just intuition.',
    signals: [
      'Maximum subarray sum — Kadane\'s picks the local best at every position',
      'Interval scheduling — sort by end time, always pick the earliest-finishing interval',
      '"Jump game" — check reachability greedily, extending the furthest reach',
      'A choice that is always safe to make without knowing future values',
    ],
    templates: [
      {
        title: "Kadane's algorithm (maximum subarray)",
        code: `curr = max_sum = nums[0]
for n in nums[1:]:
    curr = max(n, curr + n)   # start fresh or extend the current run?
    max_sum = max(max_sum, curr)`,
      },
      {
        title: 'Interval scheduling (greedy sort)',
        code: `intervals.sort(key=lambda x: x[1])  # sort by end time
end = float('-inf')
count = 0
for start, finish in intervals:
    if start >= end:
        count += 1
        end = finish`,
      },
    ],
    pitfalls: [
      'Applying greedy without proof — many problems that look greedy actually require DP',
      'Forgetting to sort before sweeping when the greedy choice depends on order',
      "Kadane's: initialise curr and max_sum to nums[0], not 0 — the array may be all negative",
    ],
    keyProblems: [
      { id: 'maximum-subarray', title: 'Maximum Subarray', lcNumber: 53, category: 'greedy' },
    ],
  },
  {
    category: 'dynamic-programming',
    whenToUse:
      'When a problem has overlapping subproblems (the same sub-computation recurs) and optimal substructure (the best full solution is composed of best sub-solutions). Define the state, write the recurrence, then memoize or tabulate.',
    signals: [
      '"How many ways to…" — counting distinct paths or combinations',
      '"Minimum cost / maximum profit" — optimizing over a sequence of decisions',
      '"Can you reach X?" — reachability with state that changes at each step',
      '"Longest/shortest subsequence" (non-contiguous — contiguous runs are sliding window)',
      'Decision at each step that restricts which future choices are available',
    ],
    templates: [
      {
        title: 'Top-down with memoization',
        code: `from functools import lru_cache

@lru_cache(maxsize=None)
def dp(i, j):
    if base_condition(i, j):
        return base_value
    return min(
        dp(i + 1, j),
        dp(i, j + 1),
    ) + cost[i][j]`,
      },
      {
        title: 'Bottom-up tabulation',
        code: `dp = [0] * (n + 1)
dp[0] = base_case

for i in range(1, n + 1):
    dp[i] = some_function(dp[i - 1], dp[i - 2], ...)`,
      },
    ],
    pitfalls: [
      'Wrong base cases — the most common cause of off-by-one errors in DP',
      'Under-specified state — if two different situations share the same index, the memo gives wrong answers',
      'Bottom-up fill order: earlier states must be computed before the states that depend on them',
      'Confusing subsequence (DP, non-contiguous) with subarray (sliding window, contiguous)',
    ],
    keyProblems: [
      { id: 'valid-palindrome-iii', title: 'Valid Palindrome III', lcNumber: 1312, category: 'dynamic-programming' },
    ],
  },
];

export const CHEAT_SHEET_MAP: Record<Category, CheatSheet> = Object.fromEntries(
  CHEAT_SHEETS.map((s) => [s.category, s])
) as Record<Category, CheatSheet>;

export const CATEGORY_ORDER: Category[] = CHEAT_SHEETS.map((s) => s.category);
