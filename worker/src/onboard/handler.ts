import {
  API_BASE,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_OK,
  apiHeaders,
  bearerToken,
  failure,
  fetchUser,
  isRepoOwnedBy,
  jsonResponse,
  readJson,
  type FetchImpl,
  type HeaderMap,
} from '../github/write-file';
import { gateOrigin, preflight, type PatternSenseEnv } from '../pattern-sense/handler';
import { isCoachRepo, isExpectedName, LEARNER_REPO, MARKER_PATHS } from './validate';

export const ROUTE_PREFIX = '/onboard/';
const DSA_PATH = `${ROUTE_PREFIX}dsa`;

export interface OnboardEnv extends PatternSenseEnv {
  readonly TEMPLATE_OWNER: string;
  readonly TEMPLATE_REPO: string;
}

export const READY_ATTEMPTS = 4;
export const READY_DELAY_MS = 1500;

export type Sleep = (ms: number) => Promise<void>;
const defaultSleep: Sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const HTTP_CREATED = 201;
const HTTP_UNAUTHORIZED = 401;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_GATEWAY = 502;
const RATE_LIMIT_EXHAUSTED = '0';
const MANIFEST_PATH = 'dashboard/manifest.json';
const REPO_DESCRIPTION = 'My cse-coach practice log, created from progressiveoverflow.com';

interface Ctx {
  readonly fetchImpl: FetchImpl;
  readonly token: string;
  readonly login: string;
  readonly templateFullName: string;
  readonly cors: HeaderMap;
  readonly sleep: Sleep;
}

type RepoLookup =
  | { kind: 'found'; repo: unknown }
  | { kind: 'missing' }
  | { kind: 'failed'; response: Response };

function repoUrl(ctx: Ctx): string {
  return `${API_BASE}/repos/${ctx.login}/${LEARNER_REPO}`;
}

function githubError(response: Response, cors: HeaderMap): Response {
  const isRateLimited =
    response.status === HTTP_TOO_MANY_REQUESTS ||
    (response.status === HTTP_FORBIDDEN &&
      response.headers.get('x-ratelimit-remaining') === RATE_LIMIT_EXHAUSTED);
  if (isRateLimited) return failure(HTTP_TOO_MANY_REQUESTS, 'rate-limited', cors);
  if (response.status === HTTP_FORBIDDEN) return failure(HTTP_FORBIDDEN, 'integration-refused', cors);
  return failure(HTTP_BAD_GATEWAY, 'github-error', cors);
}

async function findRepo(ctx: Ctx): Promise<RepoLookup> {
  const response = await ctx.fetchImpl(repoUrl(ctx), { headers: apiHeaders(ctx.token) });
  if (response.status === HTTP_OK) return { kind: 'found', repo: await readJson(response) };
  if (response.status === HTTP_NOT_FOUND) return { kind: 'missing' };
  return { kind: 'failed', response: githubError(response, ctx.cors) };
}

async function fileExists(ctx: Ctx, path: string): Promise<boolean> {
  const response = await ctx.fetchImpl(`${repoUrl(ctx)}/contents/${path}`, {
    headers: apiHeaders(ctx.token),
  });
  return response.status === HTTP_OK;
}

async function hasMarker(ctx: Ctx): Promise<boolean> {
  for (const path of MARKER_PATHS) {
    if (await fileExists(ctx, path)) return true;
  }
  return false;
}

async function waitReady(ctx: Ctx): Promise<boolean> {
  for (let attempt = 1; attempt <= READY_ATTEMPTS; attempt += 1) {
    if (await fileExists(ctx, MANIFEST_PATH)) return true;
    if (attempt < READY_ATTEMPTS) await ctx.sleep(READY_DELAY_MS);
  }
  return false;
}

function success(ctx: Ctx, status: 'created' | 'adopted', ready: boolean): Response {
  return jsonResponse(
    HTTP_OK,
    { status, owner: ctx.login, repo: LEARNER_REPO, ready },
    ctx.cors,
  );
}

async function adoptOrRefuse(ctx: Ctx, repo: unknown): Promise<Response> {
  const nameTaken = failure(HTTP_CONFLICT, 'name-taken', ctx.cors);
  if (!isRepoOwnedBy(repo, ctx.login, ctx.login) || !isExpectedName(repo, ctx.login)) {
    return nameTaken;
  }
  if (isCoachRepo(repo, ctx.templateFullName)) {
    return success(ctx, 'adopted', await waitReady(ctx));
  }
  return (await hasMarker(ctx)) ? success(ctx, 'adopted', true) : nameTaken;
}

async function adoptAfterRace(ctx: Ctx): Promise<Response> {
  const lookup = await findRepo(ctx);
  if (lookup.kind === 'failed') return lookup.response;
  if (lookup.kind === 'missing') return failure(HTTP_CONFLICT, 'name-taken', ctx.cors);
  return adoptOrRefuse(ctx, lookup.repo);
}

async function generate(ctx: Ctx): Promise<Response> {
  const [templateOwner, templateRepo] = ctx.templateFullName.split('/');
  const response = await ctx.fetchImpl(
    `${API_BASE}/repos/${templateOwner}/${templateRepo}/generate`,
    {
      method: 'POST',
      headers: { ...apiHeaders(ctx.token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: ctx.login,
        name: LEARNER_REPO,
        private: false,
        description: REPO_DESCRIPTION,
      }),
    },
  );
  if (response.status === HTTP_CREATED) return success(ctx, 'created', await waitReady(ctx));
  if (response.status === HTTP_UNPROCESSABLE) return adoptAfterRace(ctx);
  if (response.status === HTTP_NOT_FOUND) {
    return failure(HTTP_BAD_GATEWAY, 'template-unavailable', ctx.cors);
  }
  return githubError(response, ctx.cors);
}

async function handleDsa(
  request: Request,
  env: OnboardEnv,
  fetchImpl: FetchImpl,
  sleep: Sleep,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(HTTP_UNAUTHORIZED, 'bad-token', cors);

  const user = await fetchUser(fetchImpl, token);
  if (user.kind === 'bad-token') return failure(HTTP_UNAUTHORIZED, 'bad-token', cors);
  if (user.kind === 'error') return failure(HTTP_BAD_GATEWAY, 'github-error', cors);

  const templateFullName = `${env.TEMPLATE_OWNER}/${env.TEMPLATE_REPO}`;
  const ctx: Ctx = { fetchImpl, token, login: user.login, templateFullName, cors, sleep };
  const lookup = await findRepo(ctx);
  if (lookup.kind === 'failed') return lookup.response;
  if (lookup.kind === 'found') return adoptOrRefuse(ctx, lookup.repo);
  return generate(ctx);
}

export async function handle(
  request: Request,
  env: OnboardEnv,
  fetchImpl: FetchImpl,
  sleep: Sleep = defaultSleep,
): Promise<Response> {
  const cors = gateOrigin(request, env);
  if (cors instanceof Response) return cors;
  if (request.method === 'OPTIONS') return preflight(cors);
  if (request.method !== 'POST') return failure(HTTP_METHOD_NOT_ALLOWED, 'method-not-allowed', cors);

  const { pathname } = new URL(request.url);
  if (pathname === DSA_PATH) return handleDsa(request, env, fetchImpl, sleep, cors);
  return failure(HTTP_NOT_FOUND, 'not-found', cors);
}
