import { AlgorithmMeta, Step, TreeNode, TreeState } from '../../core/models/algorithm.model';

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
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 3, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 9, leftId: null, rightId: null },
  { id: 'n2', value: 20, leftId: 'n3', rightId: 'n4' },
  { id: 'n3', value: 15, leftId: null, rightId: null },
  { id: 'n4', value: 7, leftId: null, rightId: null },
];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;

  const colour: Record<string, TreeNode['state']> = {};
  const queue: string[] = ['n0'];
  const returnList: number[][] = [];

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

  const queueStr = () => '[' + queue.map((id) => valueOf(id)).join(', ') + ']';
  const resultStr = () => '[' + returnList.map((l) => '[' + l.join(',') + ']').join(', ') + ']';

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
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ processing' }] : [],
        counters: [
          { label: 'queue', value: queueStr() },
          { label: 'returnList', value: resultStr() },
        ],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'Level order = BFS with a queue. The one trick: at the START of each level the queue holds EXACTLY the nodes of that level. So we snapshot the queue length, pop that many nodes into one list, enqueuing their children as we go (those become the next level). Seed the queue with the root.',
    21,
    { vars: [{ name: 'queue', value: '[3]' }, { name: 'returnList', value: '[]' }] }
  );

  let level = 0;
  while (queue.length) {
    const levelSize = queue.length;
    const currentList: number[] = [];
    push(
      `Level ${level} begins. Snapshot lenOfQueue = ${levelSize} → there are ${levelSize} node(s) on this level. We'll pop exactly ${levelSize} of them into a fresh currentList = [].`,
      24,
      { vars: [{ name: 'lenOfQueue', value: levelSize, highlight: true }, { name: 'currentList', value: '[]' }] }
    );

    for (let i = 0; i < levelSize; i++) {
      const id = queue.shift()!;
      const v = valueOf(id);
      colour[id] = 'active';
      currentList.push(v);
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
      colour[id] = 'visited';
      push(
        `Level ${level}, i=${i}: pop node ${v} from the front, append it to currentList (now [${currentList.join(',')}]). ${
          enq.length ? `Enqueue its children (${enq.join(', ')}) for the next level → queue ${queueStr()}.` : 'It has no children, nothing to enqueue.'
        }`,
        enq.length ? 34 : 32,
        {
          current: id,
          vars: [
            { name: 'i', value: i },
            { name: 'currentNode', value: v },
            { name: 'currentList', value: '[' + currentList.join(',') + ']', highlight: true },
          ],
        }
      );
    }

    returnList.push(currentList);
    push(
      `Level ${level} finished — all ${levelSize} node(s) processed. Append currentList [${currentList.join(',')}] to returnList → ${resultStr()}. ${queue.length ? 'The queue now holds the next level.' : 'The queue is empty.'}`,
      38,
      { vars: [{ name: 'returnList', value: resultStr(), highlight: true }] }
    );
    level++;
  }

  NODES.forEach((n) => (colour[n.id] = 'found'));
  push(
    `Queue is empty — BFS complete. Final level order = ${resultStr()}.`,
    39,
    { vars: [{ name: 'result', value: resultStr(), highlight: true }] }
  );

  return steps;
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
