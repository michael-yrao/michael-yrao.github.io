import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isBalanced(self, root: Optional[TreeNode]) -> bool:
        # another dfs question since we want to check difference in depth
        # how do we know if a tree is height balanced?
        # it is height balanced if absolute depth of left - right > 1
        # we are checking after we return from both left and right side, so postorder dfs
        # I want to just do depth comparison, so basically just do max depth and check the formula above for if it is balanced
        # but maxdepth returns integer, so we need to keep track of the boolean somehow
        # so we will have a global boolean that we can set

        isBalanced = True

        def dfs(root):
            nonlocal isBalanced
            if not root:
                return 0

            left=dfs(root.left)
            right=dfs(root.right)

            if abs(left - right) > 1:
                isBalanced = False

            # left and right are max depth of each side
            return 1 + max(left,right)

        dfs(root)
        return isBalanced`;

// Tree: [3, 9, 20, null, null, 15, 7]
function makeNodes(overrides: Record<string, TreeNode['state']> = {}): TreeNode[] {
  const base: Omit<TreeNode, 'state'>[] = [
    { id: 'n0', value: 3, leftId: 'n1', rightId: 'n2' },
    { id: 'n1', value: 9, leftId: null, rightId: null },
    { id: 'n2', value: 20, leftId: 'n3', rightId: 'n4' },
    { id: 'n3', value: 15, leftId: null, rightId: null },
    { id: 'n4', value: 7, leftId: null, rightId: null },
  ];
  return base.map(n => ({ ...n, state: overrides[n.id] ?? 'default' }));
}

export function generateSteps() {
  return [
    {
      explanation: 'Start postorder DFS. isBalanced=True. We check |leftDepth - rightDepth| > 1 at each node.',
      highlightLine: 18,
      state: {
        type: 'tree' as const,
        nodes: makeNodes(),
        counters: [{ label: 'isBalanced', value: 'True' }],
      } as TreeState,
      variables: [{ name: 'isBalanced', value: 'True' }],
    },
    {
      explanation: 'Visit node 9 (leaf). left=0, right=0. |0-0|=0 ≤ 1. Balanced. Returns depth=1.',
      highlightLine: 24,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'active' }),
        counters: [{ label: 'isBalanced', value: 'True' }],
      } as TreeState,
      variables: [{ name: 'left', value: 0 }, { name: 'right', value: 0 }, { name: '|0-0|', value: 0 }],
    },
    {
      explanation: 'Visit node 15 (leaf). left=0, right=0. |0-0|=0 ≤ 1. Balanced. Returns depth=1.',
      highlightLine: 24,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'visited', n3: 'active' }),
        counters: [{ label: 'isBalanced', value: 'True' }],
      } as TreeState,
    },
    {
      explanation: 'Visit node 7 (leaf). left=0, right=0. |0-0|=0 ≤ 1. Balanced. Returns depth=1.',
      highlightLine: 24,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'visited', n3: 'visited', n4: 'active' }),
        counters: [{ label: 'isBalanced', value: 'True' }],
      } as TreeState,
    },
    {
      explanation: 'Back at node 20. left=1 (from 15), right=1 (from 7). |1-1|=0 ≤ 1. Balanced. Returns depth=2.',
      highlightLine: 26,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'visited', n2: 'active', n3: 'visited', n4: 'visited' }),
        counters: [{ label: 'isBalanced', value: 'True' }],
      } as TreeState,
      variables: [{ name: 'left', value: 1 }, { name: 'right', value: 1 }, { name: '|1-1|', value: 0 }],
    },
    {
      explanation: 'Back at root (3). left=1 (from 9), right=2 (from 20). |1-2|=1 ≤ 1. Balanced! isBalanced stays True. Answer: True.',
      highlightLine: 31,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n1: 'found', n2: 'found', n3: 'found', n4: 'found' }),
        counters: [{ label: 'isBalanced', value: 'True' }],
      } as TreeState,
      variables: [{ name: 'left', value: 1 }, { name: 'right', value: 2 }, { name: '|1-2|', value: 1 }, { name: 'isBalanced', value: 'True', highlight: true }],
    },
  ];
}

export const balancedBinaryTreeMeta: AlgorithmMeta = {
  id: 'balanced-binary-tree',
  lcNumber: 110,
  title: 'Balanced Binary Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS', 'Recursion'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given a binary tree, determine if it is height-balanced. A height-balanced binary tree is one in which the depth of the two subtrees of every node never differs by more than one.',
  examples: [
    {
      input: 'root = [3,9,20,null,null,15,7]',
      output: 'true',
      explanation: 'Node 3: |depth(9) - depth(20)| = |1 - 2| = 1 ≤ 1. Balanced.',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [0, 5000].',
    '-10^4 <= Node.val <= 10^4',
  ],
  hint: 'Use postorder DFS. At each node compute left and right depths. If |left - right| > 1, set isBalanced = False. Track the boolean with nonlocal.',
  solutions: [
    {
      label: 'Postorder DFS',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
