import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `import collections
from typing import List, Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def rightSideView(self, root: Optional[TreeNode]) -> List[int]:
        # if we do bfs, it's just the last element we see each time
        # so we'll just do that
        if not root:
            return []

        result = []

        queue = collections.deque()

        queue.append(root)

        while queue:
            # we want to put the last element of each level in the result
            # so we want to keep track of number of elements in each level
            numElementInLevel = len(queue)

            for i in range(numElementInLevel):
                currentNode = queue.popleft()
                # at last element, add to result
                if i == numElementInLevel - 1:
                    result.append(currentNode.val)
                if currentNode.left:
                    queue.append(currentNode.left)
                if currentNode.right:
                    queue.append(currentNode.right)

        return result`;

// Tree: [1,2,3,null,5,null,4]  →  right side view = [1,3,4]
//
//        1
//       / \
//      2   3
//       \    \
//        5    4
function makeNodes(overrides: Record<string, TreeNode['state']> = {}): TreeNode[] {
  const base: Omit<TreeNode, 'state'>[] = [
    { id: 'n0', value: 1, leftId: 'n1', rightId: 'n2' },
    { id: 'n1', value: 2, leftId: null, rightId: 'n3' },
    { id: 'n2', value: 3, leftId: null, rightId: 'n4' },
    { id: 'n3', value: 5, leftId: null, rightId: null },
    { id: 'n4', value: 4, leftId: null, rightId: null },
  ];
  return base.map(n => ({ ...n, state: overrides[n.id] ?? 'default' }));
}

