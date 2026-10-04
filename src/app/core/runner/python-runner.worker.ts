/// <reference lib="webworker" />
import { PYTHON_DRIVER } from './python-driver';
import { CaseOutcome, FreeRunRequest, RunRequest, WorkerMessage, buildCaseSpec } from './runner.model';

const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';

/** The slice of Pyodide this worker uses. Pyodide is loaded from the CDN at run time and never
 *  enters an Angular bundle, so it is typed locally rather than imported. */
interface PyodideApi {
  runPython(code: string): unknown;
  globals: { get(name: string): (...args: unknown[]) => unknown };
}
interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<PyodideApi>;
}

interface DriverApi {
  readonly defineSolution: (code: string) => string;
  readonly runCase: (caseSpecJson: string) => string;
  readonly runFree: (code: string) => string;
}

let driverPromise: Promise<DriverApi> | null = null;

async function createDriver(): Promise<DriverApi> {
  // Through a variable so esbuild leaves the CDN import alone.
  const moduleUrl = `${PYODIDE_INDEX_URL}pyodide.mjs`;
  const pyodideModule = (await import(/* @vite-ignore */ moduleUrl)) as PyodideModule;
  const pyodide = await pyodideModule.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  pyodide.runPython(PYTHON_DRIVER);
  return {
    defineSolution: pyodide.globals.get('define_solution') as DriverApi['defineSolution'],
    runCase: pyodide.globals.get('run_case') as DriverApi['runCase'],
    runFree: pyodide.globals.get('run_free') as DriverApi['runFree'],
  };
}

/** Loads Pyodide once per worker; a failed load is forgotten so the next run can retry. */
function loadDriver(): Promise<DriverApi> {
  if (driverPromise === null) {
    driverPromise = createDriver().catch((error: unknown) => {
      driverPromise = null;
      throw error;
    });
  }
  return driverPromise;
}

function post(message: WorkerMessage): void {
  postMessage(message);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The driver, or null after posting the load error and 'done'. */
async function driverOrReportFailure(id: number): Promise<DriverApi | null> {
  try {
    return await loadDriver();
  } catch (error) {
    post({ id, type: 'run-error', message: errorText(error) });
    post({ id, type: 'done' });
    return null;
  }
}

async function handleFreeRun(request: FreeRunRequest): Promise<void> {
  const { id, code } = request;
  const driver = await driverOrReportFailure(id);
  if (driver === null) return;

  post({ id, type: 'ready' });
  const { stdout, error } = JSON.parse(driver.runFree(code)) as { stdout: string; error: string };
  post({ id, type: 'free-result', stdout, error: error === '' ? null : error });
  post({ id, type: 'done' });
}

async function handleRun(request: RunRequest): Promise<void> {
  const { id, code, cases } = request;
  const driver = await driverOrReportFailure(id);
  if (driver === null) return;

  post({ id, type: 'ready' });

  const definitionError = driver.defineSolution(code);
  if (definitionError !== '') {
    post({ id, type: 'run-error', message: definitionError });
    post({ id, type: 'done' });
    return;
  }

  cases.forEach((testCase, index) => {
    const outcome = JSON.parse(driver.runCase(buildCaseSpec(request, testCase))) as CaseOutcome;
    post({ id, type: 'case', index, outcome });
  });
  post({ id, type: 'done' });
}

function isFreeRun(request: RunRequest | FreeRunRequest): request is FreeRunRequest {
  return 'kind' in request && request.kind === 'free';
}

addEventListener('message', (event: MessageEvent<RunRequest | FreeRunRequest>) => {
  const request = event.data;
  (isFreeRun(request) ? handleFreeRun(request) : handleRun(request)).catch((error: unknown) => {
    // Anything not handled above is a broken worker: raise it so the service's `error` path
    // replaces this worker rather than reusing a possibly corrupted interpreter.
    setTimeout(() => {
      throw error;
    });
  });
});
