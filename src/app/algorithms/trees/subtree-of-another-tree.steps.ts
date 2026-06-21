import { AlgorithmMeta, Step, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from collections import deque
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isSubtree(self, root: Optional[TreeNode], subRoot: Optional[TreeNode]) -> bool:
        # so this is like a combo problem
        # we want to find if the root of subRoot is in root
        # then we want to run isSameTree from there
        # so we can start with a bfs to find the subroot node
        # then we do preorder dfs to check isSameTree

        # bfs is queue based, so we go through the root tree
        # and populate the queue until we find the node we are looking for
        # then we run preorder dfs to find subRoot

        def dfs(p,q):
            if not p and not q:
                return True

            if p and q and p.val == q.val:
                return dfs(p.left,q.left) and dfs(p.right,q.right)
            else:
                return False

        queue = deque([root])

        while queue:
            # deque is both a queue and a stack
            # popleft is equivalent to queue.pop()
            # popright is equivalent to stack.pop()
            currentNode = queue.popleft()

            if currentNode.val == subRoot.val:
                # if found, we just return True
                # if not found, we continue to search
                if dfs(currentNode, subRoot):
                    return True
            if currentNode.left:
                queue.append(currentNode.left)
            if currentNode.right:
                queue.append(currentNode.right)

        return False`;

// Root tree: [3, 4, 5, 1, 2]   subRoot = [4, 1, 2]
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 3, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 4, leftId: 'n3', rightId: 'n4' },
  { id: 'n2', value: 5, leftId: null, rightId: null },
  { id: 'n3', value: 1, leftId: null, rightId: null },
  { id: 'n4', value: 2, leftId: null, rightId: null },
];

// subRoot tree (not rendered; compared against by value).
const SUB: Record<string, { val: number; left: string | null; right: string | null }> = {
  s0: { val: 4, left: 's1', right: 's2' },
  s1: { val: 1, left: null, right: null },
  s2: { val: 2, left: null, right: null },
};

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;
  const subVal = 4; // subRoot.val

  const colour: Record<string, TreeNode['state']> = {};
  const queue: string[] = ['n0'];

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

  const queueStr = () => '[' + queue.map((id) => valueOf(id)).join(', ') + ']';

  const push = (
    explanation: string,
    line: number,
    opts: {
      current?: string | null;
      queueShown?: string;
      vars?: { name: string; value: string | number; highlight?: boolean }[];
    } = {}
  ) => {
    steps.push({
      explanation,
      highlightLine: line,
      state: {
        type: 'tree',
        nodes: makeNodes(),
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ here' }] : [],
        counters: [{ label: 'BFS queue', value: opts.queueShown ?? queueStr() }],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'Plan (two phases): (1) BFS through the big tree to find any node whose value equals subRoot.val = 4; (2) from each such candidate, run isSameTree to check the WHOLE subtree matches. Start BFS with the root in the queue.',
    31,
    { vars: [{ name: 'subRoot.val', value: subVal }, { name: 'queue', value: '[3]' }] }
  );

  // Phase 2 helper: compare root-tree node id against subRoot node sId.
  function dfs(id: string | null, sId: string | null, side: string, parentId: string | null): boolean {
    const sub = sId ? SUB[sId] : null;
    if (id === null && sub === null) {
      push(
        `isSameTree — ${side}: both sides are null → base case "return True". Two empty spots match.`,
        24,
        { current: parentId, vars: [{ name: 'p', value: 'null' }, { name: 'q', value: 'null' }, { name: 'match', value: 'True', highlight: true }] }
      );
      return true;
    }
    if (id === null || sub === null) {
      push(
        `isSameTree — ${side}: one side has a node and the other is null → structures differ, return False.`,
        29,
        { current: parentId, vars: [{ name: 'match', value: 'False', highlight: true }] }
      );
      return false;
    }
    const v = valueOf(id);
    colour[id] = 'comparing';
    push(
      `isSameTree — ${side}: compare ${v} (big tree) vs ${sub.val} (subRoot) → ${v === sub.val ? 'equal ✓, recurse into both left children.' : 'differ ✗, return False.'}`,
      v === sub.val ? 27 : 29,
      { current: id, vars: [{ name: 'p.val', value: v }, { name: 'q.val', value: sub.val }, { name: 'match', value: v === sub.val ? 'True' : 'False', highlight: true }] }
    );
    if (v !== sub.val) return false;
    const leftSame = dfs(nodeMap.get(id)!.leftId, sub.left, `left of ${v}`, id);
    const rightSame = dfs(nodeMap.get(id)!.rightId, sub.right, `right of ${v}`, id);
    return leftSame && rightSame;
  }

  let found = false;
  while (queue.length && !found) {
    const id = queue.shift()!;
    const v = valueOf(id);
    const isMatch = v === subVal;

    push(
      `Dequeue node ${v} (front of queue). Compare its value to subRoot.val ${subVal}: ${isMatch ? `equal — this is a candidate, launch isSameTree from here.` : `not equal, it can't be the subtree root; we'll just enqueue its children and move on.`}`,
      isMatch ? 39 : 37,
      { current: id, queueShown: queueStr(), vars: [{ name: 'currentNode.val', value: v }, { name: 'subRoot.val', value: subVal }] }
    );

    if (isMatch) {
      const same = dfs(id, 's0', 'roots', null);
      if (same) {
        NODES.forEach((n) => {
          if (n.id === 'n1' || n.id === 'n3' || n.id === 'n4') colour[n.id] = 'found';
        });
        push(
          `isSameTree returned True — the subtree rooted at node ${v} matches subRoot [4,1,2] exactly. isSubtree returns True; we can stop searching.`,
          43,
          { current: id, vars: [{ name: 'result', value: 'True', highlight: true }] }
        );
        found = true;
        break;
      }
    }

    colour[id] = 'visited';
    const node = nodeMap.get(id)!;
    if (node.leftId) queue.push(node.leftId);
    if (node.rightId) queue.push(node.rightId);
    if (!isMatch) {
      push(
        `Enqueue node ${v}'s children. Queue is now ${queueStr()}, loop again.`,
        45,
        { vars: [{ name: 'queue', value: queueStr() }] }
      );
    }
  }

  return steps;
}

export const subtreeOfAnotherTreeMeta: AlgorithmMeta = {
  id: 'subtree-of-another-tree',
  lcNumber: 572,
  title: 'Subtree of Another Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS', 'String Matching'],
  timeComplexity: 'O(m·n)',
  spaceComplexity: 'O(m+n)',
  description: 'Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values as subRoot and false otherwise.',
  examples: [
    {
      input: 'root = [3,4,5,1,2], subRoot = [4,1,2]',
      output: 'true',
      explanation: 'The subtree rooted at node 4 in root matches subRoot exactly.',
    },
  ],
  constraints: [
    'The number of nodes in the root tree is in the range [1, 2000].',
    'The number of nodes in the subRoot tree is in the range [1, 1000].',
    '-10^4 <= root.val, subRoot.val <= 10^4',
  ],
  hint: 'BFS through root to find any node matching subRoot.val, then run isSameTree from that node. If isSameTree returns True, found the subtree.',
  solutions: [
    {
      label: 'BFS + DFS',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
