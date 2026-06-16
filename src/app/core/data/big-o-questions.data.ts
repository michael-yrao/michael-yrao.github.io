import { Category } from '../models/algorithm.model';

export interface BigOQuestion {
  id: string;
  context: string;
  code: string;
  timeOptions: string[];
  spaceOptions: string[];
  correctTime: string;
  correctSpace: string;
  timeExplanation: string;
  spaceExplanation: string;
  category: Category;
  linkedProblemId?: string;
  linkedProblemTitle?: string;
  linkedProblemLcNumber?: number;
  linkedProblemCategory?: Category;
}

export const BIG_O_QUESTIONS: BigOQuestion[] = [
  {
    id: 'two-sum',
    context: 'Find two indices in an array whose values sum to a target.',
    code: `def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        complement = target - x
        if complement in seen:
            return [seen[complement], i]
        seen[x] = i
    return []`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n)',
    correctSpace: 'O(n)',
    timeExplanation:
      'One pass through n elements. Each hash map lookup and insert is O(1), so the loop runs in O(n) total.',
    spaceExplanation:
      'The hash map stores at most n entries (one per element), so space is O(n).',
    category: 'arrays-hash',
    linkedProblemId: 'two-sum',
    linkedProblemTitle: 'Two Sum',
    linkedProblemLcNumber: 1,
    linkedProblemCategory: 'arrays-hash',
  },
  {
    id: 'contains-duplicate',
    context: 'Return true if any value appears at least twice in an array.',
    code: `def contains_duplicate(nums):
    seen = set()
    for x in nums:
        if x in seen:
            return True
        seen.add(x)
    return False`,
    timeOptions: ['O(1)', 'O(n)', 'O(n log n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n)',
    correctSpace: 'O(n)',
    timeExplanation:
      'One pass. Each set lookup and add is O(1) on average, giving O(n) overall.',
    spaceExplanation:
      'The set can hold up to n distinct elements in the worst case, so space is O(n).',
    category: 'arrays-hash',
    linkedProblemId: 'contains-duplicate',
    linkedProblemTitle: 'Contains Duplicate',
    linkedProblemLcNumber: 217,
    linkedProblemCategory: 'arrays-hash',
  },
  {
    id: 'valid-palindrome',
    context: 'Check whether a string is a palindrome ignoring non-alphanumeric characters.',
    code: `def is_palindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each character is visited at most once by the left or right pointer, so the total work is O(n).',
    spaceExplanation:
      'Only two pointer variables — no extra data structures. Space is O(1).',
    category: 'two-pointers',
    linkedProblemId: 'valid-palindrome',
    linkedProblemTitle: 'Valid Palindrome',
    linkedProblemLcNumber: 125,
    linkedProblemCategory: 'two-pointers',
  },
  {
    id: 'best-time-buy-sell',
    context: 'Find the maximum profit from a single buy-sell of a stock given daily prices.',
    code: `def max_profit(prices):
    min_price = float('inf')
    max_profit = 0
    for p in prices:
        min_price = min(min_price, p)
        max_profit = max(max_profit, p - min_price)
    return max_profit`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Single pass through the prices array. Each iteration does O(1) work, giving O(n) total.',
    spaceExplanation:
      'Two scalar variables (min_price, max_profit). Space is O(1).',
    category: 'sliding-window',
    linkedProblemId: 'best-time-to-buy-and-sell-stock',
    linkedProblemTitle: 'Best Time to Buy and Sell Stock',
    linkedProblemLcNumber: 121,
    linkedProblemCategory: 'sliding-window',
  },
  {
    id: 'binary-search',
    context: 'Find a target value in a sorted array.',
    code: `def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(log n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each iteration halves the search space. Starting from n, after k iterations only n/2ᵏ elements remain, so k = log₂(n) iterations suffice — O(log n).',
    spaceExplanation:
      'Only the left, right, and mid variables. Space is O(1).',
    category: 'binary-search',
    linkedProblemId: 'binary-search',
    linkedProblemTitle: 'Binary Search',
    linkedProblemLcNumber: 704,
    linkedProblemCategory: 'binary-search',
  },
  {
    id: 'reverse-linked-list-iterative',
    context: 'Reverse a singly linked list in-place (iterative approach).',
    code: `def reverse_list(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev
        prev = curr
        curr = nxt
    return prev`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each node is visited exactly once. The loop runs n times, giving O(n).',
    spaceExplanation:
      'Only prev, curr, and nxt pointers are used. No extra data structures. Space is O(1).',
    category: 'linked-list',
    linkedProblemId: 'reverse-linked-list',
    linkedProblemTitle: 'Reverse Linked List',
    linkedProblemLcNumber: 206,
    linkedProblemCategory: 'linked-list',
  },
  {
    id: 'reverse-linked-list-recursive',
    context: 'Reverse a singly linked list in-place (recursive approach).',
    code: `def reverse_list(head):
    if not head or not head.next:
        return head
    new_head = reverse_list(head.next)
    head.next.next = head
    head.next = None
    return new_head`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n)',
    correctSpace: 'O(n)',
    timeExplanation:
      'n recursive calls, each doing O(1) work. Same O(n) time as the iterative version.',
    spaceExplanation:
      'Each recursive call occupies a stack frame. With n nodes, there are n frames on the call stack simultaneously — O(n) space. This is the key difference from the iterative approach.',
    category: 'linked-list',
    linkedProblemId: 'reverse-linked-list',
    linkedProblemTitle: 'Reverse Linked List',
    linkedProblemLcNumber: 206,
    linkedProblemCategory: 'linked-list',
  },
  {
    id: 'max-depth-tree',
    context: 'Find the maximum depth of a binary tree using recursion.',
    code: `def max_depth(root):
    if not root:
        return 0
    left  = max_depth(root.left)
    right = max_depth(root.right)
    return 1 + max(left, right)`,
    timeOptions: ['O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n)',
    correctSpace: 'O(n)',
    timeExplanation:
      'Every node is visited exactly once. n nodes → O(n) total work.',
    spaceExplanation:
      'The recursion depth equals the height of the tree. In the worst case (a skewed tree with n nodes all in one branch), the call stack holds n frames — O(n). For a balanced tree, this is O(log n).',
    category: 'trees',
    linkedProblemId: 'max-depth-of-binary-tree',
    linkedProblemTitle: 'Maximum Depth of Binary Tree',
    linkedProblemLcNumber: 104,
    linkedProblemCategory: 'trees',
  },
  {
    id: 'number-of-islands',
    context: 'Count connected components of land cells ("1") in a grid.',
    code: `def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    def dfs(r, c):
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return
        if grid[r][c] != '1':
            return
        grid[r][c] = '0'
        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1)
    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1
    return count`,
    timeOptions: ['O(n)', 'O(n log n)', 'O(m×n)', 'O(m×n log(m×n))'],
    spaceOptions: ['O(1)', 'O(m+n)', 'O(m×n)', 'O(n²)'],
    correctTime: 'O(m×n)',
    correctSpace: 'O(m×n)',
    timeExplanation:
      'Every cell is visited at most once by DFS (marked "0" to avoid revisiting). With m rows and n columns, total work is O(m×n).',
    spaceExplanation:
      'The DFS call stack can be as deep as m×n in the worst case (e.g., a grid of all land in a spiral), giving O(m×n) space.',
    category: 'graphs',
    linkedProblemId: 'number-of-islands',
    linkedProblemTitle: 'Number of Islands',
    linkedProblemLcNumber: 200,
    linkedProblemCategory: 'graphs',
  },
  {
    id: 'valid-parentheses',
    context: 'Determine whether a string of brackets is valid (correctly matched and ordered).',
    code: `def is_valid(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for c in s:
        if c in '([{':
            stack.append(c)
        elif not stack or stack[-1] != pairs[c]:
            return False
        else:
            stack.pop()
    return not stack`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(n)',
    timeExplanation:
      'Each character is processed once. Every append and pop is O(1), giving O(n) total.',
    spaceExplanation:
      'In the worst case (all open brackets), the stack holds n/2 items — O(n) space.',
    category: 'stack',
    linkedProblemId: 'valid-parentheses',
    linkedProblemTitle: 'Valid Parentheses',
    linkedProblemLcNumber: 20,
    linkedProblemCategory: 'stack',
  },
  {
    id: 'maximum-subarray',
    context: "Find the contiguous subarray with the largest sum (Kadane's algorithm).",
    code: `def max_subarray(nums):
    curr = max_sum = nums[0]
    for n in nums[1:]:
        curr = max(n, curr + n)
        max_sum = max(max_sum, curr)
    return max_sum`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Single pass through n elements, each requiring O(1) work. Total: O(n).',
    spaceExplanation:
      'Only two scalar variables (curr, max_sum). Space is O(1).',
    category: 'greedy',
    linkedProblemId: 'maximum-subarray',
    linkedProblemTitle: 'Maximum Subarray',
    linkedProblemLcNumber: 53,
    linkedProblemCategory: 'greedy',
  },
  {
    id: 'three-sum',
    context: 'Find all unique triplets in a sorted array that sum to zero.',
    code: `def three_sum(nums):
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i-1]:
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            s = nums[i] + nums[left] + nums[right]
            if s == 0:
                result.append([nums[i], nums[left], nums[right]])
                while left < right and nums[left] == nums[left+1]: left += 1
                while left < right and nums[right] == nums[right-1]: right -= 1
                left += 1; right -= 1
            elif s < 0: left += 1
            else: right -= 1
    return result`,
    timeOptions: ['O(n)', 'O(n log n)', 'O(n²)', 'O(n³)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n²)',
    correctSpace: 'O(log n)',
    timeExplanation:
      'Sorting is O(n log n). The outer loop runs n times; for each index, the two-pointer sweep is O(n). Total: O(n²) dominates.',
    spaceExplanation:
      'No extra data structures beyond the output list (not counted). The sort uses O(log n) stack space. Space is O(log n).',
    category: 'two-pointers',
    linkedProblemId: 'three-sum',
    linkedProblemTitle: 'Three Sum',
    linkedProblemLcNumber: 15,
    linkedProblemCategory: 'two-pointers',
  },
  {
    id: 'top-k-frequent',
    context: 'Return the k most frequent elements using bucket sort.',
    code: `def top_k_frequent(nums, k):
    freq = {}
    for n in nums:
        freq[n] = freq.get(n, 0) + 1
    buckets = [[] for _ in range(len(nums) + 1)]
    for num, count in freq.items():
        buckets[count].append(num)
    result = []
    for i in range(len(buckets) - 1, -1, -1):
        result.extend(buckets[i])
        if len(result) >= k:
            return result[:k]`,
    timeOptions: ['O(n)', 'O(n log n)', 'O(n log k)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(k)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n)',
    correctSpace: 'O(n)',
    timeExplanation:
      'Building the frequency map is O(n). Filling and scanning the n+1 buckets is also O(n). No sorting, so this beats the heap approach.',
    spaceExplanation:
      'The frequency map and the n+1 buckets together hold at most n elements — O(n) space.',
    category: 'arrays-hash',
    linkedProblemId: 'top-k-frequent-elements',
    linkedProblemTitle: 'Top K Frequent Elements',
    linkedProblemLcNumber: 347,
    linkedProblemCategory: 'arrays-hash',
  },
  {
    id: 'group-anagrams',
    context: 'Group strings that are anagrams of each other, using a sorted key.',
    code: `def group_anagrams(strs):
    groups = {}
    for s in strs:
        key = tuple(sorted(s))
        groups.setdefault(key, []).append(s)
    return list(groups.values())`,
    timeOptions: ['O(n)', 'O(n log n)', 'O(n·k log k)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(n)', 'O(n·k)', 'O(n²)'],
    correctTime: 'O(n·k log k)',
    correctSpace: 'O(n·k)',
    timeExplanation:
      'For each of the n strings, sorting takes O(k log k) where k is the string length. Total: O(n·k log k).',
    spaceExplanation:
      'The hash map stores all n strings, each of length up to k. Space is O(n·k).',
    category: 'arrays-hash',
    linkedProblemId: 'group-anagrams',
    linkedProblemTitle: 'Group Anagrams',
    linkedProblemLcNumber: 49,
    linkedProblemCategory: 'arrays-hash',
  },
  {
    id: 'trapping-rain-water',
    context: 'Calculate how much water is trapped between elevation bars (two-pointer approach).',
    code: `def trap(height):
    left, right = 0, len(height) - 1
    left_max = right_max = water = 0
    while left < right:
        if height[left] < height[right]:
            if height[left] >= left_max:
                left_max = height[left]
            else:
                water += left_max - height[left]
            left += 1
        else:
            if height[right] >= right_max:
                right_max = height[right]
            else:
                water += right_max - height[right]
            right -= 1
    return water`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each element is processed once by the left or right pointer. Single pass → O(n).',
    spaceExplanation:
      'Only left, right, left_max, right_max, and water — all scalar. Space is O(1).',
    category: 'two-pointers',
    linkedProblemId: 'trapping-rain-water',
    linkedProblemTitle: 'Trapping Rain Water',
    linkedProblemLcNumber: 42,
    linkedProblemCategory: 'two-pointers',
  },
  {
    id: 'koko-eating-bananas',
    context: 'Find the minimum eating speed such that all piles are finished in h hours.',
    code: `def min_eating_speed(piles, h):
    left, right = 1, max(piles)
    while left < right:
        mid = (left + right) // 2
        hours = sum(math.ceil(p / mid) for p in piles)
        if hours <= h:
            right = mid
        else:
            left = mid + 1
    return left`,
    timeOptions: ['O(log n)', 'O(n)', 'O(n log n)', 'O(n log m)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(log m)'],
    correctTime: 'O(n log m)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Binary search over speeds 1..m (where m = max pile) runs O(log m) iterations. Each iteration scans all n piles to compute hours. Total: O(n log m).',
    spaceExplanation:
      'Only scalar variables are used. Space is O(1).',
    category: 'binary-search',
    linkedProblemId: 'koko-eating-bananas',
    linkedProblemTitle: 'Koko Eating Bananas',
    linkedProblemLcNumber: 875,
    linkedProblemCategory: 'binary-search',
  },
  {
    id: 'level-order-traversal',
    context: 'Collect the values of a binary tree level by level using BFS.',
    code: `from collections import deque
def level_order(root):
    if not root:
        return []
    result, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):
            node = q.popleft()
            level.append(node.val)
            if node.left:  q.append(node.left)
            if node.right: q.append(node.right)
        result.append(level)
    return result`,
    timeOptions: ['O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n)',
    correctSpace: 'O(n)',
    timeExplanation:
      'Every node is enqueued and dequeued exactly once. Total: O(n).',
    spaceExplanation:
      'The queue holds at most one full level at a time. In the widest level of a balanced binary tree, that is n/2 nodes — O(n) space.',
    category: 'trees',
    linkedProblemId: 'binary-tree-level-order-traversal',
    linkedProblemTitle: 'Binary Tree Level Order Traversal',
    linkedProblemLcNumber: 102,
    linkedProblemCategory: 'trees',
  },
  {
    id: 'clone-graph',
    context: 'Deep-copy an undirected graph, visiting each node exactly once.',
    code: `def clone_graph(node):
    if not node:
        return None
    clones = {}
    def dfs(n):
        if n in clones:
            return clones[n]
        clone = Node(n.val)
        clones[n] = clone
        for nei in n.neighbors:
            clone.neighbors.append(dfs(nei))
        return clone
    return dfs(node)`,
    timeOptions: ['O(V)', 'O(V+E)', 'O(V²)', 'O(V·E)'],
    spaceOptions: ['O(1)', 'O(V)', 'O(V+E)', 'O(V²)'],
    correctTime: 'O(V+E)',
    correctSpace: 'O(V)',
    timeExplanation:
      'Each vertex is cloned once (O(V)) and each edge is traversed once when building neighbor lists (O(E)). Total: O(V+E).',
    spaceExplanation:
      'The clones map holds one entry per vertex — O(V). The DFS call stack is at most O(V) deep. Space: O(V).',
    category: 'graphs',
    linkedProblemId: 'clone-graph',
    linkedProblemTitle: 'Clone Graph',
    linkedProblemLcNumber: 133,
    linkedProblemCategory: 'graphs',
  },
  {
    id: 'course-schedule',
    context: 'Detect whether a cycle exists in a directed prerequisite graph.',
    code: `from collections import defaultdict
def can_finish(numCourses, prerequisites):
    graph = defaultdict(list)
    for a, b in prerequisites:
        graph[b].append(a)
    state = [0] * numCourses  # 0=unvisited 1=visiting 2=done
    def dfs(node):
        if state[node] == 1: return False  # cycle
        if state[node] == 2: return True   # already cleared
        state[node] = 1
        for nei in graph[node]:
            if not dfs(nei): return False
        state[node] = 2
        return True
    return all(dfs(i) for i in range(numCourses))`,
    timeOptions: ['O(V)', 'O(V+E)', 'O(V²)', 'O(V·E)'],
    spaceOptions: ['O(V)', 'O(V+E)', 'O(V²)', 'O(V·E)'],
    correctTime: 'O(V+E)',
    correctSpace: 'O(V+E)',
    timeExplanation:
      'Building the graph is O(E). Each node is fully processed once in DFS — O(V+E) total.',
    spaceExplanation:
      'The adjacency list stores all V nodes and E edges — O(V+E). The state array and call stack add O(V). Total: O(V+E).',
    category: 'graphs',
    linkedProblemId: 'course-schedule',
    linkedProblemTitle: 'Course Schedule',
    linkedProblemLcNumber: 207,
    linkedProblemCategory: 'graphs',
  },
  {
    id: 'merge-two-sorted-lists',
    context: 'Merge two sorted linked lists into one sorted list in-place.',
    code: `def merge(l1, l2):
    dummy = ListNode(0)
    curr = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            curr.next = l1; l1 = l1.next
        else:
            curr.next = l2; l2 = l2.next
        curr = curr.next
    curr.next = l1 or l2
    return dummy.next`,
    timeOptions: ['O(m+n)', 'O(m·n)', 'O(n)', 'O(n log n)'],
    spaceOptions: ['O(1)', 'O(m+n)', 'O(m)', 'O(n)'],
    correctTime: 'O(m+n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each node from both lists is visited at most once. With m and n nodes respectively, total work is O(m+n).',
    spaceExplanation:
      'Only the dummy head and curr pointer — no new nodes are created. Space is O(1).',
    category: 'linked-list',
    linkedProblemId: 'merge-two-sorted-lists',
    linkedProblemTitle: 'Merge Two Sorted Lists',
    linkedProblemLcNumber: 21,
    linkedProblemCategory: 'linked-list',
  },
  {
    id: 'product-except-self',
    context: 'Return an array where each element is the product of all other elements (no division).',
    code: `def product_except_self(nums):
    n = len(nums)
    result = [1] * n
    prefix = 1
    for i in range(n):
        result[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(n - 1, -1, -1):
        result[i] *= suffix
        suffix *= nums[i]
    return result`,
    timeOptions: ['O(1)', 'O(n)', 'O(n log n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Two passes through the array, each O(n). Total: O(n).',
    spaceExplanation:
      'The output array does not count as extra space by convention. Only two scalar accumulators (prefix, suffix) are used — O(1).',
    category: 'arrays-hash',
    linkedProblemId: 'product-of-array-except-self',
    linkedProblemTitle: 'Product of Array Except Self',
    linkedProblemLcNumber: 238,
    linkedProblemCategory: 'arrays-hash',
  },
  {
    id: 'rotting-oranges',
    context: 'Find the minimum time (in minutes) for all fresh oranges to rot via BFS spreading.',
    code: `from collections import deque
def oranges_rotting(grid):
    rows, cols = len(grid), len(grid[0])
    q, fresh = deque(), 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2: q.append((r, c, 0))
            elif grid[r][c] == 1: fresh += 1
    minutes = 0
    dirs = [(0,1),(0,-1),(1,0),(-1,0)]
    while q:
        r, c, t = q.popleft()
        for dr, dc in dirs:
            nr, nc = r+dr, c+dc
            if 0<=nr<rows and 0<=nc<cols and grid[nr][nc]==1:
                grid[nr][nc] = 2
                fresh -= 1
                q.append((nr, nc, t+1))
                minutes = t+1
    return minutes if fresh == 0 else -1`,
    timeOptions: ['O(n)', 'O(n log n)', 'O(m+n)', 'O(m×n)'],
    spaceOptions: ['O(1)', 'O(m+n)', 'O(m×n)', 'O(n²)'],
    correctTime: 'O(m×n)',
    correctSpace: 'O(m×n)',
    timeExplanation:
      'Every cell is enqueued at most once. With m rows and n columns, total work is O(m×n).',
    spaceExplanation:
      'The BFS queue can hold up to m×n cells in the worst case — O(m×n) space.',
    category: 'graphs',
    linkedProblemId: 'rotting-oranges',
    linkedProblemTitle: 'Rotting Oranges',
    linkedProblemLcNumber: 994,
    linkedProblemCategory: 'graphs',
  },
  {
    id: 'remove-nth-from-end',
    context: 'Remove the nth node from the end of a linked list in a single pass.',
    code: `def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n + 1):
        fast = fast.next
    while fast:
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next
    return dummy.next`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'The fast pointer advances n+1 steps, then both pointers walk the rest of the list — at most L steps total where L is the list length. Single pass: O(n).',
    spaceExplanation:
      'Only the dummy node and two pointer variables. Space is O(1).',
    category: 'linked-list',
    linkedProblemId: 'remove-nth-node-from-end',
    linkedProblemTitle: 'Remove Nth Node From End',
    linkedProblemLcNumber: 19,
    linkedProblemCategory: 'linked-list',
  },
  {
    id: 'longest-consecutive-sequence',
    context: 'Find the length of the longest consecutive integer sequence in an unsorted array.',
    code: `def longest_consecutive(nums):
    num_set = set(nums)
    best = 0
    for n in num_set:
        if n - 1 not in num_set:   # start of a sequence
            curr, length = n, 1
            while curr + 1 in num_set:
                curr += 1
                length += 1
            best = max(best, length)
    return best`,
    timeOptions: ['O(1)', 'O(n)', 'O(n log n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n)',
    correctSpace: 'O(n)',
    timeExplanation:
      'Each number is the start of a sequence at most once. The inner while-loop extends each sequence, but across all iterations its total steps equal n. Overall: O(n).',
    spaceExplanation:
      'The set holds all n numbers — O(n) space.',
    category: 'arrays-hash',
    linkedProblemId: 'longest-consecutive-sequence',
    linkedProblemTitle: 'Longest Consecutive Sequence',
    linkedProblemLcNumber: 128,
    linkedProblemCategory: 'arrays-hash',
  },
  {
    id: 'search-rotated',
    context: 'Search for a target in a rotated sorted array using binary search.',
    code: `def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[left] <= nums[mid]:          # left half is sorted
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:                                # right half is sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(log n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Even with a rotation, each iteration still halves the search space. Total: O(log n).',
    spaceExplanation:
      'Only pointer variables — no auxiliary data structures. Space is O(1).',
    category: 'binary-search',
    linkedProblemId: 'search-in-rotated-sorted-array',
    linkedProblemTitle: 'Search in Rotated Sorted Array',
    linkedProblemLcNumber: 33,
    linkedProblemCategory: 'binary-search',
  },
  {
    id: 'linked-list-cycle',
    context: 'Detect whether a linked list contains a cycle using fast/slow pointers.',
    code: `def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'If there is no cycle, fast reaches None in O(n) steps. If there is a cycle, slow and fast meet within O(n) steps of fast entering the cycle. Total: O(n).',
    spaceExplanation:
      'Only two pointer variables — no visited set needed. Space is O(1), which is the advantage of this approach over a hash set.',
    category: 'linked-list',
    linkedProblemId: 'linked-list-cycle',
    linkedProblemTitle: 'Linked List Cycle',
    linkedProblemLcNumber: 141,
    linkedProblemCategory: 'linked-list',
  },
];
