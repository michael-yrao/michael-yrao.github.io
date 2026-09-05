// Solution + comments sourced from cse-progress: dsa/leetcode/trees/105_construct_binary_tree_from_preorder_and_inorder_traversal.py
import { AlgorithmMeta, SolutionVariant, Step, TreeNode, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def buildTree(self, preorder: List[int], inorder: List[int]) -> Optional[TreeNode]:
        # preorder = root, left, right
        # inorder = left, root, right
        # preorder[0] is the root
        if not preorder:
            return None

        root = TreeNode(preorder[0])
        mid = inorder.index(preorder[0])
        # left : we want inorder items before mid
        # from preorder, we want node 1 to node mid because we know there are mid number of left nodes
        root.left = self.buildTree(preorder[1:mid+1], inorder[:mid])
        # right : we want inorder items after mid
        # from preorder, we want everythign after the mid node since those are right nodes
        root.right = self.buildTree(preorder[1+mid:], inorder[1+mid:])

        return root`;

const PREORDER = [3, 9, 20, 15, 7];
const INORDER = [9, 3, 15, 20, 7];

// Final tree structure, keyed by value (values are unique per constraints).
const CHILDREN: Record<number, { left: number | null; right: number | null }> = {
  3: { left: 9, right: 20 },
  9: { left: null, right: null },
  20: { left: 15, right: 7 },
  15: { left: null, right: null },
  7: { left: null, right: null },
};

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const revealed = new Set<number>();

  const nodeId = (v: number) => `n${v}`;
  const buildTreeState = (activeVal: number | null): Step['state'] => ({
    type: 'tree',
    nodes: [...revealed].map((v): TreeNode => {
      const c = CHILDREN[v];
      return {
        id: nodeId(v),
        value: v,
        state: v === activeVal ? 'active' : 'visited',
        leftId: c.left !== null && revealed.has(c.left) ? nodeId(c.left) : null,
        rightId: c.right !== null && revealed.has(c.right) ? nodeId(c.right) : null,
      };
    }),
    counters: [
      { label: 'preorder', value: `[${PREORDER.join(',')}]` },
      { label: 'inorder', value: `[${INORDER.join(',')}]` },
      { label: 'nodes built', value: revealed.size },
    ],
  });

  steps.push({
    explanation:
      'Rebuild the tree from preorder [root, left…, right…] and inorder [left…, root, right…]. Key insight: preorder[0] is always the current root; its position in inorder splits the remaining values into the left subtree (before it) and right subtree (after it). Recurse on each side.',
    highlightLine: 5,
    state: buildTreeState(null),
    variables: [],
  });

  const build = (pre: number[], inord: number[], side: string): void => {
    // if not preorder: return None
    if (pre.length === 0) {
      steps.push({
        explanation: `${side}: preorder slice is empty → return None (no node here).`,
        highlightLine: 8,
        state: buildTreeState(null),
        variables: [{ name: 'preorder', value: '[]' }, { name: 'return', value: 'None' }],
      });
      return;
    }

    const rootVal = pre[0];
    const mid = inord.indexOf(rootVal);
    revealed.add(rootVal);

    const leftPre = pre.slice(1, mid + 1);
    const leftIn = inord.slice(0, mid);
    const rightPre = pre.slice(mid + 1);
    const rightIn = inord.slice(mid + 1);

    steps.push({
      explanation: `${side}: root = preorder[0] = ${rootVal}. Find ${rootVal} in inorder at index ${mid}. Everything left of it in inorder ([${leftIn.join(',')}]) is the left subtree; everything right ([${rightIn.join(',')}]) is the right subtree.`,
      highlightLine: 11,
      state: buildTreeState(rootVal),
      variables: [
        { name: 'root', value: rootVal, highlight: true },
        { name: 'mid', value: mid },
        { name: 'pre', value: `[${pre.join(',')}]` },
        { name: 'in', value: `[${inord.join(',')}]` },
      ],
    });

    build(leftPre, leftIn, `${rootVal}.left`);
    build(rightPre, rightIn, `${rootVal}.right`);

    steps.push({
      explanation: `${side}: both children of ${rootVal} attached — return node ${rootVal} up to its parent.`,
      highlightLine: 20,
      state: buildTreeState(rootVal),
      variables: [{ name: 'return', value: rootVal, highlight: true }],
    });
  };

  build(PREORDER, INORDER, 'root');

  steps.push({
    explanation:
      'Recursion complete — the whole tree is reconstructed. Each value is created once and inorder.index is scanned per node, giving O(n²) worst case (a hashmap of value→inorder-index would make it O(n)).',
    highlightLine: 20,
    state: buildTreeState(null),
    variables: [],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Recursive Preorder/Inorder Split',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(n²) (O(n) with an index map)',
  spaceComplexity: 'O(n)',
};

export const constructTreePreorderInorderMeta: AlgorithmMeta = {
  id: 'construct-tree-preorder-inorder',
  lcNumber: 105,
  title: 'Construct Binary Tree from Preorder and Inorder Traversal',
  difficulty: 'Medium',
  category: 'trees',
  tags: ['Tree', 'Array', 'Divide and Conquer', 'Recursion'],
  timeComplexity: 'O(n²)',
  spaceComplexity: 'O(n)',
  description:
    'Given preorder and inorder traversals of a binary tree with unique values, construct and return the tree.',
  examples: [
    { input: 'preorder = [3,9,20,15,7], inorder = [9,3,15,20,7]', output: '[3,9,20,null,null,15,7]' },
    { input: 'preorder = [-1], inorder = [-1]', output: '[-1]' },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ preorder.length ≤ 3000',
    'inorder.length == preorder.length',
    'preorder and inorder consist of unique values; each value of inorder also appears in preorder.',
  ],
  hint: 'preorder[0] is the root. Locate it in inorder: values before it form the left subtree, values after it form the right subtree — and their counts tell you exactly how to slice preorder. Recurse on each half.',
  solutions: [solution],
};
