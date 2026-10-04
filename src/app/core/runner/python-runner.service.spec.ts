import { TestBed } from '@angular/core/testing';

import { PracticeProblem } from '../models/practice.model';
import { PYTHON_WORKER_FACTORY, PythonRunnerService, RUN_TIME_LIMIT_MS } from './python-runner.service';
import { CaseOutcome, FreeRunState, RunState, WorkerMessage } from './runner.model';

type Listener = (event: unknown) => void;

class FakeWorker {
  isTerminated = false;
  readonly posted: { id: number }[] = [];
  private readonly listeners = new Map<string, Set<Listener>>();

  postMessage(request: { id: number }): void {
    this.posted.push(request);
  }
  terminate(): void {
    this.isTerminated = true;
  }
  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? new Set()).add(listener));
  }
  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }
  emit(message: WorkerMessage): void {
    this.listeners.get('message')?.forEach((listener) => listener({ data: message }));
  }
}

function okOutcome(gotJson: unknown): CaseOutcome {
  return { status: 'ok', hasJson: true, gotJson, gotRepr: JSON.stringify(gotJson), stdout: '' };
}

const PROBLEM: PracticeProblem = {
  number: 1,
  title: 'Two cases',
  url: null,
  statement: '',
  stub: '',
  entry: { className: 'Solution', method: 'solve' },
  compare: 'exact',
  cases: [
    { args: [1], expected: 1, example: true },
    { args: [2], expected: 2, example: false },
    { args: [3], expected: 3, example: false },
  ],
};

describe('PythonRunnerService', () => {
  let workers: FakeWorker[];
  let service: PythonRunnerService;
  let states: RunState[];

  beforeEach(() => {
    vi.useFakeTimers();
    workers = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PYTHON_WORKER_FACTORY,
          useValue: () => {
            const worker = new FakeWorker();
            workers.push(worker);
            return worker as unknown as Worker;
          },
        },
      ],
    });
    service = TestBed.inject(PythonRunnerService);
    states = [];
  });

  afterEach(() => vi.useRealTimers());

  function start(): FakeWorker {
    service.run('code', PROBLEM).subscribe((state) => states.push(state));
    return workers[workers.length - 1];
  }

  it('marks each case pass or fail from the posted outcomes', () => {
    const worker = start();
    const id = worker.posted[0].id;

    worker.emit({ id, type: 'ready' });
    worker.emit({ id, type: 'case', index: 0, outcome: okOutcome(1) });
    worker.emit({ id, type: 'case', index: 1, outcome: okOutcome(99) });
    worker.emit({ id, type: 'case', index: 2, outcome: { status: 'error', kind: 'recursion', message: 'x', stdout: '' } });
    worker.emit({ id, type: 'done' });

    const last = states[states.length - 1];
    expect(last.status).toBe('done');
    expect(last.results.map((r) => r.verdict)).toEqual(['pass', 'fail', 'recursion']);
  });

  it('kills the worker at the time limit, marks the rest time-limit, and builds a new worker next run', () => {
    const worker = start();
    const id = worker.posted[0].id;

    worker.emit({ id, type: 'ready' });
    worker.emit({ id, type: 'case', index: 0, outcome: okOutcome(1) });
    vi.advanceTimersByTime(RUN_TIME_LIMIT_MS);

    const last = states[states.length - 1];
    expect(worker.isTerminated).toBe(true);
    expect(last.status).toBe('done');
    expect(last.results.map((r) => r.verdict)).toEqual(['pass', 'time-limit', 'time-limit']);

    expect(start()).not.toBe(worker);
    expect(workers.length).toBe(2);
  });

  describe('runFree', () => {
    const FREE_CASES: { name: string; message: ((id: number) => WorkerMessage) | null; expected: Partial<FreeRunState> }[] = [
      {
        name: 'a free-result lands in the final state',
        message: (id) => ({ id, type: 'free-result', stdout: 'hi\n', error: 'boom' }),
        expected: { status: 'done', stdout: 'hi\n', error: 'boom', isTimedOut: false },
      },
      {
        name: 'no result within the time limit marks it timed out and terminates the worker',
        message: null,
        expected: { status: 'done', isTimedOut: true },
      },
    ];

    it.each(FREE_CASES)('$name', ({ message, expected }) => {
      const freeStates: FreeRunState[] = [];
      service.runFree('print(1)').subscribe((state) => freeStates.push(state));
      const worker = workers[workers.length - 1];
      const id = worker.posted[0].id;

      worker.emit({ id, type: 'ready' });
      if (message) {
        worker.emit(message(id));
        worker.emit({ id, type: 'done' });
      }
      vi.advanceTimersByTime(RUN_TIME_LIMIT_MS);

      expect(freeStates[freeStates.length - 1]).toMatchObject(expected);
      expect(worker.isTerminated).toBe(message === null);
    });
  });
});
