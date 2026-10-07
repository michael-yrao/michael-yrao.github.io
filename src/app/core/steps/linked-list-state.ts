import { LinkedListNode, LinkedListState } from '../models/algorithm.model';

export type LinkedListNodeState = LinkedListNode['state'];
export type LinkedListValue = LinkedListNode['value'];

export interface LinkedListStateOptions {
  /** State of the node at `index`; every node is `'default'` when omitted. */
  nodeState?: (index: number, value: LinkedListValue) => LinkedListNodeState;
  pointers?: LinkedListState['pointers'];
  /** Node ids are `${idPrefix}${index}`; `'n'` when omitted. */
  idPrefix?: string;
}

const DEFAULT_NODE_STATE: LinkedListNodeState = 'default';
const DEFAULT_ID_PREFIX = 'n';

/** A singly linked list over `values`, each node pointing at the next by id. */
export function linkedListState(
  values: readonly LinkedListValue[],
  options: LinkedListStateOptions = {},
): LinkedListState {
  const { nodeState = () => DEFAULT_NODE_STATE, pointers = [], idPrefix = DEFAULT_ID_PREFIX } = options;
  const lastIndex = values.length - 1;
  return {
    type: 'linked-list',
    nodes: values.map((value, index) => ({
      id: `${idPrefix}${index}`,
      value,
      nextId: index < lastIndex ? `${idPrefix}${index + 1}` : null,
      state: nodeState(index, value),
    })),
    pointers,
  };
}
