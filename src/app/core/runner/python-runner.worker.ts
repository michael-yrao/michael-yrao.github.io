/// <reference lib="webworker" />
import { PYTHON_DRIVER } from './python-driver';
import { CaseOutcome, RunRequest, WorkerMessage } from './runner.model';

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
  readonly runCase: (className: string, method: string, argsJson: string) => string;
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

async function handleRun(request: RunRequest): Promise<void> {
  const { id, code, entry, cases } = request;

  let driver: DriverApi;
  try {
    driver = await loadDriver();
  } catch (error) {
    post({ id, type: 'run-error', message: errorText(error) });
    post({ id, type: 'done' });
    return;
  }

  post({ id, type: 'ready' });

  const definitionError = driver.defineSolution(code);
  if (definitionError !== '') {
    post({ id, type: 'run-error', message: definitionError });
    post({ id, type: 'done' });
    return;
  }

  cases.forEach((testCase, index) => {
    const argsJson = JSON.stringify(testCase.args);
    const outcome = JSON.parse(driver.runCase(entry.className, entry.method, argsJson)) as CaseOutcome;
    post({ id, type: 'case', index, outcome });
  });
  post({ id, type: 'done' });
}

addEventListener('message', (event: MessageEvent<RunRequest>) => {
  handleRun(event.data).catch((error: unknown) => {
    // Anything not handled above is a broken worker: raise it so the service's `error` path
    // replaces this worker rather than reusing a possibly corrupted interpreter.
    setTimeout(() => {
      throw error;
    });
  });
});
