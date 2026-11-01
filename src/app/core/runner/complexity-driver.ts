/**
 * The Python half of the complexity analysis, executed inside Pyodide on the first analyze
 * request. `setup_analyzer(json)` writes the analyzer's modules to a directory on `sys.path`,
 * imports `complexity_infer` and configures its label pool; `analyze_code(json)` returns the
 * JSON `{"time", "space"}` (a label or null per axis), and null on both for any exception.
 * The JSON payloads are built by the worker; no code is spliced from data. No backticks and no
 * dollar-brace sequences may appear below.
 */
export const COMPLEXITY_DRIVER = `
import json, os, sys

_ANALYZER_DIR = '/tmp/complexity_analyzer'

def setup_analyzer(payload_json):
    payload = json.loads(payload_json)
    os.makedirs(_ANALYZER_DIR, exist_ok=True)
    for module in payload['modules']:
        with open(os.path.join(_ANALYZER_DIR, module['name'] + '.py'), 'w', encoding='utf-8') as handle:
            handle.write(module['source'])
    if _ANALYZER_DIR not in sys.path:
        sys.path.insert(0, _ANALYZER_DIR)
    import complexity_infer
    complexity_infer.configure_pool(payload['pool'])

def analyze_code(payload_json):
    try:
        import complexity_infer
        payload = json.loads(payload_json)
        bind = payload['bind'] or complexity_infer.default_bind(payload['signature'], payload['variables'])
        inferred = complexity_infer.infer(payload['source'], payload['entry'], bind)
        return json.dumps({'time': inferred.get('time'), 'space': inferred.get('space')})
    except Exception:
        return json.dumps({'time': None, 'space': None})
`;
