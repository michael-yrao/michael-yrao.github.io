import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from collections import deque
from typing import List, Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        # this is just bfs
        # for bfs, we use a queue
        # we insert the root into the queue
        # process it and then insert its left/right children in there
        # main tricky part here is keeping track of number of nodes at each depth

        returnList = []

        queue = deque()
        queue.append(root)

        while queue:
            lenOfQueue = len(queue)
            currentList = []
            # at each step we insert children in
            # thus when we start, queue has all the nodes for the current level
            for i in range(lenOfQueue):
                currentNode = queue.popleft()

                if currentNode:
                    currentList.append(currentNode.val)
                    if currentNode.left:
                        queue.append(currentNode.left)
                    if currentNode.right:
                        queue.append(currentNode.right)
            if currentList:
                returnList.append(currentList)
        return returnList`;

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
      explanation: 'Initialize BFS. Queue=[3]. returnList=[]. We will process one level at a time.',
      highlightLine: 21,
      state: {
        type: 'tree' as const,
        nodes: makeNodes(),
        counters: [{ label: 'returnList', value: '[]' }],
      } as TreeState,
      variables: [{ name: 'queue', value: '[3]' }],
    },
    {
      explanation: 'Level 0: queue has 1 node. Process node 3. Append 3 to currentList. Enqueue children 9 and 20.',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'active' }),
        counters: [{ label: 'returnList', value: '[]' }],
      } as TreeState,
      variables: [{ name: 'currentList', value: '[3]' }, { name: 'queue', value: '[9,20]' }],
    },
    {
      explanation: 'Level 0 done. returnList=[[3]]. Now level 1: queue has 2 nodes (9 and 20).',
      highlightLine: 38,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited' }),
        counters: [{ label: 'returnList', value: '[[3]]' }],
      } as TreeState,
      variables: [{ name: 'queue', value: '[9,20]' }],
    },
    {
      explanation: 'Level 1: process node 9 (leaf). Append 9. No children to enqueue.',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'active' }),
        counters: [{ label: 'returnList', value: '[[3]]' }],
      } as TreeState,
      variables: [{ name: 'currentList', value: '[9]' }, { name: 'queue', value: '[20]' }],
    },
    {
      explanation: 'Level 1: process node 20. Append 20. Enqueue children 15 and 7.',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'active' }),
        counters: [{ label: 'returnList', value: '[[3]]' }],
      } as TreeState,
      variables: [{ name: 'currentList', value: '[9,20]' }, { name: 'queue', value: '[15,7]' }],
    },
    {
      explanation: 'Level 1 done. returnList=[[3],[9,20]]. Now level 2: queue has 2 nodes (15 and 7).',
      highlightLine: 38,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'visited' }),
        counters: [{ label: 'returnList', value: '[[3],[9,20]]' }],
      } as TreeState,
      variables: [{ name: 'queue', value: '[15,7]' }],
    },
    {
      explanation: 'Level 2: process node 15 (leaf). Append 15 to currentList. No children to enqueue.',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'visited', n3: 'active' }),
        counters: [{ label: 'returnList', value: '[[3],[9,20]]' }],
      } as TreeState,
      variables: [{ name: 'currentList', value: '[15]' }, { name: 'queue', value: '[7]' }],
    },
    {
      explanation: 'Level 2: process node 7 (leaf). Append 7. currentList=[15,7]. Queue becomes empty.',
      highlightLine: 32,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'visited', n2: 'visited', n3: 'visited', n4: 'active' }),
        counters: [{ label: 'returnList', value: '[[3],[9,20]]' }],
      } as TreeState,
      variables: [{ name: 'currentList', value: '[15,7]' }, { name: 'queue', value: '[]' }],
    },
    {
      explanation: 'All levels processed. returnList=[[3],[9,20],[15,7]]. BFS complete.',
      highlightLine: 39,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'found', n1: 'found', n2: 'found', n3: 'found', n4: 'found' }),
        counters: [{ label: 'returnList', value: '[[3],[9,20],[15,7]]' }],
      } as TreeState,
      variables: [{ name: 'result', value: '[[3],[9,20],[15,7]]', highlight: true }],
    },
  ];
}

export const binaryTreeLevelOrderTraversalMeta: AlgorithmMeta = {
  id: 'binary-tree-level-order-traversal',
  lcNumber: 102,
  title: 'Binary Tree Level Order Traversal',
  difficulty: 'Medium',
  category: 'trees',
  tags: ['Tree', 'BFS', 'Queue'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description: 'Given the root of a binary tree, return the level order traversal of its nodes\' values (i.e., from left to right, level by level).',
  examples: [
    {
      input: 'root = [3,9,20,null,null,15,7]',
      output: '[[3],[9,20],[15,7]]',
      explanation: 'Level 0: [3]. Level 1: [9,20]. Level 2: [15,7].',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [0, 2000].',
    '-1000 <= Node.val <= 1000',
  ],
  hint: 'Use BFS with a queue. At each iteration, record the current queue length — that tells you how many nodes are on the current level. Process exactly that many nodes, then move on to the next level.',
  solutions: [
    {
      label: 'BFS (Queue)',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
