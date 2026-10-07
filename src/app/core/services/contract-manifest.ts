import { isRecord } from '../contracts/is-record';

export const MANIFEST_FILE = 'dashboard/manifest.json';
export const MANIFEST_SCHEMA_VERSION = 1;
const DASHBOARD_PREFIX = 'dashboard/';
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** `dashboard/manifest.json`: content hashes of the dashboard's contract files, keyed by the
 *  path relative to `dashboard/`. */
export interface ContractManifest {
  readonly files: Readonly<Record<string, { readonly sha256: string }>>;
}

function isListedEntry(entry: unknown): boolean {
  return isRecord(entry) && typeof entry['sha256'] === 'string' && SHA256_PATTERN.test(entry['sha256']);
}

/** The manifest when the body is a usable, schema-compatible one; else null. */
export function parseManifest(body: unknown): ContractManifest | null {
  if (!isRecord(body) || body['schemaVersion'] !== MANIFEST_SCHEMA_VERSION) return null;
  const files = body['files'];
  if (!isRecord(files) || !Object.values(files).every(isListedEntry)) return null;
  return body as unknown as ContractManifest;
}

/** The sha256 the manifest lists for a repo-root path, or null (no manifest / not listed / outside dashboard/). */
export function manifestHash(manifest: ContractManifest | null, file: string): string | null {
  if (!manifest || !file.startsWith(DASHBOARD_PREFIX)) return null;
  const entry = manifest.files[file.slice(DASHBOARD_PREFIX.length)];
  return entry?.sha256 ?? null;
}
