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
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;
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
  return checkRepoOwner(fetchImpl, token, target, user.login, cors);
}

/** The repo half of the owner check, for a caller that already knows the token's login. */
export async function checkRepoOwner(
  fetchImpl: FetchImpl,
  token: string,
  target: RepoTarget,
  login: string,
  cors: HeaderMap,
): Promise<Response | null> {
  const repoResponse = await fetchImpl(`${API_BASE}/repos/${target.owner}/${target.repo}`, {
    headers: apiHeaders(token),
  });
  if (repoResponse.status === HTTP_NOT_FOUND) return failure(409, 'not-installed', cors);
  if (repoResponse.status !== HTTP_OK) return failure(502, 'github-error', cors);

  const repo = await readJson(repoResponse);
  return isRepoOwnedBy(repo, target.owner, login) ? null : failure(403, 'not-owner', cors);
}

export function contentsUrl(target: RepoTarget, path: string): string {
  return `${API_BASE}/repos/${target.owner}/${target.repo}/contents/${path}`;
}

type ShaResult = { kind: 'ok'; sha: string | undefined } | { kind: 'refused'; response: Response };

type Refused = { kind: 'refused'; response: Response };
type ContentsLookup =
  | { kind: 'found'; file: Record<string, unknown> }
  | { kind: 'missing' }
  | Refused;

function refusedGithubError(cors: HeaderMap): Refused {
  return { kind: 'refused', response: failure(502, 'github-error', cors) };
}

function refusedNotInstalled(cors: HeaderMap): Refused {
  return { kind: 'refused', response: failure(409, 'not-installed', cors) };
}

async function getContents(
  fetchImpl: FetchImpl,
  token: string,
  target: FileTarget,
  cors: HeaderMap,
): Promise<ContentsLookup> {
  const url = `${contentsUrl(target, target.path)}?ref=${encodeURIComponent(target.branch)}`;
  const response = await fetchImpl(url, { headers: apiHeaders(token) });
  if (response.status === HTTP_NOT_FOUND) return { kind: 'missing' };
  if (response.status === HTTP_FORBIDDEN) return refusedNotInstalled(cors);
  if (response.status !== HTTP_OK) return refusedGithubError(cors);

  const file = await readJson(response);
  return isRecord(file) ? { kind: 'found', file } : refusedGithubError(cors);
}

async function findExistingSha(
  fetchImpl: FetchImpl,
  token: string,
  target: FileTarget,
  cors: HeaderMap,
): Promise<ShaResult> {
  const lookup = await getContents(fetchImpl, token, target, cors);
  if (lookup.kind === 'missing') return { kind: 'ok', sha: undefined };
  if (lookup.kind === 'refused') return lookup;
  const sha = lookup.file['sha'];
  return typeof sha === 'string' ? { kind: 'ok', sha } : refusedGithubError(cors);
}

export type ReadFileResult =
  | { kind: 'found'; text: string; sha: string }
  | { kind: 'missing' }
  | Refused;

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

/** The file's text and blob sha, for a read-modify-write; the file may not exist yet. */
export async function readFileWithSha(
  fetchImpl: FetchImpl,
  token: string,
  target: FileTarget,
  cors: HeaderMap,
): Promise<ReadFileResult> {
  const lookup = await getContents(fetchImpl, token, target, cors);
  if (lookup.kind !== 'found') return lookup;
  const { sha, content } = lookup.file;
  if (typeof sha !== 'string' || typeof content !== 'string') return refusedGithubError(cors);
  try {
    return { kind: 'found', text: decodeBase64Utf8(content), sha };
  } catch {
    return refusedGithubError(cors);
  }
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

  const written = await writeFile(fetchImpl, token, target, commit, cors);
  return written.kind === 'refused' ? written.response : jsonResponse(200, { ok: true }, cors);
}

type WriteResult = { kind: 'written' } | { kind: 'refused'; response: Response };

/** Sha lookup, then PUT, with no owner check; the caller has already done it. */
export async function writeFile(
  fetchImpl: FetchImpl,
  token: string,
  target: FileTarget,
  commit: FileCommit,
  cors: HeaderMap,
): Promise<WriteResult> {
  const existing = await findExistingSha(fetchImpl, token, target, cors);
  if (existing.kind === 'refused') return existing;

  const put = await putFile(fetchImpl, token, target, commit, existing.sha, cors);
  return put.kind === 'conflict' ? refusedGithubError(cors) : put;
}

export type PutResult = { kind: 'written' } | { kind: 'conflict' } | Refused;

/** The contents PUT. A conflict (stale sha, or the file appeared) is the caller's to re-read and retry. */
export async function putFile(
  fetchImpl: FetchImpl,
  token: string,
  target: FileTarget,
  commit: FileCommit,
  sha: string | undefined,
  cors: HeaderMap,
): Promise<PutResult> {
  const put = await fetchImpl(contentsUrl(target, target.path), {
    method: 'PUT',
    headers: { ...apiHeaders(token), 'Content-Type': 'application/json' },
    body: commitBody(target, commit, sha),
  });
  if (put.status === HTTP_OK || put.status === HTTP_CREATED) return { kind: 'written' };
  if (put.status === HTTP_CONFLICT || put.status === HTTP_UNPROCESSABLE) return { kind: 'conflict' };
  if (put.status === HTTP_FORBIDDEN || put.status === HTTP_NOT_FOUND)
    return refusedNotInstalled(cors);
  return refusedGithubError(cors);
}
