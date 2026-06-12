import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from collections import deque
import math
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        # valid BST means we need to compare current node's value to it's children or vice versa
        # let's do this with iterative DFS
        # we should keep track of what is allowed in current node
        # from the root, we allow everything, so lower bound of -inf and upper bound of inf
        # when we go left, the upper bound changes to root
        # when we go right, the lower bound changes to root

        stack = deque()
        stack.append([root,-math.inf, math.inf])

        while stack:
            currentNode, low, high = stack.pop()
            if not currentNode:
                continue

            # if current node not within bounds, return false
            # currentNode.val must be greater than low
            # currentNode.val must be less than high
            if currentNode.val <= low or currentNode.val >= high:
                return False

            # current node is valid, update boundaries to children and add to stack
            if currentNode.left:
                stack.append([currentNode.left, low, currentNode.val])
            if currentNode.right:
                stack.append([currentNode.right, currentNode.val, high])
        return True`;

// BST: [5, 3, 6, 2, 4, null, 7]
// n0=5(root), n1=3(leftId='n3',rightId='n4'), n2=6(leftId=null,rightId='n5'), n3=2(leaf), n4=4(leaf), n5=7(leaf)
function makeNodes(overrides: Record<string, TreeNode['state']> = {}): TreeNode[] {
  const base: Omit<TreeNode, 'state'>[] = [
    { id: 'n0', value: 5, leftId: 'n1', rightId: 'n2' },
    { id: 'n1', value: 3, leftId: 'n3', rightId: 'n4' },
    { id: 'n2', value: 6, leftId: null, rightId: 'n5' },
    { id: 'n3', value: 2, leftId: null, rightId: null },
    { id: 'n4', value: 4, leftId: null, rightId: null },
    { id: 'n5', value: 7, leftId: null, rightId: null },
  ];
  return base.map(n => ({ ...n, state: overrides[n.id] ?? 'default' }));
}

export function generateSteps() {
  return [
    {
      explanation: 'Iterative DFS with bounds. Push root(5) with bounds (-inf, inf). Stack: [[5, -inf, inf]].',
      highlightLine: 20,
      state: {
        type: 'tree' as const,
        nodes: makeNodes(),
        counters: [{ label: 'valid', value: '?' }],
      } as TreeState,
      variables: [{ name: 'stack', value: '[[5,-inf,inf]]' }],
    },
    {
      explanation: 'Pop node 5. Bounds: (-inf, inf). 5 > -inf AND 5 < inf — valid. Push left(3) with (-inf,5) and right(6) with (5,inf).',
      highlightLine: 30,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'active' }),
        counters: [{ label: 'valid', value: '?' }],
      } as TreeState,
      variables: [{ name: 'node', value: 5 }, { name: 'low', value: '-inf' }, { name: 'high', value: 'inf' }],
    },
    {
      explanation: 'Pop node 6 (right of 5). Bounds: (5, inf). 6 > 5 AND 6 < inf — valid. Push right(7) with (6,inf).',
      highlightLine: 30,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n2: 'active' }),
        counters: [{ label: 'valid', value: '?' }],
      } as TreeState,
      variables: [{ name: 'node', value: 6 }, { name: 'low', value: 5 }, { name: 'high', value: 'inf' }],
    },
    {
      explanation: 'Pop node 7 (right of 6). Bounds: (6, inf). 7 > 6 AND 7 < inf — valid. No children.',
      highlightLine: 30,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n2: 'visited', n5: 'active' }),
        counters: [{ label: 'valid', value: '?' }],
      } as TreeState,
      variables: [{ name: 'node', value: 7 }, { name: 'low', value: 6 }, { name: 'high', value: 'inf' }],
    },
    {
      explanation: 'Pop node 3 (left of 5). Bounds: (-inf, 5). 3 > -inf AND 3 < 5 — valid. Push left(2) with (-inf,3) and right(4) with (3,5).',
      highlightLine: 30,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'active', n2: 'visited', n5: 'visited' }),
        counters: [{ label: 'valid', value: '?' }],
      } as TreeState,
      variables: [{ name: 'node', value: 3 }, { name: 'low', value: '-inf' }, { name: 'high', value: 5 }],
    },
    {
      explanation: 'Pop node 4 (right of 3). Bounds: (3, 5). 4 > 3 AND 4 < 5 — valid. No children.',
      highlightLine: 30,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'visited', n4: 'active', n5: 'visited' }),
        counters: [{ label: 'valid', value: '?' }],
      } as TreeState,
      variables: [{ name: 'node', value: 4 }, { name: 'low', value: 3 }, { name: 'high', value: 5 }],
    },
    {
      explanation: 'Pop node 2 (left of 3). Bounds: (-inf, 3). 2 > -inf AND 2 < 3 — valid. Stack empty. All nodes valid — return True!',
      highlightLine: 36,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n1: 'found', n2: 'found', n3: 'found', n4: 'found', n5: 'found' }),
        counters: [{ label: 'isValidBST', value: 'True' }],
      } as TreeState,
      variables: [{ name: 'node', value: 2 }, { name: 'low', value: '-inf' }, { name: 'high', value: 3 }, { name: 'result', value: 'True', highlight: true }],
    },
  ];
}

export const validateBstMeta: AlgorithmMeta = {
  id: 'validate-bst',
  lcNumber: 98,
  title: 'Validate Binary Search Tree',
  difficulty: 'Medium',
  category: 'trees',
  tags: ['Tree', 'DFS', 'BST'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST requires that every node\'s left subtree contains only nodes with values strictly less than the node\'s value, and every node\'s right subtree contains only nodes with values strictly greater.',
  examples: [
    {
      input: 'root = [5,3,6,2,4,null,7]',
      output: 'true',
      explanation: 'Each node satisfies strict BST constraints with tracked lower/upper bounds.',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [1, 10^4].',
    '-2^31 <= Node.val <= 2^31 - 1',
  ],
  hint: 'Use iterative DFS with a stack of (node, low, high) tuples. Start root with (-inf, inf). When going left, upper bound becomes current val; when going right, lower bound becomes current val.',
  solutions: [
    {
      label: 'Iterative DFS with Bounds',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
