/**
 * The Python half of the in-browser runner, executed once inside Pyodide. The worker calls
 * `define_solution(code)` (returns '' on success, else the formatted Python error) and then
 * `run_case(class_name, method, args_json)` per case (returns one JSON outcome string, shaped
 * like `CaseOutcome`). Kept as source text so the worker stays short; no backticks or dollar-brace
 * sequences may appear below.
 */
export const PYTHON_DRIVER = String.raw`
import contextlib
import io
import json
import sys
import traceback

_solution = {}
_DEFAULT_RECURSION_LIMIT = sys.getrecursionlimit()


def define_solution(code):
    # A previous run's sys.setrecursionlimit must not leak into this one (the worker is reused).
    sys.setrecursionlimit(_DEFAULT_RECURSION_LIMIT)
    namespace = {"__name__": "solution"}
    try:
        exec(compile(code, "solution.py", "exec"), namespace)
    except BaseException as error:
        # Skip this frame so the message starts at the learner's code.
        return "".join(traceback.format_exception(type(error), error, error.__traceback__.tb_next)).strip()
    _solution.clear()
    _solution.update(namespace)
    return ""


def _method_name(cls, method):
    if callable(getattr(cls, method, None)):
        return method
    # The learner's files date attempts: subsetsWithDup_20261001.
    prefix = method + "_"
    for name, value in vars(cls).items():
        if name.startswith(prefix) and callable(value):
            return name
    raise AttributeError(cls.__name__ + " has no method " + method)


def _encode(result):
    try:
        return True, json.loads(json.dumps(result, allow_nan=False))
    except Exception:
        return False, None


def _repr(result):
    try:
        return repr(result)
    except Exception:
        return "<unprintable " + type(result).__name__ + ">"


def _error(kind, error, out):
    message = type(error).__name__ + ": " + str(error)
    return {"status": "error", "kind": kind, "message": message, "stdout": out.getvalue()}


def _call(class_name, method, args):
    cls = _solution.get(class_name)
    if cls is None:
        raise NameError("class " + class_name + " is not defined")
    instance = cls()
    return getattr(instance, _method_name(cls, method))(*args)


def run_case(class_name, method, args_json):
    out = io.StringIO()
    try:
        args = json.loads(args_json)
        with contextlib.redirect_stdout(out):
            result = _call(class_name, method, args)
    except RecursionError as error:
        return json.dumps(_error("recursion", error, out))
    except BaseException as error:
        return json.dumps(_error("exception", error, out))
    has_json, got_json = _encode(result)
    return json.dumps(
        {
            "status": "ok",
            "hasJson": has_json,
            "gotJson": got_json,
            "gotRepr": _repr(result),
            "stdout": out.getvalue(),
        }
    )
`;
