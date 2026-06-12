import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from collections import deque
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        # so this is like a combo problem
        # we want to find if the root of subRoot is in root
        # then we want to run isSameTree from there
        # so we can start with a bfs to find the subroot node
        # then we do preorder dfs to check isSameTree

        # bfs is queue based, so we go through the root tree
        # and populate the queue until we find the node we are looking for
        # then we run preorder dfs to find subRoot

        def dfs(p,q):
            if not p and not q:
                return True

            if p and q and p.val == q.val:
                return dfs(p.left,q.left) and dfs(p.right,q.right)
            else:
                return False

        queue = deque([root])

        while queue:
            # deque is both a queue and a stack
            # popleft is equivalent to queue.pop()
            # popright is equivalent to stack.pop()
            currentNode = queue.popleft()

            if currentNode.val == subRoot.val:
                # if found, we just return True
                # if not found, we continue to search
                if dfs(currentNode, subRoot):
                    return True
            if currentNode.left:
                queue.append(currentNode.left)
            if currentNode.right:
                queue.append(currentNode.right)

        return False`;

// Root tree: [3, 4, 5, 1, 2]
// n0=3(root), n1=4(leftId='n3',rightId='n4'), n2=5(leaf), n3=1(leaf), n4=2(leaf)
function makeNodes(overrides: Record<string, TreeNode['state']> = {}): TreeNode[] {
  const base: Omit<TreeNode, 'state'>[] = [
    { id: 'n0', value: 3, leftId: 'n1', rightId: 'n2' },
    { id: 'n1', value: 4, leftId: 'n3', rightId: 'n4' },
    { id: 'n2', value: 5, leftId: null, rightId: null },
    { id: 'n3', value: 1, leftId: null, rightId: null },
    { id: 'n4', value: 2, leftId: null, rightId: null },
  ];
  return base.map(n => ({ ...n, state: overrides[n.id] ?? 'default' }));
}

export function generateSteps() {
  return [
    {
      explanation: 'BFS through root tree looking for node with value matching subRoot.val=4. Queue: [3].',
      highlightLine: 31,
      state: {
        type: 'tree' as const,
        nodes: makeNodes(),
        counters: [{ label: 'queue', value: '[3]' }],
      } as TreeState,
      variables: [{ name: 'subRoot.val', value: 4 }],
    },
    {
      explanation: 'Dequeue node 3. val=3 ≠ 4. Add children to queue. Queue: [4, 5].',
      highlightLine: 37,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited' }),
        counters: [{ label: 'queue', value: '[4,5]' }],
      } as TreeState,
      variables: [{ name: 'currentNode.val', value: 3 }, { name: 'subRoot.val', value: 4 }],
    },
    {
      explanation: 'Dequeue node 4. val=4 == subRoot.val=4! Run isSameTree(node4, subRoot=[4,1,2]).',
      highlightLine: 42,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'active' }),
        counters: [{ label: 'queue', value: '[5]' }],
      } as TreeState,
      variables: [{ name: 'currentNode.val', value: 4 }, { name: 'subRoot.val', value: 4, highlight: true }],
    },
    {
      explanation: 'isSameTree: compare node 4 (val=4) with subRoot (val=4). Match! Recurse left: 1==1.',
      highlightLine: 26,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'comparing', n3: 'active' }),
        counters: [{ label: 'dfs match', value: '4==4' }],
      } as TreeState,
      variables: [{ name: 'p.val', value: 4 }, { name: 'q.val', value: 4 }],
    },
    {
      explanation: 'Recurse right: node 2 (val=2) == subRoot.right (val=2). Both leaves match. isSameTree returns True.',
      highlightLine: 26,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'comparing', n3: 'found', n4: 'active' }),
        counters: [{ label: 'dfs match', value: '2==2' }],
      } as TreeState,
      variables: [{ name: 'p.val', value: 2 }, { name: 'q.val', value: 2 }],
    },
    {
      explanation: 'Subtree [4,1,2] found at node 4! isSubtree returns True.',
      highlightLine: 43,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'found', n2: 'default', n3: 'found', n4: 'found' }),
        counters: [{ label: 'result', value: 'True' }],
      } as TreeState,
      variables: [{ name: 'result', value: 'True', highlight: true }],
    },
  ];
}

export const subtreeOfAnotherTreeMeta: AlgorithmMeta = {
  id: 'subtree-of-another-tree',
  lcNumber: 572,
  title: 'Subtree of Another Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS', 'String Matching'],
  timeComplexity: 'O(m·n)',
  spaceComplexity: 'O(m+n)',
  description: 'Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values as subRoot and false otherwise.',
  examples: [
    {
      input: 'root = [3,4,5,1,2], subRoot = [4,1,2]',
      output: 'true',
      explanation: 'The subtree rooted at node 4 in root matches subRoot exactly.',
    },
  ],
  constraints: [
    'The number of nodes in the root tree is in the range [1, 2000].',
    'The number of nodes in the subRoot tree is in the range [1, 1000].',
    '-10^4 <= root.val, subRoot.val <= 10^4',
  ],
  hint: 'BFS through root to find any node matching subRoot.val, then run isSameTree from that node. If isSameTree returns True, found the subtree.',
  solutions: [
    {
      label: 'BFS + DFS',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
