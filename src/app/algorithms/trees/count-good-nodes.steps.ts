import { AlgorithmMeta, Step, StepAnchor, TreeNode, TreeState } from '../../core/models/algorithm.model';

// Traces cse-progress's goodNodes verbatim: an explicit stack of [node, currentMax] pairs
// (both children pushed even when null), popped with `currentNode, currentMax = stack.pop()`,
// then an `if currentNode:` guard before comparing — same control flow as the earlier hand
// simulation, only anchors change.

// Tree: [3, 1, 4, 3, null, 1, 5]
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 3, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 1, leftId: 'n3', rightId: null },
  { id: 'n2', value: 4, leftId: 'n4', rightId: 'n5' },
  { id: 'n3', value: 3, leftId: null, rightId: null },
  { id: 'n4', value: 1, leftId: null, rightId: null },
  { id: 'n5', value: 5, leftId: null, rightId: null },
];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;

  const colour: Record<string, TreeNode['state']> = {};
  let result = 0;

  // Explicit stack of [nodeId|null, currentMax] — mirrors the Python deque.
  type Frame = [string | null, number];
  const stack: Frame[] = [['n0', 3]];

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

  const stackStr = () =>
    '[' +
    stack
      .map(([id, cm]) => `(${id ? valueOf(id) : 'ø'},max${cm})`)
      .join(', ') +
    ']';

  const push = (
    explanation: string,
    anchor: StepAnchor,
    opts: {
      current?: string | null;
      vars?: { name: string; value: string | number; highlight?: boolean }[];
    } = {}
  ) => {
    steps.push({
      explanation,
      anchor,
      state: {
        type: 'tree',
        nodes: makeNodes(),
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ popped' }] : [],
        counters: [
          { label: 'result', value: result },
          { label: 'stack', value: stackStr() },
        ],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'A node is "good" if no node on the path from the root to it is larger than it — i.e. its value ≥ the max value seen so far on that path. We do an iterative DFS with an explicit stack holding (node, currentMax) pairs. currentMax travels DOWN each path so every node knows the biggest ancestor above it. Start by pushing (root 3, max 3).',
    { match: 'currentMax = root.val', to: { match: 'stack.append([root, currentMax])' } },
    { vars: [{ name: 'result', value: 0 }, { name: 'stack', value: '[(3,max3)]' }] }
  );

  while (stack.length) {
    const [id, cm] = stack.pop()!;

    // Pop step.
    push(
      `Pop (${id ? valueOf(id) : 'null'}, max ${cm}) off the stack. ${
        id ? 'Node is non-null, so process it.' : 'Node is null → the "if currentNode" check is False, skip it entirely and loop again.'
      }`,
      { match: 'currentNode, currentMax = stack.pop()', to: { match: 'if currentNode:' } },
      {
        current: id,
        vars: [
          { name: 'currentNode', value: id ? valueOf(id) : 'null' },
          { name: 'currentMax', value: cm },
        ],
      }
    );

    if (!id) continue;

    const v = valueOf(id);
    const good = v >= cm;
    const newMax = Math.max(cm, v);
    if (good) result += 1;
    colour[id] = good ? 'found' : 'visited';

    push(
      `Node ${v} vs currentMax ${cm}: ${v} ${good ? `≥ ${cm} → GOOD node, result becomes ${result} and currentMax updates to ${newMax} for this node's children.` : `< ${cm} → NOT good (an ancestor was bigger). result stays ${result}.`}`,
      good
        ? { match: 'if currentNode.val >= currentMax:', to: { match: 'currentMax = max(currentMax, currentNode.val)' } }
        : { match: 'if currentNode.val >= currentMax:' },
      {
        current: id,
        vars: [
          { name: 'node.val', value: v },
          { name: 'currentMax', value: cm },
          { name: 'good?', value: good ? 'Yes' : 'No', highlight: good },
          { name: 'result', value: result, highlight: good },
        ],
      }
    );

    // Push both children (even null — matches the code, which is why we needed the null check above).
    const node = nodeMap.get(id)!;
    stack.push([node.leftId, newMax]);
    stack.push([node.rightId, newMax]);
    const leftLabel = node.leftId ? valueOf(node.leftId) : 'null';
    const rightLabel = node.rightId ? valueOf(node.rightId) : 'null';
    push(
      `Push ${v}'s children with the updated max ${newMax}: left=${leftLabel}, right=${rightLabel}. (We push even null children — that's why each pop starts with an "is it null?" check.) Stack is now ${stackStr()}.`,
      { match: 'stack.append([currentNode.left,currentMax])', to: { match: 'stack.append([currentNode.right,currentMax])' } },
      {
        current: id,
        vars: [
          { name: 'pushed left', value: `(${leftLabel}, max${newMax})` },
          { name: 'pushed right', value: `(${rightLabel}, max${newMax})` },
        ],
      }
    );
  }

  push(
    `Stack is empty — every node has been processed. Good nodes found: root 3, node 4, node 5, and the leaf 3 (path 3→1→3, max 3, 3 ≥ 3). Total result = ${result}.`,
    { match: 'return result' },
    { vars: [{ name: 'result', value: result, highlight: true }] }
  );

  return steps;
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
      variant: 'iterative-dfs',
      generateSteps,
    },
  ],
};
