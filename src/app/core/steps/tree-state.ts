import { TreeNode, TreeNodeState, TreeState } from '../models/algorithm.model';
import { definedFields } from './defined-fields';

export type TreeNodeInput = Omit<TreeNode, 'state'>;

export interface TreeStateOptions {
  /** State of each node; every node is `'default'` when omitted. */
  nodeState?: (node: TreeNodeInput, index: number) => TreeNodeState;
  pointers?: TreeState['pointers'];
  counters?: TreeState['counters'];
}

const DEFAULT_NODE_STATE: TreeNodeState = 'default';

export function treeState(nodes: readonly TreeNodeInput[], options: TreeStateOptions = {}): TreeState {
  const { nodeState = () => DEFAULT_NODE_STATE, pointers, counters } = options;
  return {
    type: 'tree',
    nodes: nodes.map((node, index) => ({ ...node, state: nodeState(node, index) })),
    ...definedFields({ pointers, counters }),
  };
}
