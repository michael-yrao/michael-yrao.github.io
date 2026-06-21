import { AlgorithmMeta, Step, TreeNode, TreeState } from '../../core/models/algorithm.model';

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
//        1
//       / \
//      2   3
//       \    \
//        5    4
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 1, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 2, leftId: null, rightId: 'n3' },
  { id: 'n2', value: 3, leftId: null, rightId: 'n4' },
  { id: 'n3', value: 5, leftId: null, rightId: null },
  { id: 'n4', value: 4, leftId: null, rightId: null },
];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;

  const colour: Record<string, TreeNode['state']> = {};
  const queue: string[] = ['n0'];
  const result: number[] = [];

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

  const queueStr = () => '[' + queue.map((id) => valueOf(id)).join(', ') + ']';
  const resultStr = () => '[' + result.join(', ') + ']';

  const push = (
    explanation: string,
    line: number,
    opts: { current?: string | null; vars?: { name: string; value: string | number; highlight?: boolean }[] } = {}
  ) => {
    steps.push({
      explanation,
      highlightLine: line,
      state: {
        type: 'tree',
        nodes: makeNodes(),
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ here' }] : [],
        counters: [
          { label: 'queue', value: queueStr() },
          { label: 'result', value: resultStr() },
        ],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'Standing on the right, you see exactly the LAST node of each level (the rightmost one). So we BFS level by level, and within a level we only record the node at index i == numElementInLevel − 1. Seed the queue with the root.',
    21,
    { vars: [{ name: 'queue', value: '[1]' }, { name: 'result', value: '[]' }] }
  );

  let level = 0;
  while (queue.length) {
    const levelSize = queue.length;
    push(
      `Level ${level}: snapshot numElementInLevel = ${levelSize}. The visible node will be the one at i = ${levelSize - 1} (the last we pop this level).`,
      26,
      { vars: [{ name: 'numElementInLevel', value: levelSize, highlight: true }] }
    );

    for (let i = 0; i < levelSize; i++) {
      const id = queue.shift()!;
      const v = valueOf(id);
      const isLast = i === levelSize - 1;
      colour[id] = 'active';
      if (isLast) {
        result.push(v);
        colour[id] = 'found';
      } else {
        colour[id] = 'visited';
      }
      const node = nodeMap.get(id)!;
      const enq: string[] = [];
      if (node.leftId) {
        queue.push(node.leftId);
        enq.push(`left ${valueOf(node.leftId)}`);
      }
      if (node.rightId) {
        queue.push(node.rightId);
        enq.push(`right ${valueOf(node.rightId)}`);
      }
      push(
        `Level ${level}, i=${i}: pop node ${v}. Is i (${i}) == numElementInLevel−1 (${levelSize - 1})? ${
          isLast
            ? `Yes → it's the rightmost on this level, append ${v} to result → ${resultStr()}.`
            : `No → not the rightmost, don't record it.`
        } ${enq.length ? `Enqueue its children (${enq.join(', ')}) → queue ${queueStr()}.` : 'No children to enqueue.'}`,
        isLast ? 32 : 29,
        {
          current: id,
          vars: [
            { name: 'i', value: i },
            { name: 'currentNode', value: v },
            { name: 'last in level?', value: isLast ? 'Yes' : 'No', highlight: isLast },
            { name: 'result', value: resultStr(), highlight: isLast },
          ],
        }
      );
    }
    level++;
  }

  push(
    `Queue empty — done. The rightmost node at each depth, top to bottom, is ${resultStr()}.`,
    38,
    { vars: [{ name: 'result', value: resultStr(), highlight: true }] }
  );

  return steps;
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
