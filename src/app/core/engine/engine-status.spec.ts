import { EngineState, engineStatus, engineStep } from './engine-status';

const jobsWith = (steps: { name: string; status: string }[], status = 'in_progress') => ({ jobs: [{ status, steps }] });
const running = (name: string) => jobsWith([{ name: 'Set up job', status: 'completed' }, { name, status: 'in_progress' }]);

describe('engineStep', () => {
  it.each<{ name: string; payload: unknown; step: string | null }>([
    { name: 'a named step', payload: running('Build the week'), step: 'Build the week' },
    { name: 'a pinned action keeps its last segment', payload: running('Run actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1'), step: 'checkout' },
    { name: 'a local action keeps its last segment', payload: running('Run ./.github/actions/commit-push'), step: 'commit-push' },
    { name: 'all jobs completed', payload: jobsWith([{ name: 'x', status: 'completed' }], 'completed'), step: null },
    { name: 'a null payload', payload: null, step: null },
    { name: 'jobs that are not a list', payload: { jobs: 'x' }, step: null },
  ])('$name', ({ payload, step }) => {
    expect(engineStep(payload)).toBe(step);
  });
});

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
