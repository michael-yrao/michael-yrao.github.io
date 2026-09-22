import{a as q}from"./chunk-H4KK6P3U.js";import{m as E}from"./chunk-MF3SBGHG.js";import{Cb as T,Ea as S,Oa as p,Pa as u,Ra as y,S as h,Sa as w,T as g,Ta as C,Ua as O,Va as r,Wa as t,Xa as k,ab as b,cb as _,eb as d,nb as f,pb as n,qa as i,qb as m,rb as v,sb as x}from"./chunk-L7YJLVL5.js";import"./chunk-OSQMNGTH.js";var M=[{id:"two-sum",context:"Find two indices in an array whose values sum to a target.",code:`def two_sum(nums, target):
    num_map = {}
    for index, number in enumerate(nums):
        diff = target - number
        if diff in num_map:
            return [num_map[diff], index]
        num_map[number] = index
    return`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],correctTime:"O(n)",correctSpace:"O(n)",timeExplanation:"One pass through n elements. Each hash map lookup and insert is O(1), so the loop runs in O(n) total.",spaceExplanation:"The hash map stores at most n entries (one per element), so space is O(n).",category:"arrays-hash",linkedProblemId:"two-sum",linkedProblemTitle:"Two Sum",linkedProblemLcNumber:1,linkedProblemCategory:"arrays-hash"},{id:"contains-duplicate",context:"Return true if any value appears at least twice in an array.",code:`def contains_duplicate(nums):
    nums_set = set()
    for integer in nums:
        if integer in nums_set:
            return True
        else:
            nums_set.add(integer)
    return False`,timeOptions:["O(1)","O(n)","O(n log n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],correctTime:"O(n)",correctSpace:"O(n)",timeExplanation:"One pass. Each set lookup and add is O(1) on average, giving O(n) overall.",spaceExplanation:"The set can hold up to n distinct elements in the worst case, so space is O(n).",category:"arrays-hash",linkedProblemId:"contains-duplicate",linkedProblemTitle:"Contains Duplicate",linkedProblemLcNumber:217,linkedProblemCategory:"arrays-hash"},{id:"valid-palindrome",context:"Check whether a string is a palindrome ignoring non-alphanumeric characters.",code:`def is_palindrome(s):
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
    return True`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(n)",correctSpace:"O(1)",timeExplanation:"Each character is visited at most once by the left or right pointer, so the total work is O(n).",spaceExplanation:"Only two pointer variables and a constant-size helper \u2014 no extra data structures. Space is O(1).",category:"two-pointers",linkedProblemId:"valid-palindrome",linkedProblemTitle:"Valid Palindrome",linkedProblemLcNumber:125,linkedProblemCategory:"two-pointers"},{id:"best-time-buy-sell",context:"Find the maximum profit from a single buy-sell of a stock given daily prices.",code:`def max_profit(prices):
    current_max = 0
    l, r = 0, 1
    while r < len(prices):
        current_max = max(current_max, prices[r] - prices[l])
        if prices[r] < prices[l]:
            l = r
        r += 1
    return current_max`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(n)",correctSpace:"O(1)",timeExplanation:"Single pass through the prices array. The right pointer r advances each iteration, so the loop runs n-1 times \u2014 O(n).",spaceExplanation:"Only three scalar variables (current_max, l, r). Space is O(1).",category:"sliding-window",linkedProblemId:"best-time-to-buy-and-sell-stock",linkedProblemTitle:"Best Time to Buy and Sell Stock",linkedProblemLcNumber:121,linkedProblemCategory:"sliding-window"},{id:"binary-search",context:"Find a target value in a sorted array.",code:`def search(nums, target):
    l, r = 0, len(nums) - 1
    while l <= r:
        mid = l + (r - l) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] > target:
            r = mid - 1
        else:
            l = mid + 1
    return -1`,timeOptions:["O(1)","O(log n)","O(n)","O(n log n)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(log n)",correctSpace:"O(1)",timeExplanation:"Each iteration halves the search space. Starting from n, after k iterations only n/2\u1D4F elements remain, so k = log\u2082(n) iterations suffice \u2014 O(log n).",spaceExplanation:"Only the l, r, and mid variables. Space is O(1).",category:"binary-search",linkedProblemId:"binary-search",linkedProblemTitle:"Binary Search",linkedProblemLcNumber:704,linkedProblemCategory:"binary-search"},{id:"reverse-linked-list-iterative",context:"Reverse a singly linked list in-place (iterative approach).",code:`def reverse_list(head):
    prev, current = None, head
    while current is not None:
        temp = current.next
        current.next = prev
        prev = current
        current = temp
    return prev`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(n)",correctSpace:"O(1)",timeExplanation:"Each node is visited exactly once. The loop runs n times, giving O(n).",spaceExplanation:"Only prev, current, and temp pointers are used. No extra data structures. Space is O(1).",category:"linked-list",linkedProblemId:"reverse-linked-list",linkedProblemTitle:"Reverse Linked List",linkedProblemLcNumber:206,linkedProblemCategory:"linked-list"},{id:"reverse-linked-list-recursive",context:"Reverse a singly linked list in-place (recursive approach).",code:`def reverse_list(head):
    if head is None or head.next is None:
        return head
    return_node = reverse_list(head.next)
    head.next.next = head
    head.next = None
    return return_node`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],correctTime:"O(n)",correctSpace:"O(n)",timeExplanation:"n recursive calls, each doing O(1) work. Same O(n) time as the iterative version.",spaceExplanation:"Each recursive call occupies a stack frame. With n nodes, there are n frames on the call stack simultaneously \u2014 O(n) space. This is the key difference from the iterative approach.",category:"linked-list",linkedProblemId:"reverse-linked-list",linkedProblemTitle:"Reverse Linked List",linkedProblemLcNumber:206,linkedProblemCategory:"linked-list"},{id:"max-depth-tree",context:"Find the maximum depth of a binary tree using recursion.",code:`def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))`,timeOptions:["O(log n)","O(n)","O(n log n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],correctTime:"O(n)",correctSpace:"O(n)",timeExplanation:"Every node is visited exactly once. n nodes \u2192 O(n) total work.",spaceExplanation:"The recursion depth equals the height of the tree. In the worst case (a skewed tree with n nodes all in one branch), the call stack holds n frames \u2014 O(n). For a balanced tree, this is O(log n).",category:"trees",linkedProblemId:"max-depth-of-binary-tree",linkedProblemTitle:"Maximum Depth of Binary Tree",linkedProblemLcNumber:104,linkedProblemCategory:"trees"},{id:"number-of-islands",context:'Count connected components of land cells ("1") in a grid.',code:`def num_islands(grid):
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
    return result`,timeOptions:["O(n)","O(n log n)","O(m\xD7n)","O(m\xD7n log(m\xD7n))"],spaceOptions:["O(1)","O(m+n)","O(m\xD7n)","O(n\xB2)"],correctTime:"O(m\xD7n)",correctSpace:"O(m\xD7n)",timeExplanation:"Every cell is added to the visited set at most once. DFS processes each cell exactly once. With m rows and n columns, total work is O(m\xD7n).",spaceExplanation:"The visited set stores up to m\xD7n coordinates. The DFS call stack can reach depth m\xD7n in the worst case (e.g., all land in one connected spiral). Both contribute O(m\xD7n) space.",category:"graphs",linkedProblemId:"number-of-islands",linkedProblemTitle:"Number of Islands",linkedProblemLcNumber:200,linkedProblemCategory:"graphs"},{id:"valid-parentheses",context:"Determine whether a string of brackets is valid (correctly matched and ordered).",code:`from collections import deque

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
    return not stack`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(n)",correctSpace:"O(n)",timeExplanation:"Each character is processed once. Every append and pop is O(1), giving O(n) total.",spaceExplanation:"In the worst case (all open brackets), the stack holds n items \u2014 O(n) space.",category:"stack",linkedProblemId:"valid-parentheses",linkedProblemTitle:"Valid Parentheses",linkedProblemLcNumber:20,linkedProblemCategory:"stack"},{id:"maximum-subarray",context:"Find the contiguous subarray with the largest sum (Kadane's algorithm).",code:`def max_subarray(nums):
    max_sum = current_sum = nums[0]
    for n in nums[1:]:
        current_sum = max(n, current_sum + n)
        max_sum = max(max_sum, current_sum)
    return max_sum`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(n)",correctSpace:"O(1)",timeExplanation:"Single pass through n elements, each requiring O(1) work. Total: O(n).",spaceExplanation:"Only two scalar variables (max_sum, current_sum). Space is O(1).",category:"greedy",linkedProblemId:"maximum-subarray",linkedProblemTitle:"Maximum Subarray",linkedProblemLcNumber:53,linkedProblemCategory:"greedy"},{id:"three-sum",context:"Find all unique triplets in a sorted array that sum to zero.",code:`def three_sum(nums):
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
    return list(solution_set)`,timeOptions:["O(n)","O(n log n)","O(n\xB2)","O(n\xB3)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],correctTime:"O(n\xB2)",correctSpace:"O(log n)",timeExplanation:"Sorting is O(n log n). The outer loop runs n times; for each index, the two-pointer sweep is O(n). Total: O(n\xB2) dominates.",spaceExplanation:"The solution_set stores the output (excluded by convention). The sort uses O(log n) call stack space. Space is O(log n).",category:"two-pointers",linkedProblemId:"three-sum",linkedProblemTitle:"Three Sum",linkedProblemLcNumber:15,linkedProblemCategory:"two-pointers"},{id:"top-k-frequent",context:"Return the k most frequent elements using a min-heap of size k.",code:`import heapq

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
    return result`,timeOptions:["O(n)","O(n log n)","O(n log k)","O(n\xB2)"],spaceOptions:["O(1)","O(k)","O(n)","O(n\xB2)"],correctTime:"O(n log k)",correctSpace:"O(n)",timeExplanation:"Building the frequency map is O(n). For each of the up to n unique elements we push/pop a heap of size k \u2014 O(log k) per operation, O(n log k) total.",spaceExplanation:"The frequency map stores up to n entries \u2014 O(n). The heap holds at most k+1 elements at a time \u2014 O(k). The map dominates: O(n).",category:"arrays-hash",linkedProblemId:"top-k-frequent-elements",linkedProblemTitle:"Top K Frequent Elements",linkedProblemLcNumber:347,linkedProblemCategory:"arrays-hash"},{id:"group-anagrams",context:"Group strings that are anagrams of each other, using a sorted key.",code:`def group_anagrams(strs):
    anagram_map = {}
    for s in strs:
        sorted_str = ''.join(sorted(s))
        if sorted_str not in anagram_map:
            anagram_map[sorted_str] = []
        anagram_map[sorted_str].append(s)
    return list(anagram_map.values())`,timeOptions:["O(n)","O(n log n)","O(n\xB7k log k)","O(n\xB2)"],spaceOptions:["O(1)","O(n)","O(n\xB7k)","O(n\xB2)"],correctTime:"O(n\xB7k log k)",correctSpace:"O(n\xB7k)",timeExplanation:"For each of the n strings, sorting takes O(k log k) where k is the string length. Total: O(n\xB7k log k).",spaceExplanation:"The hash map stores all n strings, each of length up to k. Space is O(n\xB7k).",category:"arrays-hash",linkedProblemId:"group-anagrams",linkedProblemTitle:"Group Anagrams",linkedProblemLcNumber:49,linkedProblemCategory:"arrays-hash"},{id:"trapping-rain-water",context:"Calculate how much water is trapped between elevation bars (two-pointer approach).",code:`def trap(height):
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
    return res`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(n)",correctSpace:"O(1)",timeExplanation:"Each element is processed once by the left or right pointer. Single pass \u2192 O(n).",spaceExplanation:"Only l, r, left_max, right_max, and res \u2014 all scalars. Space is O(1).",category:"two-pointers",linkedProblemId:"trapping-rain-water",linkedProblemTitle:"Trapping Rain Water",linkedProblemLcNumber:42,linkedProblemCategory:"two-pointers"},{id:"koko-eating-bananas",context:"Find the minimum eating speed such that all piles are finished in h hours.",code:`import math

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
    return l`,timeOptions:["O(log n)","O(n)","O(n log n)","O(n log m)"],spaceOptions:["O(1)","O(log n)","O(n)","O(log m)"],correctTime:"O(n log m)",correctSpace:"O(1)",timeExplanation:"Binary search over speeds 1..m (where m = max pile) runs O(log m) iterations. Each iteration scans all n piles to compute hours. Total: O(n log m).",spaceExplanation:"Only scalar variables are used. Space is O(1).",category:"binary-search",linkedProblemId:"koko-eating-bananas",linkedProblemTitle:"Koko Eating Bananas",linkedProblemLcNumber:875,linkedProblemCategory:"binary-search"},{id:"level-order-traversal",context:"Collect the values of a binary tree level by level using BFS.",code:`from collections import deque

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
    return result`,timeOptions:["O(log n)","O(n)","O(n log n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],correctTime:"O(n)",correctSpace:"O(n)",timeExplanation:"Every node is enqueued and dequeued exactly once. Total: O(n).",spaceExplanation:"The queue holds at most one full level at a time. In the widest level of a balanced binary tree, that is n/2 nodes \u2014 O(n) space.",category:"trees",linkedProblemId:"binary-tree-level-order-traversal",linkedProblemTitle:"Binary Tree Level Order Traversal",linkedProblemLcNumber:102,linkedProblemCategory:"trees"},{id:"clone-graph",context:"Deep-copy an undirected graph, visiting each node exactly once.",code:`def clone_graph(node):
    old_to_new = {}

    def dfs(old_node):
        if old_node in old_to_new:
            return old_to_new[old_node]
        new_node = Node(old_node.val)
        old_to_new[old_node] = new_node
        for neighbor in old_node.neighbors:
            new_node.neighbors.append(dfs(neighbor))
        return new_node

    return dfs(node)`,timeOptions:["O(V)","O(V+E)","O(V\xB2)","O(V\xB7E)"],spaceOptions:["O(1)","O(V)","O(V+E)","O(V\xB2)"],correctTime:"O(V+E)",correctSpace:"O(V)",timeExplanation:"Each vertex is cloned once (O(V)) and each edge is traversed once when building neighbor lists (O(E)). Total: O(V+E).",spaceExplanation:"The old_to_new map holds one entry per vertex \u2014 O(V). The DFS call stack is at most O(V) deep. Space: O(V).",category:"graphs",linkedProblemId:"clone-graph",linkedProblemTitle:"Clone Graph",linkedProblemLcNumber:133,linkedProblemCategory:"graphs"},{id:"course-schedule",context:"Determine if all courses can be finished given their prerequisites (detect if a valid ordering exists).",code:`import collections

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

    return courses_taken >= num_courses`,timeOptions:["O(V)","O(V+E)","O(V\xB2)","O(V\xB7E)"],spaceOptions:["O(V)","O(V+E)","O(V\xB2)","O(V\xB7E)"],correctTime:"O(V+E)",correctSpace:"O(V+E)",timeExplanation:"Building the adjacency list and prereq counter is O(E). BFS (Kahn's algorithm) processes each course once and each edge once \u2014 O(V+E) total.",spaceExplanation:"The adjacency list stores all edges O(E), the prereq counter and queue store all nodes O(V). Total: O(V+E).",category:"graphs",linkedProblemId:"course-schedule",linkedProblemTitle:"Course Schedule",linkedProblemLcNumber:207,linkedProblemCategory:"graphs"},{id:"merge-two-sorted-lists",context:"Merge two sorted linked lists into one sorted list in-place.",code:`def merge_two_lists(list1, list2):
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
    return dummy.next`,timeOptions:["O(m+n)","O(m\xB7n)","O(n)","O(n log n)"],spaceOptions:["O(1)","O(m+n)","O(m)","O(n)"],correctTime:"O(m+n)",correctSpace:"O(1)",timeExplanation:"Each node from both lists is visited at most once. With m and n nodes respectively, total work is O(m+n).",spaceExplanation:"Only the dummy head and current pointer \u2014 no new nodes are created. Space is O(1).",category:"linked-list",linkedProblemId:"merge-two-sorted-lists",linkedProblemTitle:"Merge Two Sorted Lists",linkedProblemLcNumber:21,linkedProblemCategory:"linked-list"},{id:"product-except-self",context:"Return an array where each element is the product of all other elements (no division, O(1) extra space).",code:`def product_except_self(nums):
    result = [1] * len(nums)
    prefix = suffix = 1
    for i in range(len(nums)):
        result[i] = prefix
        prefix *= nums[i]
    for i in range(len(nums) - 1, -1, -1):
        result[i] *= suffix
        suffix *= nums[i]
    return result`,timeOptions:["O(1)","O(n)","O(n log n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(n)",correctSpace:"O(1)",timeExplanation:"Two passes through the array, each O(n). Total: O(n).",spaceExplanation:"The output array does not count as extra space by convention. Only two scalar accumulators (prefix, suffix) are used \u2014 O(1).",category:"arrays-hash",linkedProblemId:"product-of-array-except-self",linkedProblemTitle:"Product of Array Except Self",linkedProblemLcNumber:238,linkedProblemCategory:"arrays-hash"},{id:"rotting-oranges",context:"Find the minimum time (in minutes) for all fresh oranges to rot via BFS spreading.",code:`import collections

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
    return minute if fresh_count == 0 else -1`,timeOptions:["O(n)","O(n log n)","O(m+n)","O(m\xD7n)"],spaceOptions:["O(1)","O(m+n)","O(m\xD7n)","O(n\xB2)"],correctTime:"O(m\xD7n)",correctSpace:"O(m\xD7n)",timeExplanation:"Every cell is enqueued at most once. With m rows and n columns, total work is O(m\xD7n).",spaceExplanation:"The BFS queue can hold up to m\xD7n cells in the worst case \u2014 O(m\xD7n) space.",category:"graphs",linkedProblemId:"rotting-oranges",linkedProblemTitle:"Rotting Oranges",linkedProblemLcNumber:994,linkedProblemCategory:"graphs"},{id:"remove-nth-from-end",context:"Remove the nth node from the end of a linked list in a single pass.",code:`def remove_nth_from_end(head, n):
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
    return dummy.next`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(n)",correctSpace:"O(1)",timeExplanation:"The fast pointer advances n steps, then both pointers walk the rest of the list \u2014 at most L steps total where L is the list length. Single pass: O(n).",spaceExplanation:"Only the dummy node and two pointer variables. Space is O(1).",category:"linked-list",linkedProblemId:"remove-nth-node-from-end",linkedProblemTitle:"Remove Nth Node From End",linkedProblemLcNumber:19,linkedProblemCategory:"linked-list"},{id:"longest-consecutive-sequence",context:"Find the length of the longest consecutive integer sequence in an unsorted array.",code:`def longest_consecutive(nums):
    num_set = set(nums)
    longest = 0
    for n in nums:
        if n - 1 not in num_set:
            current_longest = 1
            while n + current_longest in num_set:
                current_longest += 1
            longest = max(longest, current_longest)
    return longest`,timeOptions:["O(1)","O(n)","O(n log n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],correctTime:"O(n)",correctSpace:"O(n)",timeExplanation:"Each number is the start of a sequence at most once. The inner while-loop extends each sequence, but across all iterations its total steps equal n. Overall: O(n).",spaceExplanation:"The set holds all n numbers \u2014 O(n) space.",category:"arrays-hash",linkedProblemId:"longest-consecutive-sequence",linkedProblemTitle:"Longest Consecutive Sequence",linkedProblemLcNumber:128,linkedProblemCategory:"arrays-hash"},{id:"search-rotated",context:"Search for a target in a rotated sorted array using binary search.",code:`def search(nums, target):
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
    return result`,timeOptions:["O(1)","O(log n)","O(n)","O(n log n)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(log n)",correctSpace:"O(1)",timeExplanation:"First, find the rotation index k with binary search \u2014 O(log n). Then run binary search on each of the two halves \u2014 O(log n) each. Total: O(log n).",spaceExplanation:"Both the rotation-finding loop and the binary searches are iterative. Only pointer variables \u2014 no auxiliary data structures. Space is O(1).",category:"binary-search",linkedProblemId:"search-in-rotated-sorted-array",linkedProblemTitle:"Search in Rotated Sorted Array",linkedProblemLcNumber:33,linkedProblemCategory:"binary-search"},{id:"linked-list-cycle",context:"Detect whether a linked list contains a cycle using fast/slow pointers.",code:`def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow == fast:
            return True
    return False`,timeOptions:["O(1)","O(log n)","O(n)","O(n\xB2)"],spaceOptions:["O(1)","O(log n)","O(n)","O(n log n)"],correctTime:"O(n)",correctSpace:"O(1)",timeExplanation:"If there is no cycle, fast reaches None in O(n) steps. If there is a cycle, slow and fast meet within O(n) steps of fast entering the cycle. Total: O(n).",spaceExplanation:"Only two pointer variables \u2014 no visited set needed. Space is O(1), which is the advantage of this approach over a hash set.",category:"linked-list",linkedProblemId:"linked-list-cycle",linkedProblemTitle:"Linked List Cycle",linkedProblemLcNumber:141,linkedProblemCategory:"linked-list"}];var I=(o,s)=>["/algorithms",o,s];function L(o,s){if(o&1){let e=b();r(0,"div",13)(1,"h2",14),n(2,"Done!"),t(),r(3,"p",15),n(4),r(5,"span",16),n(6),t()(),r(7,"div",17)(8,"div",18)(9,"span",19),n(10,"Time complexity"),t(),r(11,"span",20),n(12),t()(),r(13,"div",18)(14,"span",19),n(15,"Space complexity"),t(),r(16,"span",20),n(17),t()()(),r(18,"button",21),_("click",function(){h(e);let l=d();return g(l.startRun())}),n(19,"\u21BA Shuffle & play again"),t()()}if(o&2){let e=d();i(4),x(" ",e.totalScore," / ",e.maxScore," points "),i(2),v("(",e.scorePercent,"%)"),i(6),x("",e.timeScore,"/",e.deck.length," correct"),i(5),x("",e.spaceScore,"/",e.deck.length," correct")}}function V(o,s){if(o&1&&(r(0,"span",35),n(1),t()),o&2){let e=d(2);f("bo-q__result--correct",e.timeCorrect)("bo-q__result--wrong",!e.timeCorrect),i(),v(" ",e.timeCorrect?"\u2713":"\u2717 "+e.current.correctTime," ")}}function N(o,s){if(o&1){let e=b();r(0,"button",36),_("click",function(){let l=h(e).$implicit,c=d(2);return g(c.pickTime(l))}),n(1),t()}if(o&2){let e=s.$implicit,a=d(2);f("bo-chip--selected",a.selectedTime===e)("bo-chip--correct",a.mode==="revealed"&&e===a.current.correctTime)("bo-chip--wrong",a.mode==="revealed"&&a.selectedTime===e&&e!==a.current.correctTime),O("disabled",a.mode==="revealed"),i(),m(e)}}function B(o,s){if(o&1&&(r(0,"span",35),n(1),t()),o&2){let e=d(2);f("bo-q__result--correct",e.spaceCorrect)("bo-q__result--wrong",!e.spaceCorrect),i(),v(" ",e.spaceCorrect?"\u2713":"\u2717 "+e.current.correctSpace," ")}}function F(o,s){if(o&1){let e=b();r(0,"button",36),_("click",function(){let l=h(e).$implicit,c=d(2);return g(c.pickSpace(l))}),n(1),t()}if(o&2){let e=s.$implicit,a=d(2);f("bo-chip--selected",a.selectedSpace===e)("bo-chip--correct",a.mode==="revealed"&&e===a.current.correctSpace)("bo-chip--wrong",a.mode==="revealed"&&a.selectedSpace===e&&e!==a.current.correctSpace),O("disabled",a.mode==="revealed"),i(),m(e)}}function z(o,s){if(o&1){let e=b();r(0,"div",33)(1,"button",37),_("click",function(){h(e);let l=d(2);return g(l.check())}),n(2,"Check \u2192"),t()()}if(o&2){let e=d(2);i(),O("disabled",!e.canCheck)}}function R(o,s){if(o&1&&(r(0,"a",43),n(1),t()),o&2){let e=d(3);O("routerLink",T(2,I,e.current.linkedProblemCategory,e.current.linkedProblemId)),i(),v("See #",e.current.linkedProblemLcNumber," step by step \u2192")}}function D(o,s){if(o&1){let e=b();r(0,"section",34)(1,"div",38)(2,"div",39)(3,"p",40)(4,"span",29),n(5,"T"),t(),n(6," Time: "),r(7,"code"),n(8),t()(),r(9,"p",41),n(10),t()(),r(11,"div",39)(12,"p",40)(13,"span",29),n(14,"S"),t(),n(15," Space: "),r(16,"code"),n(17),t()(),r(18,"p",41),n(19),t()()(),r(20,"div",42),p(21,R,2,5,"a",43),r(22,"button",21),_("click",function(){h(e);let l=d(2);return g(l.next())}),n(23,"Next \u2192"),t()()()}if(o&2){let e=d(2);i(8),m(e.current.correctTime),i(2),m(e.current.timeExplanation),i(7),m(e.current.correctSpace),i(2),m(e.current.spaceExplanation),i(2),u(e.current.linkedProblemId?21:-1)}}function j(o,s){if(o&1&&(r(0,"section",22)(1,"p",23),n(2),t(),r(3,"div",24),k(4,"app-code-viewer",25),t()(),r(5,"div",26)(6,"div",27)(7,"p",28)(8,"span",29),n(9,"T"),t(),n(10," Time complexity "),p(11,V,2,5,"span",30),t(),r(12,"div",31),w(13,N,2,8,"button",32,y),t()(),r(15,"div",27)(16,"p",28)(17,"span",29),n(18,"S"),t(),n(19," Space complexity "),p(20,B,2,5,"span",30),t(),r(21,"div",31),w(22,F,2,8,"button",32,y),t()()(),p(24,z,3,1,"div",33),p(25,D,24,5,"section",34)),o&2){let e=d();i(2),m(e.current.context),i(2),O("code",e.current.code),i(7),u(e.mode==="revealed"?11:-1),i(2),C(e.current.timeOptions),i(7),u(e.mode==="revealed"?20:-1),i(2),C(e.current.spaceOptions),i(2),u(e.mode==="quiz"?24:-1),i(),u(e.mode==="revealed"?25:-1)}}var Q=(()=>{let s=class s{constructor(){this.deck=[],this.questionIndex=0,this.current=null,this.selectedTime=null,this.selectedSpace=null,this.mode="quiz",this.timeScore=0,this.spaceScore=0,this.startRun()}get canCheck(){return this.selectedTime!==null&&this.selectedSpace!==null}get timeCorrect(){return this.mode==="revealed"&&this.selectedTime===this.current?.correctTime}get spaceCorrect(){return this.mode==="revealed"&&this.selectedSpace===this.current?.correctSpace}get progressLabel(){return`${this.questionIndex+1} / ${this.deck.length}`}get totalScore(){return this.timeScore+this.spaceScore}get maxScore(){return this.deck.length*2}get scorePercent(){return this.maxScore>0?Math.round(this.totalScore/this.maxScore*100):0}startRun(){this.deck=this.shuffle([...M]),this.questionIndex=0,this.current=this.deck[0]??null,this.selectedTime=null,this.selectedSpace=null,this.mode="quiz",this.timeScore=0,this.spaceScore=0}pickTime(a){this.mode!=="revealed"&&(this.selectedTime=a)}pickSpace(a){this.mode!=="revealed"&&(this.selectedSpace=a)}check(){!this.canCheck||!this.current||(this.mode="revealed",this.selectedTime===this.current.correctTime&&this.timeScore++,this.selectedSpace===this.current.correctSpace&&this.spaceScore++)}next(){if(this.mode==="revealed"){if(this.questionIndex+1>=this.deck.length){this.mode="finished";return}this.questionIndex++,this.current=this.deck[this.questionIndex],this.selectedTime=null,this.selectedSpace=null,this.mode="quiz"}}shuffle(a){let l=[...a];for(let c=l.length-1;c>0;c--){let P=Math.floor(Math.random()*(c+1));[l[c],l[P]]=[l[P],l[c]]}return l}};s.\u0275fac=function(l){return new(l||s)},s.\u0275cmp=S({type:s,selectors:[["app-big-o"]],decls:42,vars:7,consts:[[1,"bo-page"],[1,"breadcrumb"],["routerLink","/"],["routerLink","/games"],[1,"bo-header"],[1,"bo-header__eyebrow"],[1,"bo-header__title"],[1,"bo-header__sub"],["aria-live","polite",1,"bo-stats"],[1,"stat"],[1,"stat__value"],[1,"stat__label"],[1,"stat-divider"],[1,"bo-summary"],[1,"bo-summary__title"],[1,"bo-summary__score"],[1,"bo-summary__pct"],[1,"bo-summary__breakdown"],[1,"breakdown-row"],[1,"breakdown-label"],[1,"breakdown-value"],[1,"bo-btn","bo-btn--primary",3,"click"],[1,"bo-snippet"],[1,"bo-snippet__context"],[1,"bo-snippet__code"],[3,"code"],[1,"bo-questions"],[1,"bo-q"],[1,"bo-q__label"],[1,"bo-q__tag"],[1,"bo-q__result",3,"bo-q__result--correct","bo-q__result--wrong"],[1,"bo-options"],[1,"bo-chip",3,"bo-chip--selected","bo-chip--correct","bo-chip--wrong","disabled"],[1,"bo-actions"],["aria-live","polite",1,"bo-reveal"],[1,"bo-q__result"],[1,"bo-chip",3,"click","disabled"],[1,"bo-btn","bo-btn--primary",3,"click","disabled"],[1,"bo-reveal__row"],[1,"bo-explain"],[1,"bo-explain__head"],[1,"bo-explain__body"],[1,"bo-reveal__actions"],[1,"bo-link",3,"routerLink"]],template:function(l,c){l&1&&(r(0,"div",0)(1,"div",1)(2,"a",2),n(3,"Home"),t(),r(4,"span"),n(5,"\u203A"),t(),r(6,"a",3),n(7,"Games"),t(),r(8,"span"),n(9,"\u203A"),t(),r(10,"span"),n(11,"Big-O Trainer"),t()(),r(12,"header",4)(13,"p",5),n(14,"Complexity Analysis"),t(),r(15,"h1",6),n(16,"Big-O Trainer"),t(),r(17,"p",7),n(18," Read the code. "),r(19,"strong"),n(20,"Don't run it in your head"),t(),n(21," \u2014 count the loops, identify the data structures, and name the complexity. "),t()(),r(22,"div",8)(23,"div",9)(24,"span",10),n(25),t(),r(26,"span",11),n(27,"time"),t()(),k(28,"div",12),r(29,"div",9)(30,"span",10),n(31),t(),r(32,"span",11),n(33,"space"),t()(),k(34,"div",12),r(35,"div",9)(36,"span",10),n(37),t(),r(38,"span",11),n(39,"question"),t()()(),p(40,L,20,7,"div",13),p(41,j,26,6),t()),l&2&&(i(25),x("",c.timeScore,"/",c.deck.length),i(6),x("",c.spaceScore,"/",c.deck.length),i(6),m(c.progressLabel),i(3),u(c.mode==="finished"?40:-1),i(),u(c.mode!=="finished"&&c.current?41:-1))},dependencies:[E,q],styles:[".bo-page[_ngcontent-%COMP%]{max-width:860px;margin:0 auto;padding:var(--space-xl) var(--space-lg) var(--space-2xl)}.breadcrumb[_ngcontent-%COMP%]{display:flex;align-items:center;gap:var(--space-sm);font-size:.82rem;color:var(--color-text-muted);margin-bottom:var(--space-lg)}.breadcrumb[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]{color:var(--color-text-muted)}.breadcrumb[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover{color:var(--color-accent)}.breadcrumb[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]:last-child{color:var(--color-text)}.bo-header[_ngcontent-%COMP%]{margin-bottom:var(--space-xl)}.bo-header__eyebrow[_ngcontent-%COMP%]{font-size:.75rem;letter-spacing:.16em;text-transform:uppercase;color:var(--color-accent);font-weight:600;margin:0 0 var(--space-xs)}.bo-header__title[_ngcontent-%COMP%]{font-size:clamp(1.8rem,1.4rem + 2vw,2.6rem);font-weight:800;margin:0 0 var(--space-sm)}.bo-header__sub[_ngcontent-%COMP%]{color:var(--color-text-muted);max-width:56ch;margin:0}.bo-stats[_ngcontent-%COMP%]{display:flex;align-items:center;gap:var(--space-lg);padding:var(--space-md) var(--space-lg);background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-md);margin-bottom:var(--space-xl);width:fit-content}.stat[_ngcontent-%COMP%]{display:flex;flex-direction:column;align-items:center;min-width:56px}.stat__value[_ngcontent-%COMP%]{font-family:var(--font-mono);font-size:1.3rem;font-weight:700;color:var(--color-text)}.stat__label[_ngcontent-%COMP%]{font-size:.68rem;text-transform:uppercase;letter-spacing:.1em;color:var(--color-text-muted)}.stat-divider[_ngcontent-%COMP%]{width:1px;height:32px;background:var(--color-border)}.bo-summary[_ngcontent-%COMP%]{background:var(--color-bg-card);border:1px solid var(--color-accent);border-radius:var(--radius-lg);padding:var(--space-xl);text-align:center;margin-bottom:var(--space-xl)}.bo-summary__title[_ngcontent-%COMP%]{margin:0 0 var(--space-sm);font-size:1.5rem}.bo-summary__score[_ngcontent-%COMP%]{font-size:2rem;font-weight:800;margin:0 0 var(--space-md);font-family:var(--font-mono)}.bo-summary__pct[_ngcontent-%COMP%]{font-size:1rem;color:var(--color-accent);font-weight:600}.bo-summary__breakdown[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:var(--space-xs);margin-bottom:var(--space-lg);align-items:center}.breakdown-row[_ngcontent-%COMP%]{display:flex;gap:var(--space-lg);font-size:.9rem;color:var(--color-text-muted)}.breakdown-label[_ngcontent-%COMP%]{color:var(--color-text-muted)}.breakdown-value[_ngcontent-%COMP%]{font-family:var(--font-mono);color:var(--color-text);font-weight:600}.bo-snippet[_ngcontent-%COMP%]{margin-bottom:var(--space-lg)}.bo-snippet__context[_ngcontent-%COMP%]{font-size:.88rem;color:var(--color-text-muted);margin:0 0 var(--space-sm);font-style:italic}.bo-snippet__code[_ngcontent-%COMP%]{border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--color-border)}.bo-questions[_ngcontent-%COMP%]{display:flex;flex-direction:column;gap:var(--space-lg);margin-bottom:var(--space-lg)}.bo-q[_ngcontent-%COMP%]{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-md) var(--space-lg)}.bo-q__label[_ngcontent-%COMP%]{display:flex;align-items:center;gap:var(--space-sm);font-size:.88rem;font-weight:600;color:var(--color-text-muted);margin:0 0 var(--space-md)}.bo-q__tag[_ngcontent-%COMP%]{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:4px;background:var(--color-accent-dim);color:var(--color-accent);font-size:.68rem;font-weight:800;letter-spacing:0;flex-shrink:0}.bo-q__result[_ngcontent-%COMP%]{margin-left:auto;font-family:var(--font-mono);font-size:.82rem;font-weight:700}.bo-q__result--correct[_ngcontent-%COMP%]{color:var(--color-easy)}.bo-q__result--wrong[_ngcontent-%COMP%]{color:var(--color-hard)}.bo-options[_ngcontent-%COMP%]{display:flex;flex-wrap:wrap;gap:var(--space-sm)}.bo-chip[_ngcontent-%COMP%]{padding:8px 18px;border-radius:999px;border:1px solid var(--color-border);background:var(--color-bg-raised);color:var(--color-text);font-family:var(--font-mono);font-size:.88rem;font-weight:600;cursor:pointer;transition:background var(--transition-fast),border-color var(--transition-fast),color var(--transition-fast),transform var(--transition-fast)}.bo-chip[_ngcontent-%COMP%]:hover:not(:disabled){border-color:var(--color-accent);color:var(--color-accent);transform:translateY(-1px)}.bo-chip[_ngcontent-%COMP%]:disabled{cursor:default;opacity:.55}.bo-chip--selected[_ngcontent-%COMP%]{border-color:var(--color-accent);background:var(--color-accent-dim);color:var(--color-accent);opacity:1!important}.bo-chip--correct[_ngcontent-%COMP%]{background:#4ade8026;border-color:var(--color-easy);color:var(--color-easy);opacity:1!important}.bo-chip--wrong[_ngcontent-%COMP%]{background:#f8717126;border-color:var(--color-hard);color:var(--color-hard);opacity:1!important}.bo-actions[_ngcontent-%COMP%]{margin-bottom:var(--space-lg)}.bo-btn[_ngcontent-%COMP%]{padding:10px 24px;border-radius:var(--radius-sm);border:none;font-weight:700;font-size:.92rem;cursor:pointer;transition:filter var(--transition-fast),opacity var(--transition-fast)}.bo-btn--primary[_ngcontent-%COMP%]{background:var(--color-accent);color:var(--color-bg)}.bo-btn--primary[_ngcontent-%COMP%]:hover:not(:disabled){filter:brightness(1.12)}.bo-btn--primary[_ngcontent-%COMP%]:disabled{opacity:.4;cursor:default}.bo-reveal[_ngcontent-%COMP%]{background:var(--color-bg-card);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-lg) var(--space-xl);margin-bottom:var(--space-lg)}.bo-reveal__row[_ngcontent-%COMP%]{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-lg);margin-bottom:var(--space-lg)}.bo-reveal__actions[_ngcontent-%COMP%]{display:flex;align-items:center;gap:var(--space-lg);flex-wrap:wrap;padding-top:var(--space-md);border-top:1px solid var(--color-border)}.bo-explain__head[_ngcontent-%COMP%]{font-weight:600;font-size:.92rem;margin:0 0 var(--space-xs);display:flex;align-items:center;gap:var(--space-sm)}.bo-explain__head[_ngcontent-%COMP%]   code[_ngcontent-%COMP%]{font-family:var(--font-mono);color:var(--color-accent);background:var(--color-accent-dim);padding:1px 8px;border-radius:4px;font-size:.88rem}.bo-explain__body[_ngcontent-%COMP%]{font-size:.88rem;line-height:1.6;color:var(--color-text-muted);margin:0}.bo-link[_ngcontent-%COMP%]{font-size:.9rem;font-weight:600;color:var(--color-accent)}@media(max-width:600px){.bo-stats[_ngcontent-%COMP%]{gap:var(--space-md);width:100%}.bo-reveal__row[_ngcontent-%COMP%]{grid-template-columns:1fr}}"],changeDetection:0});let o=s;return o})();export{Q as BigOComponent};
