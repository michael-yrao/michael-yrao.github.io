export type SkipReason = 'conflict' | 'keep-local';

export interface SkippedFile {
  readonly path: string;
  readonly reason: SkipReason;
}

export interface EngineVersions {
  readonly repo: string | null;
  readonly template: string | null;
}

export interface EngineUpdate {
  readonly version: EngineVersions;
  readonly updated: readonly string[];
  readonly skipped: readonly SkippedFile[];
  readonly removedUpstream: readonly string[];
  readonly notice?: 'needs-workflows-permission';
}

const SKIP_REASONS: ReadonlySet<string> = new Set(['conflict', 'keep-local']);
const WORKFLOWS_NOTICE = 'needs-workflows-permission';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === 'string' ? value : undefined;
}

function skippedFiles(value: unknown): SkippedFile[] | null {
  if (!Array.isArray(value)) return null;
  const files: SkippedFile[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item['path'] !== 'string') return null;
    const reason = item['reason'];
    if (typeof reason !== 'string' || !SKIP_REASONS.has(reason)) return null;
    files.push({ path: item['path'], reason: reason as SkipReason });
  }
  return files;
}

/** Reads `payload.version`; null unless it is a record whose `repo` and `template` are each a string or null. */
function readVersions(payload: unknown): EngineVersions | null {
  if (!isRecord(payload) || !isRecord(payload['version'])) return null;
  const repo = nullableString(payload['version']['repo']);
  const template = nullableString(payload['version']['template']);
  if (repo === undefined || template === undefined) return null;
  return { repo, template };
}

/** Reads a versions-only `POST /engine/update` body; null on any shape mismatch, never throws. */
export function engineVersions(payload: unknown): EngineVersions | null {
  return readVersions(payload);
}

/** Reads a `POST /engine/update` body; null on any shape mismatch, never throws. */
export function engineUpdate(payload: unknown): EngineUpdate | null {
  const version = readVersions(payload);
  if (version === null || !isRecord(payload)) return null;
  const skipped = skippedFiles(payload['skipped']);
  const { updated, removedUpstream, notice } = payload;
  if (skipped === null) return null;
  if (!isStringArray(updated) || !isStringArray(removedUpstream)) return null;
  if (notice !== undefined && notice !== WORKFLOWS_NOTICE) return null;
  return {
    version,
    updated,
    skipped,
    removedUpstream,
    ...(notice === WORKFLOWS_NOTICE ? { notice } : {}),
  };
}

/** Port of coach_sync.py `parse_version`: dotted digits after an optional v and before any - or +. */
function parseVersion(text: string): number[] | null {
  const cleaned = text.trim().replace(/^[vV]+/, '').split('-')[0].split('+')[0];
  if (cleaned === '') return null;
  const parts = cleaned.split('.');
  if (!parts.every((part) => /^\d+$/.test(part))) return null;
  return parts.map(Number);
}

/** Port of coach_sync.py `is_newer`: lexicographic tuple compare, a shorter prefix is smaller. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  if (a === null || b === null) return false;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return a.length > b.length;
}
