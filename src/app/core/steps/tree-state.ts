import { TreeNode, TreeNodeState, TreeState } from '../models/algorithm.model';

export type TreeNodeInput = Omit<TreeNode, 'state'>;

export interface TreeStateOptions {
  /** State of each node; every node is `'default'` when omitted. */
  nodeState?: (node: TreeNodeInput, index: number) => TreeNodeState;
}

const DEFAULT_NODE_STATE: TreeNodeState = 'default';

export function treeState(nodes: readonly TreeNodeInput[], options: TreeStateOptions = {}): TreeState {
  const { nodeState = () => DEFAULT_NODE_STATE } = options;
  return {
    type: 'tree',
    nodes: nodes.map((node, index) => ({ ...node, state: nodeState(node, index) })),
  };
}
