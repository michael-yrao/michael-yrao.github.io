import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from collections import deque

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def goodNodes(self, root: TreeNode) -> int:
        # first thing that comes to mind is monotonic stack since we want all non-decreasing nodes
        # so we can do an iterative postorder dfs
        # then we can just use the stack and specifically just use that as a monotonic stack
        # However, monotonic stack is used normally for next biggest/smallest element
        # This also overcomplicates things. What we can do instead is use a tuple like in iterative max depth
        # this would keep track of node.val, currentMax
        # we need to keep track of currentMax to ensure we are still non-decreasing

        currentMax = root.val
        result = 0
        stack = deque()
        stack.append([root, currentMax])

        while stack:
            # if currentNode is not null, check if it is non-decreasing compared to the currentMax
            currentNode, currentMax = stack.pop()
            if currentNode:
                if currentNode.val >= currentMax:
                    result+=1
                    currentMax = max(currentMax, currentNode.val)
                # if smaller, we just don't include it and move on to the children
                stack.append([currentNode.left,currentMax])
                stack.append([currentNode.right,currentMax])

        return result`;

// Tree: [3, 1, 4, 3, null, 1, 5]
// n0=3(root), n1=1(leftId='n3',rightId=null), n2=4(leftId='n4',rightId='n5'), n3=3(leaf), n4=1(leaf), n5=5(leaf)
function makeNodes(overrides: Record<string, TreeNode['state']> = {}): TreeNode[] {
  const base: Omit<TreeNode, 'state'>[] = [
    { id: 'n0', value: 3, leftId: 'n1', rightId: 'n2' },
    { id: 'n1', value: 1, leftId: 'n3', rightId: null },
    { id: 'n2', value: 4, leftId: 'n4', rightId: 'n5' },
    { id: 'n3', value: 3, leftId: null, rightId: null },
    { id: 'n4', value: 1, leftId: null, rightId: null },
    { id: 'n5', value: 5, leftId: null, rightId: null },
  ];
  return base.map(n => ({ ...n, state: overrides[n.id] ?? 'default' }));
}

export function generateSteps() {
  return [
    {
      explanation: 'Start iterative DFS. A "good node" is one where its value >= max value seen on the path from root. root(3) is always good. result=1, currentMax=3.',
      highlightLine: 28,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found' }),
        counters: [{ label: 'result', value: 1 }, { label: 'currentMax', value: 3 }],
      } as TreeState,
      variables: [{ name: 'result', value: 1 }, { name: 'currentMax', value: 3 }],
    },
    {
      explanation: 'Pop node 4 (right child of 3). currentMax=3. 4 >= 3 — good node! result=2, currentMax becomes 4.',
      highlightLine: 28,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n2: 'active' }),
        counters: [{ label: 'result', value: 2 }, { label: 'currentMax', value: 4 }],
      } as TreeState,
      variables: [{ name: 'node.val', value: 4 }, { name: 'currentMax', value: 3 }, { name: 'good?', value: 'Yes', highlight: true }],
    },
    {
      explanation: 'Pop node 5 (right of 4). currentMax=4. 5 >= 4 — good node! result=3.',
      highlightLine: 28,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n2: 'found', n5: 'active' }),
        counters: [{ label: 'result', value: 3 }, { label: 'currentMax', value: 5 }],
      } as TreeState,
      variables: [{ name: 'node.val', value: 5 }, { name: 'currentMax', value: 4 }, { name: 'good?', value: 'Yes', highlight: true }],
    },
    {
      explanation: 'Pop node 1 (left of 4). currentMax=4. 1 < 4 — NOT a good node. Skip, push its children (null).',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n2: 'found', n4: 'active', n5: 'found' }),
        counters: [{ label: 'result', value: 3 }, { label: 'currentMax', value: 4 }],
      } as TreeState,
      variables: [{ name: 'node.val', value: 1 }, { name: 'currentMax', value: 4 }, { name: 'good?', value: 'No' }],
    },
    {
      explanation: 'Pop node 1 (left of root 3). currentMax=3. 1 < 3 — NOT a good node. Push its left child (3) with currentMax=3.',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n1: 'active', n2: 'found', n4: 'visited', n5: 'found' }),
        counters: [{ label: 'result', value: 3 }, { label: 'currentMax', value: 3 }],
      } as TreeState,
      variables: [{ name: 'node.val', value: 1 }, { name: 'currentMax', value: 3 }, { name: 'good?', value: 'No' }],
    },
    {
      explanation: 'Pop node 3 (left of node 1, path: 3→1→3). currentMax=3. 3 >= 3 — good node! result=4.',
      highlightLine: 28,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n1: 'visited', n2: 'found', n3: 'active', n4: 'visited', n5: 'found' }),
        counters: [{ label: 'result', value: 4 }, { label: 'currentMax', value: 3 }],
      } as TreeState,
      variables: [{ name: 'node.val', value: 3 }, { name: 'currentMax', value: 3 }, { name: 'good?', value: 'Yes', highlight: true }],
    },
    {
      explanation: 'Stack empty. Good nodes: root(3), node 4, node 5, node 3(leaf). Total result = 4.',
      highlightLine: 35,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n1: 'visited', n2: 'found', n3: 'found', n4: 'visited', n5: 'found' }),
        counters: [{ label: 'result', value: 4 }],
      } as TreeState,
      variables: [{ name: 'result', value: 4, highlight: true }],
    },
  ];
}

export const countGoodNodesMeta: AlgorithmMeta = {
  id: 'count-good-nodes',
  lcNumber: 1448,
  title: 'Count Good Nodes in Binary Tree',
  difficulty: 'Medium',
  category: 'trees',
  tags: ['Tree', 'DFS'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given a binary tree root, a node X in the tree is named good if in the path from root to X there are no nodes with a value greater than X. Return the number of good nodes in the binary tree.',
  examples: [
    {
      input: 'root = [3,1,4,3,null,1,5]',
      output: '4',
      explanation: 'Good nodes: root(3), node 4, node 5, and the leaf node 3 (path 3→1→3, max=3, 3>=3).',
    },
  ],
  constraints: [
    'The number of nodes in the binary tree is in the range [1, 10^5].',
    'Each node\'s value is between [-10, 10].',
  ],
  hint: 'Use iterative DFS with a stack of (node, currentMax) tuples. A node is good if its value >= currentMax on the path from root to that node.',
  solutions: [
    {
      label: 'Iterative DFS',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
