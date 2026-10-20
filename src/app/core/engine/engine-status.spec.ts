import { EngineState, engineStatus } from './engine-status';

const run = (status: string, conclusion: string | null) => ({
  workflow_runs: [{ id: 7, status, conclusion, html_url: 'https://github.com/ada/cse-progress/actions/runs/7' }],
});

describe('engineStatus', () => {
  it.each<{ name: string; payload: unknown; state: EngineState }>([
    { name: 'queued is running', payload: run('queued', null), state: 'running' },
    { name: 'in_progress is running', payload: run('in_progress', null), state: 'running' },
    { name: 'completed + success is ok', payload: run('completed', 'success'), state: 'ok' },
    { name: 'completed + failure is failed', payload: run('completed', 'failure'), state: 'failed' },
    { name: 'completed + cancelled is failed', payload: run('completed', 'cancelled'), state: 'failed' },
    { name: 'completed + timed_out is failed', payload: run('completed', 'timed_out'), state: 'failed' },
    { name: 'an empty list is none', payload: { workflow_runs: [] }, state: 'none' },
  ])('$name', ({ payload, state }) => {
    expect(engineStatus(payload).state).toBe(state);
  });
});
