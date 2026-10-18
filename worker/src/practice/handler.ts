import {
  apiHeaders,
  bearerToken,
  checkOwner,
  contentsUrl,
  failure,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_OK,
  isRecord,
  jsonResponse,
  readJson,
  writeOwnedFile,
  type FetchImpl,
  type HeaderMap,
  type RepoTarget,
} from '../github/write-file';
import { gateOrigin, preflight, type PatternSenseEnv } from '../pattern-sense/handler';
import {
  ATTEMPTS_DIR,
  parseAttemptFile,
  parseLatestRequest,
  validateAttempt,
  type LatestRequest,
} from './validate';

export const ROUTE_PREFIX = '/practice/';

const GITHUB_RAW_ACCEPT = 'application/vnd.github.raw';
const DATE_FOLDER_PATTERN = /^\d{8}$/;

interface DirEntry {
  readonly name: string;
  readonly type: string;
}

type ListResult =
  | { kind: 'ok'; entries: readonly DirEntry[] }
  | { kind: 'missing' }
  | { kind: 'refused'; response: Response };

async function handleSave(
  request: Request,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(401, 'bad-token', cors);

  const file = parseAttemptFile(await request.text());
  if (file === null) return failure(400, 'invalid-request', cors);
  const checked = validateAttempt(file);
  if ('error' in checked) return failure(400, checked.error, cors);

  return writeOwnedFile(
    fetchImpl,
    token,
    file,
    { message: checked.commitMessage, content: file.content },
    cors,
  );
}

function refModeUrl(target: RepoTarget, path: string): string {
  return `${contentsUrl(target, path)}?ref=${encodeURIComponent(target.branch)}`;
}

function isDirEntry(value: unknown): value is DirEntry {
  return isRecord(value) && typeof value['name'] === 'string' && typeof value['type'] === 'string';
}

async function listDir(
  fetchImpl: FetchImpl,
  token: string,
  target: RepoTarget,
  path: string,
  cors: HeaderMap,
): Promise<ListResult> {
  const response = await fetchImpl(refModeUrl(target, path), { headers: apiHeaders(token) });
  if (response.status === HTTP_NOT_FOUND) return { kind: 'missing' };
  if (response.status === HTTP_FORBIDDEN)
    return { kind: 'refused', response: failure(409, 'not-installed', cors) };
  if (response.status !== HTTP_OK)
    return { kind: 'refused', response: failure(502, 'github-error', cors) };

  const listing = await readJson(response);
  if (!Array.isArray(listing)) return { kind: 'refused', response: failure(502, 'github-error', cors) };
  return { kind: 'ok', entries: listing.filter(isDirEntry) };
}

function dateFoldersNewestFirst(entries: readonly DirEntry[]): string[] {
  return entries
    .filter((entry) => entry.type === 'dir' && DATE_FOLDER_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
}

function findAttemptName(entries: readonly DirEntry[], number: number): string | undefined {
  const pattern = new RegExp(`^${number}_[a-z0-9_]+\\.py$`);
  return entries
    .filter((entry) => entry.type === 'file' && pattern.test(entry.name))
    .map((entry) => entry.name)
    .sort()[0];
}

type FoundResult =
  | { kind: 'found'; path: string }
  | { kind: 'none' }
  | { kind: 'refused'; response: Response };

/** Walks the date folders newest first and stops at the first one holding the problem. */
async function findLatestPath(
  fetchImpl: FetchImpl,
  token: string,
  request: LatestRequest,
  cors: HeaderMap,
): Promise<FoundResult> {
  const root = await listDir(fetchImpl, token, request, ATTEMPTS_DIR, cors);
  if (root.kind === 'refused') return root;
  if (root.kind === 'missing') return { kind: 'none' };

  for (const folder of dateFoldersNewestFirst(root.entries)) {
    const folderPath = `${ATTEMPTS_DIR}/${folder}`;
    const listing = await listDir(fetchImpl, token, request, folderPath, cors);
    if (listing.kind === 'refused') return listing;
    if (listing.kind === 'missing') continue;
    const name = findAttemptName(listing.entries, request.number);
    if (name !== undefined) return { kind: 'found', path: `${folderPath}/${name}` };
  }
  return { kind: 'none' };
}

async function handleLatest(
  request: Request,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(401, 'bad-token', cors);

  const latest = parseLatestRequest(await request.text());
  if (latest === null) return failure(400, 'invalid-request', cors);

  const refusal = await checkOwner(fetchImpl, token, latest, cors);
  if (refusal !== null) return refusal;

  const found = await findLatestPath(fetchImpl, token, latest, cors);
  if (found.kind === 'refused') return found.response;
  if (found.kind === 'none') return failure(404, 'none', cors);

  const file = await fetchImpl(refModeUrl(latest, found.path), {
    headers: apiHeaders(token, GITHUB_RAW_ACCEPT),
  });
  if (file.status === HTTP_NOT_FOUND) return failure(404, 'none', cors);
  if (file.status === HTTP_FORBIDDEN) return failure(409, 'not-installed', cors);
  if (file.status !== HTTP_OK) return failure(502, 'github-error', cors);
  return jsonResponse(200, { path: found.path, content: await file.text() }, cors);
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
  if (pathname === `${ROUTE_PREFIX}latest`) return handleLatest(request, fetchImpl, cors);
  return failure(404, 'not-found', cors);
}
