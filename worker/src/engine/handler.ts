// POST /engine/weekly-build: reads the repo's weekly_build switch first, then enables and
// dispatches the weekly-build workflow in a repo the caller owns.
import {
  API_BASE,
  apiHeaders,
  bearerToken,
  checkOwner,
  failure,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  isRecord,
  jsonResponse,
  readFileWithSha,
  type FetchImpl,
  type HeaderMap,
  type RepoTarget,
} from '../github/write-file';
import type { OnboardEnv } from '../onboard/handler';
import { gateOrigin, preflight } from '../pattern-sense/handler';
import { readWeeklyBuildSwitch } from './config-switch';
import { handleEngineUpdate, UPDATE_PATH } from './update-route';
import { OWNER_PATTERN, REPO_PATTERN } from '../pattern-sense/validate';

export const ROUTE_PREFIX = '/engine/';
const WEEKLY_BUILD_PATH = `${ROUTE_PREFIX}weekly-build`;
const WORKFLOW_FILE = 'weekly-build.yml';
const BRANCH = 'main';
const HTTP_NO_CONTENT = 204;
const HTTP_ACCEPTED = 202;
const HTTP_CONFLICT = 409;
const CONFIG_PATH = 'cse.config.yml';
const ERROR_NO_CONFIG = 'no-config';
const ERROR_BUILD_OFF = 'build-off';

type Step = { readonly kind: 'ok' } | { readonly kind: 'refused'; readonly response: Response };

function parseTarget(text: string): RepoTarget | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(body)) return null;
  const { owner, repo } = body;
  if (typeof owner !== 'string' || !OWNER_PATTERN.test(owner)) return null;
  if (typeof repo !== 'string' || !REPO_PATTERN.test(repo)) return null;
  return { owner, repo, branch: BRANCH };
}

function workflowUrl(target: RepoTarget, action: string): string {
  return `${API_BASE}/repos/${target.owner}/${target.repo}/actions/workflows/${WORKFLOW_FILE}/${action}`;
}

async function callWorkflow(
  fetchImpl: FetchImpl,
  token: string,
  url: string,
  method: 'PUT' | 'POST',
  body: string | undefined,
  cors: HeaderMap,
): Promise<Step> {
  const response = await fetchImpl(url, {
    method,
    headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body }),
  });
  if (response.status === HTTP_NO_CONTENT) return { kind: 'ok' };
  if (response.status === HTTP_FORBIDDEN)
    return { kind: 'refused', response: failure(403, 'integration-refused', cors) };
  if (response.status === HTTP_NOT_FOUND)
    return { kind: 'refused', response: failure(404, 'no-workflow', cors) };
  return { kind: 'refused', response: failure(502, 'github-error', cors) };
}

async function checkBuildSwitch(
  fetchImpl: FetchImpl,
  token: string,
  target: RepoTarget,
  cors: HeaderMap,
): Promise<Response | null> {
  const config = await readFileWithSha(fetchImpl, token, { ...target, path: CONFIG_PATH }, cors);
  if (config.kind === 'refused') return config.response;
  if (config.kind === 'missing') return failure(HTTP_CONFLICT, ERROR_NO_CONFIG, cors);
  if (readWeeklyBuildSwitch(config.text) !== true) return failure(HTTP_CONFLICT, ERROR_BUILD_OFF, cors);
  return null;
}

async function handleWeeklyBuild(
  request: Request,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(401, 'bad-token', cors);

  const target = parseTarget(await request.text());
  if (target === null) return failure(400, 'invalid-request', cors);

  const refusal = await checkOwner(fetchImpl, token, target, cors);
  if (refusal !== null) return refusal;

  const switchRefusal = await checkBuildSwitch(fetchImpl, token, target, cors);
  if (switchRefusal !== null) return switchRefusal;

  const enabled = await callWorkflow(fetchImpl, token, workflowUrl(target, 'enable'), 'PUT', undefined, cors);
  if (enabled.kind === 'refused') return enabled.response;

  const dispatchBody = JSON.stringify({ ref: target.branch });
  const dispatched = await callWorkflow(
    fetchImpl,
    token,
    workflowUrl(target, 'dispatches'),
    'POST',
    dispatchBody,
    cors,
  );
  if (dispatched.kind === 'refused') return dispatched.response;
  return jsonResponse(HTTP_ACCEPTED, { status: 'dispatched' }, cors);
}

export async function handle(
  request: Request,
  env: OnboardEnv,
  fetchImpl: FetchImpl,
): Promise<Response> {
  const cors = gateOrigin(request, env);
  if (cors instanceof Response) return cors;

  if (request.method === 'OPTIONS') return preflight(cors);
  if (request.method !== 'POST') return failure(405, 'method-not-allowed', cors);

  const { pathname } = new URL(request.url);
  if (pathname === WEEKLY_BUILD_PATH) return handleWeeklyBuild(request, fetchImpl, cors);
  if (pathname === UPDATE_PATH) return handleEngineUpdate(request, env, fetchImpl, cors);
  return failure(404, 'not-found', cors);
}
