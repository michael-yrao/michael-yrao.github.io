import { GraphEdge, GraphEdgeState, GraphNode, GraphNodeState, GraphState } from '../models/algorithm.model';
import { definedFields } from './defined-fields';

export type GraphNodeInput = Omit<GraphNode, 'state'>;
export type GraphEdgeInput = Omit<GraphEdge, 'state'>;

export interface GraphStateOptions {
  /** State of each node; every node is `'default'` when omitted. */
  nodeState?: (node: GraphNodeInput, index: number) => GraphNodeState;
  /** State of each edge; every edge is `'default'` when omitted. */
  edgeState?: (edge: GraphEdgeInput, index: number) => GraphEdgeState;
  hashmap?: GraphState['hashmap'];
  hashmapLabel?: string;
  hashmap2?: GraphState['hashmap2'];
  hashmap2Label?: string;
  stackItems?: GraphState['stackItems'];
  stackLabel?: string;
  counters?: GraphState['counters'];
}

const DEFAULT_ELEMENT_STATE = 'default';

export function graphState(
  nodes: readonly GraphNodeInput[],
  edges: readonly GraphEdgeInput[],
  options: GraphStateOptions = {},
): GraphState {
  const {
    nodeState = () => DEFAULT_ELEMENT_STATE,
    edgeState = () => DEFAULT_ELEMENT_STATE,
    hashmap,
    hashmapLabel,
    hashmap2,
    hashmap2Label,
    stackItems,
    stackLabel,
    counters,
  } = options;
  return {
    type: 'graph',
    nodes: nodes.map((node, index) => ({ ...node, state: nodeState(node, index) })),
    edges: edges.map((edge, index) => ({ ...edge, state: edgeState(edge, index) })),
    ...definedFields({ hashmap, hashmapLabel, hashmap2, hashmap2Label, stackItems, stackLabel, counters }),
  };
}
