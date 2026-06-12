import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def diameterOfBinaryTree(self, root: Optional[TreeNode]) -> int:
        # so what it looks like if we have to get max of both sides of the subtree and add it
        # in the example, we get depth of 2 on left and depth of 1 and the right
        # thus we return 3
        # thus this is postorder dfs
        # issue is we need to keep track of the max diameter as well as max of left and right
        # so we need to have a helper function

        maxDiameter = 0

        def dfs(root):
            nonlocal maxDiameter

            if not root:
                return 0

            left = dfs(root.left)
            right = dfs(root.right)
            maxDiameter = max(maxDiameter, left + right)

            # return the max depth to caller
            return 1 + max(left, right)

        dfs(root)
        return maxDiameter`;

// Tree: [1, 2, 3, 4, 5]
// n0=1(root), n1=2(left), n2=3(right), n3=4(n1.left), n4=5(n1.right)
function makeNodes(overrides: Record<string, TreeNode['state']> = {}): TreeNode[] {
  const base: Omit<TreeNode, 'state'>[] = [
    { id: 'n0', value: 1, leftId: 'n1', rightId: 'n2' },
    { id: 'n1', value: 2, leftId: 'n3', rightId: 'n4' },
    { id: 'n2', value: 3, leftId: null, rightId: null },
    { id: 'n3', value: 4, leftId: null, rightId: null },
    { id: 'n4', value: 5, leftId: null, rightId: null },
  ];
  return base.map(n => ({ ...n, state: overrides[n.id] ?? 'default' }));
}

export function generateSteps() {
  return [
    {
      explanation: 'Start postorder DFS. maxDiameter=0. At each node we compute left+right depth and update maxDiameter.',
      highlightLine: 17,
      state: {
        type: 'tree' as const,
        nodes: makeNodes(),
        counters: [{ label: 'maxDiameter', value: 0 }],
      } as TreeState,
      variables: [{ name: 'maxDiameter', value: 0 }],
    },
    {
      explanation: 'Visit node 4 (leaf, left child of 2). left=0, right=0. diameter=0+0=0. Returns depth=1.',
      highlightLine: 26,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n3: 'active' }),
        counters: [{ label: 'maxDiameter', value: 0 }],
      } as TreeState,
      variables: [{ name: 'left', value: 0 }, { name: 'right', value: 0 }, { name: 'depth(4)', value: 1 }],
    },
    {
      explanation: 'Visit node 5 (leaf, right child of 2). left=0, right=0. diameter=0+0=0. Returns depth=1.',
      highlightLine: 26,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n3: 'visited', n4: 'active' }),
        counters: [{ label: 'maxDiameter', value: 0 }],
      } as TreeState,
      variables: [{ name: 'left', value: 0 }, { name: 'right', value: 0 }, { name: 'depth(5)', value: 1 }],
    },
    {
      explanation: 'Back at node 2. left=1 (from 4), right=1 (from 5). diameter=1+1=2. maxDiameter = max(0,2) = 2. Returns depth=2.',
      highlightLine: 27,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'active', n3: 'visited', n4: 'visited' }),
        counters: [{ label: 'maxDiameter', value: 2 }],
      } as TreeState,
      variables: [{ name: 'left', value: 1 }, { name: 'right', value: 1 }, { name: 'maxDiameter', value: 2, highlight: true }],
    },
    {
      explanation: 'Visit node 3 (leaf, right child of 1). left=0, right=0. diameter=0. maxDiameter stays 2. Returns depth=1.',
      highlightLine: 26,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'visited', n2: 'active', n3: 'visited', n4: 'visited' }),
        counters: [{ label: 'maxDiameter', value: 2 }],
      } as TreeState,
      variables: [{ name: 'depth(3)', value: 1 }],
    },
    {
      explanation: 'Back at root (1). left=2 (from node 2), right=1 (from node 3). diameter=2+1=3. maxDiameter = max(2,3) = 3. Answer: 3.',
      highlightLine: 27,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n1: 'found', n2: 'found', n3: 'found', n4: 'found' }),
        counters: [{ label: 'maxDiameter', value: 3 }],
      } as TreeState,
      variables: [{ name: 'left', value: 2 }, { name: 'right', value: 1 }, { name: 'maxDiameter', value: 3, highlight: true }],
    },
  ];
}

export const diameterOfBinaryTreeMeta: AlgorithmMeta = {
  id: 'diameter-of-binary-tree',
  lcNumber: 543,
  title: 'Diameter of Binary Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given the root of a binary tree, return the length of the diameter of the tree. The diameter is the length of the longest path between any two nodes — this path may or may not pass through the root.',
  examples: [
    {
      input: 'root = [1,2,3,4,5]',
      output: '3',
      explanation: 'Longest path: 4 → 2 → 1 → 3 (length 3), or 5 → 2 → 1 → 3 (length 3).',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [1, 10^4].',
    '-100 <= Node.val <= 100',
  ],
  hint: 'At each node, the diameter through it equals leftDepth + rightDepth. Use postorder DFS, track maxDiameter as a non-local variable, and return 1 + max(left, right) to the caller.',
  solutions: [
    {
      label: 'Postorder DFS',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
