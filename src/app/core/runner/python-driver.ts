/**
 * The Python half of the in-browser runner, executed once inside Pyodide. The worker calls
 * `define_solution(code)` (returns '' on success, else the formatted Python error) and then
 * `run_case(case_spec_json)` per case (returns one JSON outcome string, shaped like
 * `CaseOutcome`). The case spec is the entry's fields plus `args`, `ops`, `result` and `types`
 * (see `buildCaseSpec`). `run_free(code)` instead runs code once in a fresh namespace and returns
 * the JSON `{"stdout", "error"}`. Both namespaces start with LeetCode's pre-imported modules
 * and node classes. Kept as source text so the worker stays short; no backticks or
 * dollar-brace sequences may appear below.
 */
export const PYTHON_DRIVER = String.raw`
import builtins
import collections
import contextlib
import io
import json
import sys
import traceback

_solution = {}
_DEFAULT_RECURSION_LIMIT = sys.getrecursionlimit()

_PRELUDE_SOURCE = """
from typing import *
from collections import *
from heapq import *
from bisect import *
from itertools import *
from functools import *
from math import *
import collections, heapq, bisect, itertools, functools, math, string, re, random, operator
"""


def _prelude_names():
    # LeetCode's Python environment pre-imports these, so the learner never writes the imports.
    names = {}
    exec(_PRELUDE_SOURCE, names)
    # A star import must never shadow a builtin: math's pow would break pow(a, b, mod).
    return {name: value for name, value in names.items() if not name.startswith("_") and not hasattr(builtins, name)}


_PRELUDE = _prelude_names()


class CodecError(Exception):
    pass


# Stand-ins for LeetCode's node classes, used only when the learner's code defines none.
class _ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class _TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


class _Node:
    def __init__(self, val=0, next=None, random=None, neighbors=None):
        self.val = val
        self.next = next
        self.random = random
        self.neighbors = neighbors if neighbors is not None else []


def _fresh_namespace():
    # LeetCode predefines its imports and these node classes; the learner's own definition shadows the seed.
    return {**_PRELUDE, "__name__": "solution", "ListNode": _ListNode, "TreeNode": _TreeNode, "Node": _Node}


def _format_error(error):
    # Skip this frame so the message starts at the learner's code.
    return "".join(traceback.format_exception(type(error), error, error.__traceback__.tb_next)).strip()


def define_solution(code):
    # A previous run's sys.setrecursionlimit must not leak into this one (the worker is reused).
    sys.setrecursionlimit(_DEFAULT_RECURSION_LIMIT)
    namespace = _fresh_namespace()
    try:
        exec(compile(code, "solution.py", "exec"), namespace)
    except BaseException as error:
        return _format_error(error)
    _solution.clear()
    _solution.update(namespace)
    return ""


def run_free(code):
    # Runs the code once for its printed output; the case runner's _solution is left alone.
    sys.setrecursionlimit(_DEFAULT_RECURSION_LIMIT)
    out = io.StringIO()
    error_text = ""
    try:
        with contextlib.redirect_stdout(out):
            exec(compile(code, "solution.py", "exec"), _fresh_namespace())
    except BaseException as error:
        error_text = _format_error(error)
    return json.dumps({"stdout": out.getvalue(), "error": error_text})


def _method_name(cls, method):
    if callable(getattr(cls, method, None)):
        return method
    # The learner's files date attempts: subsetsWithDup_20261001.
    prefix = method + "_"
    for name, value in vars(cls).items():
        if name.startswith(prefix) and callable(value):
            return name
    raise AttributeError(cls.__name__ + " has no method " + method)


def _repr(result):
    try:
        return repr(result)
    except Exception:
        return "<unprintable " + type(result).__name__ + ">"


# Codecs: JSON to nodes (encode, before the call) and nodes to JSON (decode, after it).

def _node_class(name):
    return _solution[name]


def _expect(codec, is_ok, wanted, value):
    if not is_ok:
        raise CodecError(codec + ": expected " + wanted + ", got " + type(value).__name__)


def _require_attrs(codec, node, *names):
    _expect(codec, all(hasattr(node, name) for name in names), "a node or None", node)


def _link_list(values):
    cls = _node_class("ListNode")
    nodes = [cls(value) for value in values]
    for node, following in zip(nodes, nodes[1:]):
        node.next = following
    return nodes


def _encode_list_node(values):
    _expect("list-node", isinstance(values, list), "a JSON array", values)
    nodes = _link_list(values)
    return nodes[0] if nodes else None


def _encode_list_node_cycle(spec):
    _expect("list-node-cycle", isinstance(spec, list) and len(spec) == 2, "[values, pos]", spec)
    values, pos = spec
    nodes = _link_list(values)
    if nodes and pos >= 0:
        _expect("list-node-cycle", pos < len(nodes), "a pos inside the list", pos)
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None


def _encode_random_list(pairs):
    _expect("random-list", isinstance(pairs, list), "a JSON array", pairs)
    cls = _node_class("Node")
    nodes = [cls(pair[0]) for pair in pairs]
    for node, following in zip(nodes, nodes[1:]):
        node.next = following
    for node, pair in zip(nodes, pairs):
        node.random = None if pair[1] is None else nodes[pair[1]]
    return nodes[0] if nodes else None


def _tree_child(cls, value, queue):
    if value is None:
        return None
    child = cls(value)
    queue.append(child)
    return child


def _encode_tree_node(values):
    _expect("tree-node", isinstance(values, list), "a JSON array", values)
    if not values or values[0] is None:
        return None
    cls = _node_class("TreeNode")
    root = cls(values[0])
    queue = collections.deque([root])
    rest = iter(values[1:])
    while queue:
        node = queue.popleft()
        node.left = _tree_child(cls, next(rest, None), queue)
        node.right = _tree_child(cls, next(rest, None), queue)
    return root


def _encode_graph_node(adjacency):
    _expect("graph-node", isinstance(adjacency, list), "a JSON array", adjacency)
    if not adjacency:
        return None
    cls = _node_class("Node")
    nodes = [cls(number + 1) for number in range(len(adjacency))]
    for node, neighbours in zip(nodes, adjacency):
        node.neighbors = [nodes[value - 1] for value in neighbours]
    return nodes[0]


def _find_by_value(root, target):
    queue = collections.deque([root] if root is not None else [])
    while queue:
        node = queue.popleft()
        if node.val == target:
            return node
        queue.extend(child for child in (node.left, node.right) if child is not None)
    raise CodecError("tree-value: no node with value " + str(target) + " in the tree")


def _walk_next(codec, head):
    nodes = []
    seen = set()
    node = head
    while node is not None:
        _require_attrs(codec, node, "val", "next")
        if id(node) in seen:
            raise CodecError(codec + ": the returned list loops back on itself")
        seen.add(id(node))
        nodes.append(node)
        node = node.next
    return nodes


def _decode_list_node(head):
    return [node.val for node in _walk_next("list-node", head)]


def _random_index(node, index_of):
    _require_attrs("random-list", node, "random")
    if node.random is None:
        return None
    if id(node.random) not in index_of:
        raise CodecError("random-list: a random pointer leads outside the returned list")
    return index_of[id(node.random)]


def _decode_random_list(head):
    nodes = _walk_next("random-list", head)
    index_of = {id(node): index for index, node in enumerate(nodes)}
    return [[node.val, _random_index(node, index_of)] for node in nodes]


def _decode_tree_node(root):
    values = []
    queue = collections.deque([root] if root is not None else [])
    while queue:
        node = queue.popleft()
        if node is None:
            values.append(None)
            continue
        _require_attrs("tree-node", node, "val", "left", "right")
        values.append(node.val)
        queue.extend([node.left, node.right])
    while values and values[-1] is None:
        values.pop()
    return values


def _decode_tree_value(node):
    if node is None:
        return None
    _require_attrs("tree-value", node, "val")
    return node.val


def _reachable(root):
    seen = {id(root): root}
    queue = collections.deque([root])
    while queue:
        for neighbour in queue.popleft().neighbors:
            if id(neighbour) not in seen:
                seen[id(neighbour)] = neighbour
                queue.append(neighbour)
    return sorted(seen.values(), key=lambda node: node.val)


def _decode_graph_node(root):
    if root is None:
        return []
    _require_attrs("graph-node", root, "val", "neighbors")
    return [[neighbour.val for neighbour in node.neighbors] for node in _reachable(root)]


def _decode_unsupported(value):
    raise CodecError("list-node-cycle: this codec only builds arguments and cannot decode a result")


_POSITIVE_INFINITY = float("inf")


def _decode_number_inf(value):
    if isinstance(value, list):
        return [_decode_number_inf(item) for item in value]
    if isinstance(value, float) and value == _POSITIVE_INFINITY:
        return "Infinity"
    if isinstance(value, float) and value == -_POSITIVE_INFINITY:
        return "-Infinity"
    return value


_ENCODERS = {
    "list-node": _encode_list_node,
    "list-node-cycle": _encode_list_node_cycle,
    "random-list": _encode_random_list,
    "tree-node": _encode_tree_node,
    "graph-node": _encode_graph_node,
}

_DECODERS = {
    "list-node": _decode_list_node,
    "list-node-cycle": _decode_unsupported,
    "random-list": _decode_random_list,
    "tree-node": _decode_tree_node,
    "tree-value": _decode_tree_value,
    "graph-node": _decode_graph_node,
    "number-inf": _decode_number_inf,
}


def _codec_function(table, codec):
    function = table.get(codec)
    if function is None:
        raise CodecError("unknown codec " + str(codec))
    return function


def _decode(codec, value):
    return value if codec is None else _codec_function(_DECODERS, codec)(value)


def _arg_codecs(types, count):
    codecs = list((types or {}).get("args") or [])
    return codecs + [None] * (count - len(codecs))


def _encode_args(raw_args, codecs):
    built = {}
    for index, codec in enumerate(codecs):
        if codec == "tree-value":
            continue
        built[index] = raw_args[index] if codec is None else _codec_function(_ENCODERS, codec)(raw_args[index])
    # A tree-value names a node of the case's first tree-node argument, so it is resolved last.
    root = next((built[i] for i, codec in enumerate(codecs) if codec == "tree-node"), None)
    for index, codec in enumerate(codecs):
        if codec == "tree-value":
            built[index] = _find_by_value(root, raw_args[index])
    return [built[index] for index in range(len(raw_args))]


# Running a case: the three entry kinds, then the result kind picks what is compared.

def _class_named(name):
    cls = _solution.get(name)
    if cls is None:
        raise NameError("class " + name + " is not defined")
    return cls


def _bound_method(instance, name):
    return getattr(instance, _method_name(type(instance), name))


def _invoke(spec, args):
    instance = _class_named(spec["className"])()
    if spec.get("kind") == "round-trip":
        return _bound_method(instance, spec["decode"])(_bound_method(instance, spec["encode"])(*args))
    return _bound_method(instance, spec["method"])(*args)


def _run_ops(spec):
    names, arg_lists = spec["ops"], spec["args"]
    instance = _class_named(names[0])(*arg_lists[0])
    outputs = [None]
    for name, call_args in zip(names[1:], arg_lists[1:]):
        outputs.append(_bound_method(instance, name)(*call_args))
    return outputs


def _prefix_length(returned):
    is_count = isinstance(returned, int) and not isinstance(returned, bool) and returned >= 0
    if not is_count:
        raise CodecError("arg-prefix: expected the method to return a non-negative integer, got " + _repr(returned))
    return returned


def _select_result(result, types, args, returned):
    kind = (result or {}).get("kind", "return")
    if kind == "return":
        return _decode((types or {}).get("result"), returned)
    index = result["index"]
    value = _decode(_arg_codecs(types, len(args))[index], args[index])
    return value if kind == "arg" else value[: _prefix_length(returned)]


def _comparable(spec):
    if spec.get("kind") == "ops":
        return _run_ops(spec)
    types = spec.get("types")
    args = _encode_args(spec["args"], _arg_codecs(types, len(spec["args"])))
    returned = _invoke(spec, args)
    return _select_result(spec.get("result"), types, args, returned)


def _describe(error):
    if isinstance(error, CodecError):
        return str(error)
    return type(error).__name__ + ": " + str(error)


def _error(kind, error, out):
    return {"status": "error", "kind": kind, "message": _describe(error), "stdout": out.getvalue()}


def _to_json(value):
    try:
        return True, json.loads(json.dumps(value, allow_nan=False))
    except Exception:
        return False, None


def run_case(case_spec_json):
    out = io.StringIO()
    try:
        spec = json.loads(case_spec_json)
        with contextlib.redirect_stdout(out):
            comparable = _comparable(spec)
    except RecursionError as error:
        return json.dumps(_error("recursion", error, out))
    except BaseException as error:
        return json.dumps(_error("exception", error, out))
    has_json, got_json = _to_json(comparable)
    return json.dumps(
        {
            "status": "ok",
            "hasJson": has_json,
            "gotJson": got_json,
            "gotRepr": _repr(comparable),
            "stdout": out.getvalue(),
        }
    )
`;
