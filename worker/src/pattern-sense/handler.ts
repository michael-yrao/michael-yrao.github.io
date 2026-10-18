import {
  expectedPath,
  parseResults,
  parseSaveRequest,
  type Results,
  type SaveRequest,
} from './validate';

export const ROUTE_PREFIX = '/pattern-sense/';

export interface PatternSenseEnv {
  readonly GITHUB_CLIENT_ID: string;
  readonly GITHUB_CLIENT_SECRET: string;
  readonly ALLOWED_ORIGINS: string;
}

export type FetchImpl = typeof fetch;
export type HeaderMap = Record<string, string>;

const API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const USER_AGENT = 'pattern-sense-github-auth';
const CORS_MAX_AGE_SECONDS = '86400';
export const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const BEARER_PREFIX = 'Bearer ';

interface GithubUser {
  readonly login: string;
}

function allowedOrigins(env: PatternSenseEnv): readonly string[] {
  return env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
}

export function jsonResponse(status: number, body: unknown, cors: HeaderMap): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export function failure(status: number, error: string, cors: HeaderMap): Response {
  return jsonResponse(status, { error }, cors);
}

function corsHeaders(origin: string): HeaderMap {
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
}

/** The CORS headers for an allowed origin, or the 403 refusing the request. */
export function gateOrigin(request: Request, env: PatternSenseEnv): HeaderMap | Response {
  const origin = request.headers.get('Origin');
  if (origin === null || !allowedOrigins(env).includes(origin)) {
    return failure(403, 'origin-not-allowed', {});
  }
  return corsHeaders(origin);
}

export function preflight(cors: HeaderMap): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...cors,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': CORS_MAX_AGE_SECONDS,
    },
  });
}

function apiHeaders(token: string): HeaderMap {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': USER_AGENT,
  };
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization') ?? '';
  if (!header.startsWith(BEARER_PREFIX)) return null;
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token === '' ? null : token;
}

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type UserResult = { kind: 'ok'; login: string } | { kind: 'bad-token' } | { kind: 'error' };

export async function fetchUser(fetchImpl: FetchImpl, token: string): Promise<UserResult> {
  const response = await fetchImpl(`${API_BASE}/user`, { headers: apiHeaders(token) });
  if (response.status === HTTP_UNAUTHORIZED || response.status === HTTP_FORBIDDEN)
    return { kind: 'bad-token' };
  if (response.status !== HTTP_OK) return { kind: 'error' };
  const user = (await readJson(response)) as GithubUser | null;
  return typeof user?.login === 'string' ? { kind: 'ok', login: user.login } : { kind: 'error' };
}

function isRepoOwnedBy(repo: unknown, owner: string, login: string): boolean {
  if (!isRecord(repo) || !isRecord(repo['owner'])) return false;
  const repoOwner = repo['owner'];
  const repoLogin = repoOwner['login'];
  if (repoOwner['type'] !== 'User' || typeof repoLogin !== 'string') return false;
  const expected = repoLogin.toLowerCase();
  return expected === login.toLowerCase() && expected === owner.toLowerCase();
}

/** Null when the token's user owns the repo; else the refusing response. */
async function checkOwner(
  fetchImpl: FetchImpl,
  token: string,
  save: SaveRequest,
  cors: HeaderMap,
): Promise<Response | null> {
  const user = await fetchUser(fetchImpl, token);
  if (user.kind === 'bad-token') return failure(401, 'bad-token', cors);
  if (user.kind === 'error') return failure(502, 'github-error', cors);

  const repoResponse = await fetchImpl(`${API_BASE}/repos/${save.owner}/${save.repo}`, {
    headers: apiHeaders(token),
  });
  if (repoResponse.status === HTTP_NOT_FOUND) return failure(409, 'not-installed', cors);
  if (repoResponse.status !== HTTP_OK) return failure(502, 'github-error', cors);

  const repo = await readJson(repoResponse);
  return isRepoOwnedBy(repo, save.owner, user.login) ? null : failure(403, 'not-owner', cors);
}

type ShaResult = { kind: 'ok'; sha: string | undefined } | { kind: 'refused'; response: Response };

async function findExistingSha(
  fetchImpl: FetchImpl,
  token: string,
  save: SaveRequest,
  cors: HeaderMap,
): Promise<ShaResult> {
  const url = `${contentsUrl(save)}?ref=${encodeURIComponent(save.branch)}`;
  const response = await fetchImpl(url, { headers: apiHeaders(token) });
  if (response.status === HTTP_NOT_FOUND) return { kind: 'ok', sha: undefined };
  if (response.status === HTTP_FORBIDDEN)
    return { kind: 'refused', response: failure(409, 'not-installed', cors) };
  if (response.status !== HTTP_OK)
    return { kind: 'refused', response: failure(502, 'github-error', cors) };

  const file = await readJson(response);
  const sha = isRecord(file) ? file['sha'] : undefined;
  if (typeof sha !== 'string')
    return { kind: 'refused', response: failure(502, 'github-error', cors) };
  return { kind: 'ok', sha };
}

function contentsUrl(save: SaveRequest): string {
  return `${API_BASE}/repos/${save.owner}/${save.repo}/contents/${save.path}`;
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}

function commitBody(save: SaveRequest, results: Results, sha: string | undefined): string {
  return JSON.stringify({
    message: `chore(pattern-sense): results for ${results.week}`,
    content: encodeBase64Utf8(`${JSON.stringify(results, null, 2)}\n`),
    branch: save.branch,
    ...(sha === undefined ? {} : { sha }),
  });
}

async function handleSave(
  request: Request,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(401, 'bad-token', cors);

  const save = parseSaveRequest(await request.text());
  if (save === null) return failure(400, 'invalid-request', cors);
  const results = parseResults(save.results);
  if (results === null) return failure(422, 'invalid-results', cors);
  if (save.path !== expectedPath(results.week)) return failure(422, 'invalid-path', cors);

  const refusal = await checkOwner(fetchImpl, token, save, cors);
  if (refusal !== null) return refusal;

  const existing = await findExistingSha(fetchImpl, token, save, cors);
  if (existing.kind === 'refused') return existing.response;

  const put = await fetchImpl(contentsUrl(save), {
    method: 'PUT',
    headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
    body: commitBody(save, results, existing.sha),
  });
  if (put.status === HTTP_OK || put.status === HTTP_CREATED)
    return jsonResponse(200, { ok: true }, cors);
  if (put.status === HTTP_FORBIDDEN || put.status === HTTP_NOT_FOUND)
    return failure(409, 'not-installed', cors);
  return failure(502, 'github-error', cors);
}

export async function handle(
  request: Request,
  env: PatternSenseEnv,
  fetchImpl: FetchImpl,
): Promise<Response> {
  const cors = gateOrigin(request, env);
  if (cors instanceof Response) return cors;

  if (request.method === 'OPTIONS') return preflight(cors);
  if (request.method !== 'POST') return failure(405, 'method-not-allowed', cors);

  const { pathname } = new URL(request.url);
  if (pathname === `${ROUTE_PREFIX}save`) return handleSave(request, fetchImpl, cors);
  return failure(404, 'not-found', cors);
}