export function generateSteps() {
  return [
    {
      explanation: 'Seed BFS: append root 1 to the queue. result=[], queue=[1].',
      highlightLine: 21,
      state: {
        type: 'tree' as const,
        nodes: makeNodes(),
        counters: [{ label: 'result', value: '[]' }],
      } as TreeState,
      variables: [{ name: 'queue', value: '[1]' }],
    },
    {
      explanation: 'Level 0: numElementInLevel=1. We will iterate i=0..0.',
      highlightLine: 26,
      state: {
        type: 'tree' as const,
        nodes: makeNodes(),
        counters: [{ label: 'result', value: '[]' }],
      } as TreeState,
      variables: [{ name: 'numElementInLevel', value: '1' }, { name: 'queue', value: '[1]' }],
    },
    {
      explanation: 'Level 0, i=0: dequeue node 1. i==0==numElementInLevel-1 — this is the last (and only) node in the level.',
      highlightLine: 29,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'active' }),
        counters: [{ label: 'result', value: '[]' }],
      } as TreeState,
      variables: [{ name: 'currentNode', value: '1' }, { name: 'i', value: '0' }, { name: 'numElementInLevel', value: '1' }, { name: 'queue', value: '[]' }],
    },
    {
      explanation: 'i==numElementInLevel-1 → last node in this level. Append 1 to result. Then enqueue children 2 and 3.',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'active' }),
        counters: [{ label: 'result', value: '[1]' }],
      } as TreeState,
      variables: [{ name: 'result', value: '[1]', highlight: true }, { name: 'queue', value: '[2,3]' }],
    },
    {
      explanation: 'Level 1: numElementInLevel=2. We will iterate i=0..1. Only the node at i=1 is added to result.',
      highlightLine: 26,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited' }),
        counters: [{ label: 'result', value: '[1]' }],
      } as TreeState,
      variables: [{ name: 'numElementInLevel', value: '2' }, { name: 'queue', value: '[2,3]' }],
    },
    {
      explanation: 'Level 1, i=0: dequeue node 2. i=0 != numElementInLevel-1=1 — NOT the last node; skip it. Enqueue right child 5.',
      highlightLine: 31,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'active' }),
        counters: [{ label: 'result', value: '[1]' }],
      } as TreeState,
      variables: [{ name: 'currentNode', value: '2' }, { name: 'i', value: '0' }, { name: 'numElementInLevel', value: '2' }, { name: 'queue', value: '[3,5]' }],
    },
    {
      explanation: 'Level 1, i=1: dequeue node 3. i=1==numElementInLevel-1 — last node in this level.',
      highlightLine: 29,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'active' }),
        counters: [{ label: 'result', value: '[1]' }],
      } as TreeState,
      variables: [{ name: 'currentNode', value: '3' }, { name: 'i', value: '1' }, { name: 'numElementInLevel', value: '2' }, { name: 'queue', value: '[5]' }],
    },
    {
      explanation: 'i==numElementInLevel-1 → last node. Append 3 to result. Enqueue right child 4. queue=[5,4].',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'active' }),
        counters: [{ label: 'result', value: '[1,3]' }],
      } as TreeState,
      variables: [{ name: 'result', value: '[1,3]', highlight: true }, { name: 'queue', value: '[5,4]' }],
    },
    {
      explanation: 'Level 2: numElementInLevel=2. Iterate i=0..1.',
      highlightLine: 26,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'visited' }),
        counters: [{ label: 'result', value: '[1,3]' }],
      } as TreeState,
      variables: [{ name: 'numElementInLevel', value: '2' }, { name: 'queue', value: '[5,4]' }],
    },
    {
      explanation: 'Level 2, i=0: dequeue node 5. i=0 != 1 — NOT last. 5 has no children. queue=[4].',
      highlightLine: 31,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'visited', n3: 'active' }),
        counters: [{ label: 'result', value: '[1,3]' }],
      } as TreeState,
      variables: [{ name: 'currentNode', value: '5' }, { name: 'i', value: '0' }, { name: 'numElementInLevel', value: '2' }, { name: 'queue', value: '[4]' }],
    },
    {
      explanation: 'Level 2, i=1: dequeue node 4. i=1==numElementInLevel-1 — last in this level.',
      highlightLine: 29,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'visited', n3: 'visited', n4: 'active' }),
        counters: [{ label: 'result', value: '[1,3]' }],
      } as TreeState,
      variables: [{ name: 'currentNode', value: '4' }, { name: 'i', value: '1' }, { name: 'numElementInLevel', value: '2' }, { name: 'queue', value: '[]' }],
    },
    {
      explanation: 'i==numElementInLevel-1 → last node. Append 4 to result. No children. Queue is now empty.',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'visited', n3: 'visited', n4: 'active' }),
        counters: [{ label: 'result', value: '[1,3,4]' }],
      } as TreeState,
      variables: [{ name: 'result', value: '[1,3,4]', highlight: true }, { name: 'queue', value: '[]' }],
    },
    {
      explanation: 'Queue empty — BFS complete. The rightmost node at each depth was [1, 3, 4]. Return result.',
      highlightLine: 38,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n1: 'found', n2: 'found', n3: 'found', n4: 'found' }),
        counters: [{ label: 'result', value: '[1,3,4]' }],
      } as TreeState,
      variables: [{ name: 'result', value: '[1,3,4]', highlight: true }],
    },
  ];
}

export const binaryTreeRightSideViewMeta: AlgorithmMeta = {
  id: 'binary-tree-right-side-view',
  lcNumber: 199,
  title: 'Binary Tree Right Side View',
  difficulty: 'Medium',
  category: 'trees',
  tags: ['Tree', 'BFS', 'Queue', 'DFS'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description: 'Given the root of a binary tree, imagine yourself standing on the right side of it. Return the values of the nodes you can see ordered from top to bottom.',
  examples: [
    {
      input: 'root = [1,2,3,null,5,null,4]',
      output: '[1,3,4]',
      explanation: 'From the right, you see node 1 (depth 0), node 3 (depth 1, rightmost), node 4 (depth 2, rightmost).',
    },
    {
      input: 'root = [1,null,3]',
      output: '[1,3]',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [0, 100].',
    '-100 <= Node.val <= 100',
  ],
  hint: 'BFS level by level. At each level, track how many nodes are in the queue (numElementInLevel). Only the node processed at i == numElementInLevel - 1 is visible from the right — add it to the result.',
  solutions: [
    {
      label: 'BFS (level-by-level, take last of each level)',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
