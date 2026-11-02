export type EngineState = 'running' | 'ok' | 'failed' | 'none';

export interface EngineStatus {
  readonly state: EngineState;
  readonly runId: number | null;
  readonly htmlUrl: string | null;
}

export const NO_ENGINE_RUN: EngineStatus = { state: 'none', runId: null, htmlUrl: null };

const RUNNING_STATUSES: ReadonlySet<string> = new Set([
  'queued',
  'in_progress',
  'waiting',
  'requested',
  'pending',
]);
const FAILED_CONCLUSIONS: ReadonlySet<string> = new Set(['failure', 'cancelled', 'timed_out']);

function stateOf(status: unknown, conclusion: unknown): EngineState {
  if (typeof status !== 'string') return 'none';
  if (RUNNING_STATUSES.has(status)) return 'running';
  if (status !== 'completed' || typeof conclusion !== 'string') return 'none';
  if (conclusion === 'success') return 'ok';
  return FAILED_CONCLUSIONS.has(conclusion) ? 'failed' : 'none';
}

const IN_PROGRESS = 'in_progress';
const RUN_PREFIX = /^Run\s+/;
const AT_SUFFIX = /@.*$/;

function isInProgress(item: unknown): item is Record<string, unknown> {
  return typeof item === 'object' && item !== null && (item as { status?: unknown }).status === IN_PROGRESS;
}

function cleanStepName(name: string): string {
  const trimmed = name.trim().replace(RUN_PREFIX, '').replace(AT_SUFFIX, '');
  return trimmed.split('/').pop()?.trim() ?? '';
}

/** Names the in-progress step from a `GET .../actions/runs/{id}/jobs` body; null when there is none; never throws. */
export function engineStep(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const jobs = (payload as { jobs?: unknown }).jobs;
  if (!Array.isArray(jobs)) return null;
  const job = jobs.find(isInProgress);
  if (job === undefined) return null;
  const steps = job['steps'];
  if (!Array.isArray(steps)) return null;
  const step = steps.find(isInProgress);
  if (step === undefined || typeof step['name'] !== 'string') return null;
  const name = cleanStepName(step['name']);
  return name === '' ? null : name;
}

/** Reads the newest run from a `GET /repos/{o}/{r}/actions/workflows/{file}/runs?per_page=1` body; never throws. */
export function engineStatus(payload: unknown): EngineStatus {
  if (typeof payload !== 'object' || payload === null) return NO_ENGINE_RUN;
  const runs = (payload as { workflow_runs?: unknown }).workflow_runs;
  if (!Array.isArray(runs) || runs.length === 0) return NO_ENGINE_RUN;
  const run = runs[0] as Record<string, unknown> | null;
  if (typeof run !== 'object' || run === null) return NO_ENGINE_RUN;

  const state = stateOf(run['status'], run['conclusion']);
  if (state === 'none' || typeof run['id'] !== 'number') return NO_ENGINE_RUN;
  const htmlUrl = typeof run['html_url'] === 'string' ? run['html_url'] : null;
  return { state, runId: run['id'], htmlUrl };
}
