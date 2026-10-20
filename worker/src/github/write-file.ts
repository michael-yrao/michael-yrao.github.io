// Shared GitHub plumbing for the routes that write to a repo the caller owns:
// response helpers, bearer parsing, the owner check, and the sha-lookup + PUT.

export type FetchImpl = typeof fetch;
export type HeaderMap = Record<string, string>;

export const API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const USER_AGENT = 'pattern-sense-github-auth';
const GITHUB_JSON_ACCEPT = 'application/vnd.github+json';
export const HTTP_OK = 200;
const HTTP_CREATED = 201;
export const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
const BEARER_PREFIX = 'Bearer ';

export interface RepoTarget {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
}

export interface FileTarget extends RepoTarget {
  readonly path: string;
}

export interface FileCommit {
  readonly message: string;
  /** The file's full text; encoded as UTF-8 then base64 for the PUT. */
  readonly content: string;
}

interface GithubUser {
  readonly login: string;
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

export function apiHeaders(token: string, accept: string = GITHUB_JSON_ACCEPT): HeaderMap {
  return {
    Authorization: `Bearer ${token}`,
    Accept: accept,
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': USER_AGENT,
  };
}

export function bearerToken(request: Request): string | null {
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

export function isRepoOwnedBy(repo: unknown, owner: string, login: string): boolean {
  if (!isRecord(repo) || !isRecord(repo['owner'])) return false;
  const repoOwner = repo['owner'];
  const repoLogin = repoOwner['login'];
  if (repoOwner['type'] !== 'User' || typeof repoLogin !== 'string') return false;
  const expected = repoLogin.toLowerCase();
  return expected === login.toLowerCase() && expected === owner.toLowerCase();
}

/** Null when the token's user owns the repo; else the refusing response. */
export async function checkOwner(
  fetchImpl: FetchImpl,
  token: string,
  target: RepoTarget,
  cors: HeaderMap,
): Promise<Response | null> {
  const user = await fetchUser(fetchImpl, token);
  if (user.kind === 'bad-token') return failure(401, 'bad-token', cors);
  if (user.kind === 'error') return failure(502, 'github-error', cors);

  const repoResponse = await fetchImpl(`${API_BASE}/repos/${target.owner}/${target.repo}`, {
    headers: apiHeaders(token),
  });
  if (repoResponse.status === HTTP_NOT_FOUND) return failure(409, 'not-installed', cors);
  if (repoResponse.status !== HTTP_OK) return failure(502, 'github-error', cors);

  const repo = await readJson(repoResponse);
  return isRepoOwnedBy(repo, target.owner, user.login) ? null : failure(403, 'not-owner', cors);
}

export function contentsUrl(target: RepoTarget, path: string): string {
  return `${API_BASE}/repos/${target.owner}/${target.repo}/contents/${path}`;
}

type ShaResult = { kind: 'ok'; sha: string | undefined } | { kind: 'refused'; response: Response };

async function findExistingSha(
  fetchImpl: FetchImpl,
  token: string,
  target: FileTarget,
  cors: HeaderMap,
): Promise<ShaResult> {
  const url = `${contentsUrl(target, target.path)}?ref=${encodeURIComponent(target.branch)}`;
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

export function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}

function commitBody(target: FileTarget, commit: FileCommit, sha: string | undefined): string {
  return JSON.stringify({
    message: commit.message,
    content: encodeBase64Utf8(commit.content),
    branch: target.branch,
    ...(sha === undefined ? {} : { sha }),
  });
}

/**
 * Owner check, then sha lookup, then PUT, in that order. Returns the final response:
 * 200 `{ok: true}` on a write, else the refusal.
 */
export async function writeOwnedFile(
  fetchImpl: FetchImpl,
  token: string,
  target: FileTarget,
  commit: FileCommit,
  cors: HeaderMap,
): Promise<Response> {
  const refusal = await checkOwner(fetchImpl, token, target, cors);
  if (refusal !== null) return refusal;

  const existing = await findExistingSha(fetchImpl, token, target, cors);
  if (existing.kind === 'refused') return existing.response;

  const put = await fetchImpl(contentsUrl(target, target.path), {
    method: 'PUT',
    headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
    body: commitBody(target, commit, existing.sha),
  });
  if (put.status === HTTP_OK || put.status === HTTP_CREATED)
    return jsonResponse(200, { ok: true }, cors);
  if (put.status === HTTP_FORBIDDEN || put.status === HTTP_NOT_FOUND)
    return failure(409, 'not-installed', cors);
  return failure(502, 'github-error', cors);
}
