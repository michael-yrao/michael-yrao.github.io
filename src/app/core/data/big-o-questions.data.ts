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
    num_map = {}
    for index, number in enumerate(nums):
        diff = target - number
        if diff in num_map:
            return [num_map[diff], index]
        num_map[number] = index
    return`,
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
    nums_set = set()
    for integer in nums:
        if integer in nums_set:
            return True
        else:
            nums_set.add(integer)
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
    def alphanumeric(char):
        return (
            ord('A') <= ord(char) <= ord('Z') or
            ord('a') <= ord(char) <= ord('z') or
            ord('0') <= ord(char) <= ord('9')
        )
    l, r = 0, len(s) - 1
    while r >= l:
        while l < r and not alphanumeric(s[l]):
            l += 1
        while r > l and not alphanumeric(s[r]):
            r -= 1
        if s[r].lower() != s[l].lower():
            return False
        r -= 1
        l += 1
    return True`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each character is visited at most once by the left or right pointer, so the total work is O(n).',
    spaceExplanation:
      'Only two pointer variables and a constant-size helper — no extra data structures. Space is O(1).',
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
    current_max = 0
    l, r = 0, 1
    while r < len(prices):
        current_max = max(current_max, prices[r] - prices[l])
        if prices[r] < prices[l]:
            l = r
        r += 1
    return current_max`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Single pass through the prices array. The right pointer r advances each iteration, so the loop runs n-1 times — O(n).',
    spaceExplanation:
      'Only three scalar variables (current_max, l, r). Space is O(1).',
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
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = l + (r - l) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] > target:
            r = mid - 1
        else:
            l = mid + 1
    return -1`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(log n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each iteration halves the search space. Starting from n, after k iterations only n/2ᵏ elements remain, so k = log₂(n) iterations suffice — O(log n).',
    spaceExplanation:
      'Only the l, r, and mid variables. Space is O(1).',
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
    prev, current = None, head
    while current is not None:
        temp = current.next
        current.next = prev
        prev = current
        current = temp
    return prev`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each node is visited exactly once. The loop runs n times, giving O(n).',
    spaceExplanation:
      'Only prev, current, and temp pointers are used. No extra data structures. Space is O(1).',
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
    if head is None or head.next is None:
        return head
    return_node = reverse_list(head.next)
    head.next.next = head
    head.next = None
    return return_node`,
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
    return 1 + max(max_depth(root.left), max_depth(root.right))`,
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
    visited = set()
    result = 0
    rows, cols = len(grid), len(grid[0])

    def dfs(row, col):
        if row < 0 or row >= rows or col < 0 or col >= cols:
            return 0
        if grid[row][col] == '0':
            return 0
        if (row, col) in visited:
            return 0
        visited.add((row, col))
        dfs(row + 1, col)
        dfs(row - 1, col)
        dfs(row, col + 1)
        dfs(row, col - 1)
        return 1

    for row in range(rows):
        for col in range(cols):
            if grid[row][col] == '1' and (row, col) not in visited:
                result += dfs(row, col)
    return result`,
    timeOptions: ['O(n)', 'O(n log n)', 'O(m×n)', 'O(m×n log(m×n))'],
    spaceOptions: ['O(1)', 'O(m+n)', 'O(m×n)', 'O(n²)'],
    correctTime: 'O(m×n)',
    correctSpace: 'O(m×n)',
    timeExplanation:
      'Every cell is added to the visited set at most once. DFS processes each cell exactly once. With m rows and n columns, total work is O(m×n).',
    spaceExplanation:
      'The visited set stores up to m×n coordinates. The DFS call stack can reach depth m×n in the worst case (e.g., all land in one connected spiral). Both contribute O(m×n) space.',
    category: 'graphs',
    linkedProblemId: 'number-of-islands',
    linkedProblemTitle: 'Number of Islands',
    linkedProblemLcNumber: 200,
    linkedProblemCategory: 'graphs',
  },
  {
    id: 'valid-parentheses',
    context: 'Determine whether a string of brackets is valid (correctly matched and ordered).',
    code: `from collections import deque

def is_valid(s):
    open_to_close = {'(': ')', '{': '}', '[': ']'}
    stack = deque()
    for char in s:
        if char in open_to_close.values():
            if not stack or open_to_close.get(stack[-1], None) != char:
                return False
            stack.pop()
        if char in open_to_close:
            stack.append(char)
    return not stack`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(n)',
    timeExplanation:
      'Each character is processed once. Every append and pop is O(1), giving O(n) total.',
    spaceExplanation:
      'In the worst case (all open brackets), the stack holds n items — O(n) space.',
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
    max_sum = current_sum = nums[0]
    for n in nums[1:]:
        current_sum = max(n, current_sum + n)
        max_sum = max(max_sum, current_sum)
    return max_sum`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Single pass through n elements, each requiring O(1) work. Total: O(n).',
    spaceExplanation:
      'Only two scalar variables (max_sum, current_sum). Space is O(1).',
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
    solution_set = set()
    for i in range(len(nums)):
        j, k = i + 1, len(nums) - 1
        while j < k:
            total = nums[i] + nums[j] + nums[k]
            if total == 0:
                solution_set.add((nums[i], nums[j], nums[k]))
                j += 1
                k -= 1
            elif total > 0:
                k -= 1
            else:
                j += 1
    return list(solution_set)`,
    timeOptions: ['O(n)', 'O(n log n)', 'O(n²)', 'O(n³)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n²)',
    correctSpace: 'O(log n)',
    timeExplanation:
      'Sorting is O(n log n). The outer loop runs n times; for each index, the two-pointer sweep is O(n). Total: O(n²) dominates.',
    spaceExplanation:
      'The solution_set stores the output (excluded by convention). The sort uses O(log n) call stack space. Space is O(log n).',
    category: 'two-pointers',
    linkedProblemId: 'three-sum',
    linkedProblemTitle: 'Three Sum',
    linkedProblemLcNumber: 15,
    linkedProblemCategory: 'two-pointers',
  },
  {
    id: 'top-k-frequent',
    context: 'Return the k most frequent elements using a min-heap of size k.',
    code: `import heapq

def top_k_frequent(nums, k):
    freq_map = {}
    for n in nums:
        freq_map[n] = 1 + freq_map.get(n, 0)
    heap = []
    for num in freq_map.keys():
        heapq.heappush(heap, (freq_map[num], num))
        if len(heap) > k:
            heapq.heappop(heap)
    result = []
    for freq, value in heap:
        result.append(value)
    return result`,
    timeOptions: ['O(n)', 'O(n log n)', 'O(n log k)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(k)', 'O(n)', 'O(n²)'],
    correctTime: 'O(n log k)',
    correctSpace: 'O(n)',
    timeExplanation:
      'Building the frequency map is O(n). For each of the up to n unique elements we push/pop a heap of size k — O(log k) per operation, O(n log k) total.',
    spaceExplanation:
      'The frequency map stores up to n entries — O(n). The heap holds at most k+1 elements at a time — O(k). The map dominates: O(n).',
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
    anagram_map = {}
    for s in strs:
        sorted_str = ''.join(sorted(s))
        if sorted_str not in anagram_map:
            anagram_map[sorted_str] = []
        anagram_map[sorted_str].append(s)
    return list(anagram_map.values())`,
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
    if not height:
        return 0
    l, r = 0, len(height) - 1
    left_max, right_max = height[l], height[r]
    res = 0
    while l < r:
        if left_max < right_max:
            l += 1
            left_max = max(left_max, height[l])
            res += left_max - height[l]
        else:
            r -= 1
            right_max = max(right_max, height[r])
            res += right_max - height[r]
    return res`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each element is processed once by the left or right pointer. Single pass → O(n).',
    spaceExplanation:
      'Only l, r, left_max, right_max, and res — all scalars. Space is O(1).',
    category: 'two-pointers',
    linkedProblemId: 'trapping-rain-water',
    linkedProblemTitle: 'Trapping Rain Water',
    linkedProblemLcNumber: 42,
    linkedProblemCategory: 'two-pointers',
  },
  {
    id: 'koko-eating-bananas',
    context: 'Find the minimum eating speed such that all piles are finished in h hours.',
    code: `import math

def min_eating_speed(piles, h):
    l, r = 1, max(piles)
    while l < r:
        mid = (l + r) // 2
        current_hours = 0
        for pile in piles:
            current_hours += math.ceil(pile / mid)
        if current_hours > h:
            l = mid + 1
        else:
            r = mid
    return l`,
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
    queue = deque()
    queue.append(root)
    result = []
    while queue:
        size = len(queue)
        current_level = []
        for _ in range(size):
            node = queue.popleft()
            current_level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(current_level)
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
    old_to_new = {}

    def dfs(old_node):
        if old_node in old_to_new:
            return old_to_new[old_node]
        new_node = Node(old_node.val)
        old_to_new[old_node] = new_node
        for neighbor in old_node.neighbors:
            new_node.neighbors.append(dfs(neighbor))
        return new_node

    return dfs(node)`,
    timeOptions: ['O(V)', 'O(V+E)', 'O(V²)', 'O(V·E)'],
    spaceOptions: ['O(1)', 'O(V)', 'O(V+E)', 'O(V²)'],
    correctTime: 'O(V+E)',
    correctSpace: 'O(V)',
    timeExplanation:
      'Each vertex is cloned once (O(V)) and each edge is traversed once when building neighbor lists (O(E)). Total: O(V+E).',
    spaceExplanation:
      'The old_to_new map holds one entry per vertex — O(V). The DFS call stack is at most O(V) deep. Space: O(V).',
    category: 'graphs',
    linkedProblemId: 'clone-graph',
    linkedProblemTitle: 'Clone Graph',
    linkedProblemLcNumber: 133,
    linkedProblemCategory: 'graphs',
  },
  {
    id: 'course-schedule',
    context: 'Determine if all courses can be finished given their prerequisites (detect if a valid ordering exists).',
    code: `import collections

def can_finish(num_courses, prerequisites):
    prereq_counter = [0] * num_courses
    neighbor_map = collections.defaultdict(list)
    can_take = collections.deque()
    courses_taken = 0

    for row in prerequisites:
        course, prereq = row[0], row[1]
        prereq_counter[course] += 1
        neighbor_map[prereq].append(course)

    for i in range(len(prereq_counter)):
        if prereq_counter[i] == 0:
            can_take.append(i)

    while can_take:
        current = can_take.popleft()
        courses_taken += 1
        for dep in neighbor_map[current]:
            prereq_counter[dep] -= 1
            if prereq_counter[dep] == 0:
                can_take.append(dep)

    return courses_taken >= num_courses`,
    timeOptions: ['O(V)', 'O(V+E)', 'O(V²)', 'O(V·E)'],
    spaceOptions: ['O(V)', 'O(V+E)', 'O(V²)', 'O(V·E)'],
    correctTime: 'O(V+E)',
    correctSpace: 'O(V+E)',
    timeExplanation:
      'Building the adjacency list and prereq counter is O(E). BFS (Kahn\'s algorithm) processes each course once and each edge once — O(V+E) total.',
    spaceExplanation:
      'The adjacency list stores all edges O(E), the prereq counter and queue store all nodes O(V). Total: O(V+E).',
    category: 'graphs',
    linkedProblemId: 'course-schedule',
    linkedProblemTitle: 'Course Schedule',
    linkedProblemLcNumber: 207,
    linkedProblemCategory: 'graphs',
  },
  {
    id: 'merge-two-sorted-lists',
    context: 'Merge two sorted linked lists into one sorted list in-place.',
    code: `def merge_two_lists(list1, list2):
    dummy = ListNode(-101)
    current = dummy
    while list1 and list2:
        if list1.val < list2.val:
            current.next = list1
            list1 = list1.next
        else:
            current.next = list2
            list2 = list2.next
        current = current.next
    if list1:
        current.next = list1
    else:
        current.next = list2
    return dummy.next`,
    timeOptions: ['O(m+n)', 'O(m·n)', 'O(n)', 'O(n log n)'],
    spaceOptions: ['O(1)', 'O(m+n)', 'O(m)', 'O(n)'],
    correctTime: 'O(m+n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'Each node from both lists is visited at most once. With m and n nodes respectively, total work is O(m+n).',
    spaceExplanation:
      'Only the dummy head and current pointer — no new nodes are created. Space is O(1).',
    category: 'linked-list',
    linkedProblemId: 'merge-two-sorted-lists',
    linkedProblemTitle: 'Merge Two Sorted Lists',
    linkedProblemLcNumber: 21,
    linkedProblemCategory: 'linked-list',
  },
  {
    id: 'product-except-self',
    context: 'Return an array where each element is the product of all other elements (no division, O(1) extra space).',
    code: `def product_except_self(nums):
    result = [1] * len(nums)
    prefix = suffix = 1
    for i in range(len(nums)):
        result[i] = prefix
        prefix *= nums[i]
    for i in range(len(nums) - 1, -1, -1):
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
    code: `import collections

def oranges_rotting(grid):
    minute = 0
    neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    rotten_queue = collections.deque()
    fresh_count = 0
    rows, cols = len(grid), len(grid[0])
    for row in range(rows):
        for col in range(cols):
            if grid[row][col] == 1:
                fresh_count += 1
            elif grid[row][col] == 2:
                rotten_queue.append((row, col))
    while rotten_queue and fresh_count > 0:
        for _ in range(len(rotten_queue)):
            r, c = rotten_queue.popleft()
            for dr, dc in neighbors:
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1:
                    grid[nr][nc] = 2
                    rotten_queue.append((nr, nc))
                    fresh_count -= 1
        minute += 1
    return minute if fresh_count == 0 else -1`,
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
    dummy = ListNode(0)
    dummy.next = head
    l = dummy
    r = head
    while n > 0 and r:
        r = r.next
        n -= 1
    while r:
        l = l.next
        r = r.next
    l.next = l.next.next
    return dummy.next`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'The fast pointer advances n steps, then both pointers walk the rest of the list — at most L steps total where L is the list length. Single pass: O(n).',
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
    longest = 0
    for n in nums:
        if n - 1 not in num_set:
            current_longest = 1
            while n + current_longest in num_set:
                current_longest += 1
            longest = max(longest, current_longest)
    return longest`,
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
    l, r = 0, len(nums) - 1
    while l < r:
        m = (l + r) // 2
        if nums[m] > nums[r]:
            l = m + 1
        else:
            r = m
    k = l

    def binary_search(l, r):
        while l <= r:
            mid = (l + r) // 2
            if nums[mid] == target:
                return mid
            elif nums[mid] > target:
                r = mid - 1
            else:
                l = mid + 1
        return -1

    result = binary_search(0, k - 1)
    if result == -1:
        result = binary_search(k, len(nums) - 1)
    return result`,
    timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
    correctTime: 'O(log n)',
    correctSpace: 'O(1)',
    timeExplanation:
      'First, find the rotation index k with binary search — O(log n). Then run binary search on each of the two halves — O(log n) each. Total: O(log n).',
    spaceExplanation:
      'Both the rotation-finding loop and the binary searches are iterative. Only pointer variables — no auxiliary data structures. Space is O(1).',
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
        if slow == fast:
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
