import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def maxDepth(self, root: Optional[TreeNode]) -> int:
        # max depth = dfs
        # how do we think about this? is this postorder/preorder/inorder
        # we can go as deep as possible and when we get to null children, we return 0
        # then go backwards, so this would mean postorder
        # since we want max depth, we would return max of either directions

        if not root:
            return 0

        # these 2 returns are the same
        # return max(1+self.maxDepth(root.left),1+self.maxDepth(root.right))
        return 1+max(self.maxDepth(root.left),self.maxDepth(root.right))`;

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
      explanation: 'Start postorder DFS. We recurse as deep as possible first. Visiting node 9 (leaf, left child of 3).',
      highlightLine: 22,
      state: { type: 'tree' as const, nodes: makeNodes({ n1: 'active' }) } as TreeState,
    },
    {
      explanation: 'Node 9 has no children. Both calls return 0. maxDepth(9) = 1 + max(0,0) = 1. Mark as visited.',
      highlightLine: 18,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'visited' }),
        counters: [{ label: 'depth(9)', value: 1 }],
      } as TreeState,
      variables: [{ name: 'depth(9)', value: 1 }],
    },
    {
      explanation: 'Visit node 15 (left leaf of 20). No children — returns 1.',
      highlightLine: 22,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'visited', n3: 'active' }),
        counters: [{ label: 'depth(9)', value: 1 }],
      } as TreeState,
    },
    {
      explanation: 'Visit node 7 (right leaf of 20). No children — returns 1.',
      highlightLine: 22,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'visited', n3: 'visited', n4: 'active' }),
        counters: [{ label: 'depth(9)', value: 1 }, { label: 'depth(15)', value: 1 }],
      } as TreeState,
    },
    {
      explanation: 'Back at node 20. left=1, right=1. maxDepth(20) = 1 + max(1,1) = 2.',
      highlightLine: 22,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'visited', n2: 'active', n3: 'visited', n4: 'visited' }),
        counters: [{ label: 'depth(9)', value: 1 }, { label: 'depth(20)', value: 2 }],
      } as TreeState,
      variables: [{ name: 'left', value: 1 }, { name: 'right', value: 1 }],
    },
    {
      explanation: 'Back at root (3). left=1 (from node 9), right=2 (from node 20). maxDepth(3) = 1 + max(1,2) = 3.',
      highlightLine: 22,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n1: 'found', n2: 'found', n3: 'found', n4: 'found' }),
        counters: [{ label: 'maxDepth', value: 3 }],
      } as TreeState,
      variables: [{ name: 'left', value: 1 }, { name: 'right', value: 2 }, { name: 'result', value: 3, highlight: true }],
    },
  ];
}

export const maximumDepthBinaryTreeMeta: AlgorithmMeta = {
  id: 'max-depth-of-binary-tree',
  lcNumber: 104,
  title: 'Maximum Depth of Binary Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS', 'BFS', 'Recursion'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given the root of a binary tree, return its maximum depth. The maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
  examples: [
    {
      input: 'root = [3,9,20,null,null,15,7]',
      output: '3',
      explanation: 'The longest path is 3 → 20 → 15 (or 7), which has depth 3.',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [0, 10^4].',
    '-100 <= Node.val <= 100',
  ],
  hint: 'Use postorder DFS: recurse left and right children first, then return 1 + max(leftDepth, rightDepth). Base case: null node returns 0.',
  solutions: [
    {
      label: 'Postorder DFS (Recursive)',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
