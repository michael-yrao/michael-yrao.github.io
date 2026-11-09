import type { PatternSenseEnv } from '../pattern-sense/handler';
import type { DiaryEntry } from './contract';

export const ENTRY_PREFIX = 'diary:entry:';
export const VIEW_PREFIX = 'diary:view:';
export const BACKUP_KEY = 'diary:backup';

export interface DiaryLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** The bindings the backup reads, shared by the write-time run and the cron run. */
export interface BackupEnv {
  readonly INTERVIEWS: KVNamespace;
  readonly DIARY_BACKUP_KEY?: string;
  readonly DIARY_BACKUP_TOKEN?: string;
  readonly DIARY_BACKUP_REPO?: string;
}

export interface DiaryEnv extends PatternSenseEnv, BackupEnv {
  readonly DIARY_ATTEMPTS?: DiaryLimiter;
  readonly DIARY_SEEN?: DiaryLimiter;
  readonly DIARY_PASSWORD?: string;
  readonly OWNER_LOGIN?: string;
}

export interface BackupRecord {
  hash: string;
  at: string;
}

export interface KeyedValue<T> {
  readonly key: string;
  readonly value: T;
}

export async function readAllKeyed<T>(kv: KVNamespace, prefix: string): Promise<KeyedValue<T>[]> {
  const items: KeyedValue<T>[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix, cursor });
    const values = await Promise.all(page.keys.map((entry) => kv.get(entry.name, 'json')));
    page.keys.forEach((entry, index) => {
      const value = values[index];
      if (value !== null && value !== undefined) items.push({ key: entry.name, value: value as T });
    });
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor !== undefined);
  return items;
}

export async function readAllByPrefix<T>(kv: KVNamespace, prefix: string): Promise<T[]> {
  return (await readAllKeyed<T>(kv, prefix)).map((item) => item.value);
}

export function readAllEntries(kv: KVNamespace): Promise<DiaryEntry[]> {
  return readAllByPrefix<DiaryEntry>(kv, ENTRY_PREFIX);
}

/** Newest date first; ties by the later update. */
export function sortNewestFirst(entries: readonly DiaryEntry[]): DiaryEntry[] {
  return [...entries].sort(
    (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt),
  );
}
