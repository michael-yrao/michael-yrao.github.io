/** A thin, never-throwing wrapper over the Cache API for contract bodies keyed by content hash.
 *  Any missing API, throw or rejection degrades to "no cache": read → null, write/prune → no-op. */

export const CONTRACT_CACHE_NAME = 'po-contracts-v1';
/** Cache API keys must be http(s) URLs; this origin is never fetched, only used as a namespace. */
export const CONTRACT_CACHE_ORIGIN = 'https://contracts.invalid';

const HASH_SEPARATOR = '@';

function requestUrl(key: string): string {
  return `${CONTRACT_CACHE_ORIGIN}/${encodeURIComponent(key)}`;
}

/** The key of a file's body at one hash. `prefix` (no hash) groups every version of the file. */
export function contractKeyPrefix(
  ref: { owner: string; repo: string; branch: string },
  file: string,
): string {
  return `${ref.owner}/${ref.repo}${HASH_SEPARATOR}${ref.branch}/${file}`;
}

export function contractKey(prefix: string, sha256: string): string {
  return `${prefix}${HASH_SEPARATOR}${sha256}`;
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  return caches.open(CONTRACT_CACHE_NAME);
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const cache = await openCache();
    const hit = await cache?.match(requestUrl(key));
    return hit ? ((await hit.json()) as T) : null;
  } catch {
    return null;
  }
}

async function write(key: string, body: unknown): Promise<void> {
  try {
    const cache = await openCache();
    await cache?.put(requestUrl(key), new Response(JSON.stringify(body)));
  } catch {
    // no-cache behaviour
  }
}

/** Deletes every cached version of the file (same prefix) except `keepKey`. */
async function prune(prefix: string, keepKey: string): Promise<void> {
  try {
    const cache = await openCache();
    if (!cache) return;
    const familyUrl = requestUrl(`${prefix}${HASH_SEPARATOR}`);
    const keepUrl = requestUrl(keepKey);
    const stale = (await cache.keys()).filter(
      (request) => request.url.startsWith(familyUrl) && request.url !== keepUrl,
    );
    await Promise.all(stale.map((request) => cache.delete(request)));
  } catch {
    // no-cache behaviour
  }
}

export const contractCache = { read, write, prune };
