// Git Data API + GraphQL helpers for writing one commit to a repo the caller owns.
// Every response is external input: shapes are validated and failures returned, never thrown.
import { API_BASE, apiHeaders, isRecord, readJson, type FetchImpl } from './write-file';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_UNPROCESSABLE = 422;
const BLOB_TYPE = 'blob';
const JSON_TYPE = { 'Content-Type': 'application/json' };

export interface TreeEntry {
  readonly sha: string;
  readonly mode: string;
}

export type GitResult<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'error'; readonly error: string };

export interface NewTreeEntry {
  readonly path: string;
  readonly mode: string;
  readonly content: string;
}

export type RefResult =
  | { readonly kind: 'ok' }
  | { readonly kind: 'moved' }
  | { readonly kind: 'error'; readonly error: string };

function ok<T>(value: T): GitResult<T> {
  return { kind: 'ok', value };
}

function fail<T>(error: string): GitResult<T> {
  return { kind: 'error', error };
}

function repoUrl(owner: string, repo: string, suffix: string): string {
  return `${API_BASE}/repos/${owner}/${repo}${suffix}`;
}

function parseTreeEntries(tree: unknown): Map<string, TreeEntry> | null {
  if (!Array.isArray(tree)) return null;
  const entries = new Map<string, TreeEntry>();
  for (const item of tree) {
    if (!isRecord(item)) return null;
    const { path, mode, type, sha } = item;
    if (typeof path !== 'string' || typeof mode !== 'string' || typeof sha !== 'string') return null;
    if (type === BLOB_TYPE) entries.set(path, { sha, mode });
  }
  return entries;
}

export async function getTree(
  fetchImpl: FetchImpl,
  token: string,
  owner: string,
  repo: string,
  treeOid: string,
): Promise<GitResult<Map<string, TreeEntry>>> {
  const url = repoUrl(owner, repo, `/git/trees/${treeOid}?recursive=1`);
  const response = await fetchImpl(url, { headers: apiHeaders(token) });
  if (response.status !== HTTP_OK) return fail(`tree-status-${response.status}`);
  const body = await readJson(response);
  if (!isRecord(body)) return fail('tree-shape');
  if (body['truncated'] === true) return fail('tree-truncated');
  const entries = parseTreeEntries(body['tree']);
  return entries === null ? fail('tree-shape') : ok(entries);
}

export async function graphql(
  fetchImpl: FetchImpl,
  token: string,
  query: string,
): Promise<GitResult<Record<string, unknown>>> {
  const response = await fetchImpl(`${API_BASE}/graphql`, {
    method: 'POST',
    headers: { ...apiHeaders(token), ...JSON_TYPE },
    body: JSON.stringify({ query }),
  });
  if (response.status !== HTTP_OK) return fail(`graphql-status-${response.status}`);
  const body = await readJson(response);
  if (!isRecord(body) || !isRecord(body['data'])) return fail('graphql-no-data');
  return ok(body['data']);
}

/** Walk nested records; undefined when any step is not a record. */
export function dig(value: unknown, ...keys: readonly string[]): unknown {
  let current = value;
  for (const key of keys) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

const BLOB_FIELDS = '... on Blob { text isBinary isTruncated }';

/** One aliased `object(expression:)` selection reading a blob's text. */
export function blobSelection(alias: string, expression: string): string {
  return `${alias}: object(expression: ${JSON.stringify(expression)}) { ${BLOB_FIELDS} }`;
}

export function buildBlobQuery(
  owner: string,
  repo: string,
  commitOid: string,
  paths: readonly string[],
): string {
  const selections = paths.map((path, index) =>
    blobSelection(`f${index}`, `${commitOid}:${path}`),
  );
  const target = `owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}`;
  return `query { repository(${target}) { ${selections.join(' ')} } }`;
}

/** The text of one aliased blob node, or an error string describing why it is unusable. */
export function blobText(node: unknown): GitResult<string> {
  if (!isRecord(node)) return fail('missing');
  if (node['isBinary'] === true) return fail('binary');
  if (node['isTruncated'] === true) return fail('truncated');
  const text = node['text'];
  return typeof text === 'string' ? ok(text) : fail('missing');
}

export function parseBlobTexts(
  data: Record<string, unknown>,
  paths: readonly string[],
): GitResult<Map<string, string>> {
  const texts = new Map<string, string>();
  for (const [index, path] of paths.entries()) {
    const result = blobText(dig(data, 'repository', `f${index}`));
    if (result.kind === 'error') return fail(`${result.error}: ${path}`);
    texts.set(path, result.value);
  }
  return ok(texts);
}

async function postForSha(
  fetchImpl: FetchImpl,
  token: string,
  url: string,
  body: unknown,
): Promise<GitResult<string>> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { ...apiHeaders(token), ...JSON_TYPE },
    body: JSON.stringify(body),
  });
  if (response.status !== HTTP_CREATED) return fail(`create-status-${response.status}`);
  const sha = dig(await readJson(response), 'sha');
  return typeof sha === 'string' ? ok(sha) : fail('create-shape');
}

export function createTree(
  fetchImpl: FetchImpl,
  token: string,
  owner: string,
  repo: string,
  baseTree: string,
  entries: readonly NewTreeEntry[],
): Promise<GitResult<string>> {
  const tree = entries.map(({ path, mode, content }) => ({ path, mode, type: BLOB_TYPE, content }));
  return postForSha(fetchImpl, token, repoUrl(owner, repo, '/git/trees'), {
    base_tree: baseTree,
    tree,
  });
}

export function createCommit(
  fetchImpl: FetchImpl,
  token: string,
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentSha: string,
): Promise<GitResult<string>> {
  return postForSha(fetchImpl, token, repoUrl(owner, repo, '/git/commits'), {
    message,
    tree: treeSha,
    parents: [parentSha],
  });
}

export async function updateRef(
  fetchImpl: FetchImpl,
  token: string,
  owner: string,
  repo: string,
  branch: string,
  sha: string,
): Promise<RefResult> {
  const response = await fetchImpl(repoUrl(owner, repo, `/git/refs/heads/${branch}`), {
    method: 'PATCH',
    headers: { ...apiHeaders(token), ...JSON_TYPE },
    body: JSON.stringify({ sha, force: false }),
  });
  if (response.status === HTTP_OK) return { kind: 'ok' };
  if (response.status === HTTP_UNPROCESSABLE) return { kind: 'moved' };
  return { kind: 'error', error: `ref-status-${response.status}` };
}
