// Pure planning for an engine update: version compare, three-way classification of engine files
// by git blob sha, and the next .coach-sync manifest. No I/O. Port of cse-coach coach_sync.py.

import type { TreeEntry } from '../github/git-data';

export type TreeMap = ReadonlyMap<string, TreeEntry>;

export interface Tag {
  readonly name: string;
  readonly commitOid: string;
  readonly treeOid: string;
}

export type Verdict = 'removed-upstream' | 'new' | 'unchanged' | 'update' | 'keep-local' | 'conflict';

export type SkipReason = 'conflict' | 'keep-local';

export interface WriteEntry {
  readonly path: string;
  readonly mode: string;
}

export interface UpdatePlan {
  readonly write: readonly WriteEntry[];
  readonly skipped: readonly { readonly path: string; readonly reason: SkipReason }[];
  readonly removedUpstream: readonly string[];
  readonly withheldWorkflows: boolean;
  readonly deferred: number;
}

export interface ParsedManifest {
  readonly version: string | null;
  readonly upstreamSha: string | null;
  readonly files: ReadonlySet<string>;
  readonly raw: Readonly<Record<string, unknown>>;
}

export const DENY: ReadonlySet<string> = new Set(['cse.config.yml', 'intake.yml']);
export const VERSION_PATH = 'VERSION';
export const MANIFEST_PATH = '.coach-sync/manifest.json';
export const FILE_MODE = '100644';
// Unmeasured: sized to the free plan's ~50-subrequest and 10 ms CPU budget, not benchmarked.
export const MAX_FILES_PER_UPDATE = 50;
const WORKFLOW_PREFIX = '.github/workflows/';
const MANIFEST_INDENT = 2;
const PRERELEASE_MARKERS = ['-', '+'];

export function parseVersion(text: string): readonly number[] | null {
  const cleaned = (text.trim().replace(/^[vV]+/, '').split('-')[0] ?? '').split('+')[0] ?? '';
  if (cleaned === '') return null;
  const parts = cleaned.split('.');
  if (!parts.every((part) => /^\d+$/.test(part))) return null;
  return parts.map(Number);
}

function compareVersions(a: readonly number[], b: readonly number[]): number {
  const shared = Math.min(a.length, b.length);
  for (let i = 0; i < shared; i += 1) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
}

export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (a === null || b === null) return false;
  return compareVersions(a, b) > 0;
}

function isStableName(name: string): boolean {
  return !PRERELEASE_MARKERS.some((marker) => name.includes(marker));
}

/** The newest stable tag; unparseable names and pre-releases are never offered. */
export function latestTag(tags: readonly Tag[]): Tag | null {
  let best: { tag: Tag; version: readonly number[] } | null = null;
  for (const tag of tags) {
    const version = isStableName(tag.name) ? parseVersion(tag.name) : null;
    if (version === null) continue;
    if (best === null || compareVersions(version, best.version) > 0) best = { tag, version };
  }
  return best === null ? null : best.tag;
}

export function classify(
  local: string | null,
  upstream: string | null,
  baseline: string | null,
): Verdict {
  if (upstream === null) return 'removed-upstream';
  if (local === null) return 'new';
  if (local === upstream) return 'unchanged';
  if (local === baseline) return 'update';
  if (upstream === baseline) return 'keep-local';
  return 'conflict';
}

export function isWorkflowPath(path: string): boolean {
  return path.startsWith(WORKFLOW_PREFIX);
}

interface PlanTrees {
  readonly local: TreeMap;
  readonly upstream: TreeMap;
  readonly baseline: TreeMap;
}

export function planUpdate(
  trees: PlanTrees,
  paths: ReadonlySet<string>,
  canWriteWorkflows: boolean,
): UpdatePlan {
  const write: WriteEntry[] = [];
  const skipped: { path: string; reason: SkipReason }[] = [];
  const removedUpstream: string[] = [];
  let withheldWorkflows = false;
  let deferred = 0;

  for (const path of [...paths].sort()) {
    if (DENY.has(path)) continue;
    const local = trees.local.get(path)?.sha ?? null;
    const upstream = trees.upstream.get(path);
    const verdict = classify(local, upstream?.sha ?? null, trees.baseline.get(path)?.sha ?? null);
    if (verdict === 'removed-upstream') {
      if (local !== null) removedUpstream.push(path);
    } else if (verdict === 'conflict' || verdict === 'keep-local') {
      skipped.push({ path, reason: verdict });
    } else if (verdict === 'new' || verdict === 'update') {
      if (isWorkflowPath(path) && !canWriteWorkflows) withheldWorkflows = true;
      else if (write.length >= MAX_FILES_PER_UPDATE) deferred += 1;
      else write.push({ path, mode: upstream?.mode ?? FILE_MODE });
    }
  }
  return { write, skipped, removedUpstream, withheldWorkflows, deferred };
}

/** Only a complete plan may advance VERSION and the manifest; a partial one stays retryable. */
export function isComplete(plan: UpdatePlan): boolean {
  return !plan.withheldWorkflows && plan.deferred === 0;
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value !== 'object' || value === null) return value;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

export interface NextManifestInput {
  readonly version: string;
  readonly tagCommitOid: string;
  readonly syncedAt: string;
}

/** Text identical to update_coach.py: json.dumps(indent=2, sort_keys=True) + newline. */
export function nextManifest(template: ParsedManifest, input: NextManifestInput): string {
  const manifest = {
    upstream: template.raw['upstream'],
    upstream_sha: input.tagCommitOid,
    version: input.version,
    synced_at: input.syncedAt,
    files: template.raw['files'],
  };
  return `${JSON.stringify(sortKeysDeep(manifest), null, MANIFEST_INDENT)}\n`;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === 'string');
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

export function parseManifest(text: string): ParsedManifest | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const files = record['files'];
  if (!isStringRecord(files)) return null;
  return {
    version: stringOrNull(record['version']),
    upstreamSha: stringOrNull(record['upstream_sha']),
    files: new Set(Object.keys(files)),
    raw: record,
  };
}
