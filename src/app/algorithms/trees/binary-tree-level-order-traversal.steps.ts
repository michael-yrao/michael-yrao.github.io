import { AlgorithmMeta, Step, StepAnchor, TreeNode, TreeState } from '../../core/models/algorithm.model';

// Traces cse-progress's levelOrder verbatim: unlike a "never enqueue None" BFS, this attempt
// seeds the queue with root unconditionally and guards every dequeue with `if currentNode:`
// (so a None root just produces an empty currentList and returnList) — that check is always
// True for this non-empty example, but we still narrate it since it's really there.

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
    anchor: StepAnchor,
    opts: { current?: string | null; vars?: { name: string; value: string | number; highlight?: boolean }[] } = {}
  ) => {
    steps.push({
      explanation,
      anchor,
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
    'Level order = BFS with a queue. The one trick: at the START of each level the queue holds EXACTLY the nodes of that level. So we snapshot the queue length, pop that many nodes into one list, enqueuing their children as we go (those become the next level). queue = deque(); queue.append(root) seeds it.',
    { match: 'queue = deque()', to: { match: 'queue.append(root)' } },
    { vars: [{ name: 'queue', value: '[3]' }, { name: 'returnList', value: '[]' }] }
  );

  let level = 0;
  while (queue.length) {
    const levelSize = queue.length;
    const currentList: number[] = [];
    push(
      `Level ${level} begins. Snapshot lenOfQueue = ${levelSize} → there are ${levelSize} node(s) on this level. We'll pop exactly ${levelSize} of them into a fresh currentList = [].`,
      { match: 'lenOfQueue = len(queue)', to: { match: 'currentList = []' } },
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
        `Level ${level}, i=${i}: currentNode = queue.popleft() → node ${v}. if currentNode: True → append its val to currentList (now [${currentList.join(',')}]). ${
          enq.length ? `Enqueue its children (${enq.join(', ')}) for the next level → queue ${queueStr()}.` : 'It has no children, nothing to enqueue.'
        }`,
        { match: 'currentNode = queue.popleft()', to: { match: 'queue.append(currentNode.right)' } },
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
      `Level ${level} finished — all ${levelSize} node(s) processed. if currentList: True (non-empty) → append it to returnList → ${resultStr()}. ${queue.length ? 'The queue now holds the next level.' : 'The queue is empty.'}`,
      { match: 'if currentList:', to: { match: 'returnList.append(currentList)' } },
      { vars: [{ name: 'returnList', value: resultStr(), highlight: true }] }
    );
    level++;
  }

  NODES.forEach((n) => (colour[n.id] = 'found'));
  push(
    `Queue is empty — BFS complete. Final level order = ${resultStr()}.`,
    { match: 'return returnList' },
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
      variant: 'bfs',
      generateSteps,
    },
  ],
};
