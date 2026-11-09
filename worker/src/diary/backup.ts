import { putFile, readFileWithSha, type FetchImpl, type FileTarget } from '../github/write-file';
import { BACKUP_KEY, readAllEntries, type BackupEnv, type BackupRecord } from './store';

export const BACKUP_PATH = 'diary.enc';

const BACKUP_BRANCH = 'main';
const FORMAT_VERSION = 1;
const CIPHER_NAME = 'AES-256-GCM';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const NO_CORS = {};

function toBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** `{"v":1,"alg":"AES-256-GCM","iv":"<b64>","ct":"<b64>"}`; the GCM tag is the tail of `ct`. */
async function encryptPayload(keyBase64: string, plaintext: string): Promise<string> {
  const keyBytes = fromBase64(keyBase64);
  if (keyBytes.length !== KEY_BYTES) throw new Error(`DIARY_BACKUP_KEY must decode to ${KEY_BYTES} bytes`);
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return JSON.stringify({
    v: FORMAT_VERSION,
    alg: CIPHER_NAME,
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(cipher)),
  });
}

function backupTarget(repo: string | undefined): FileTarget | null {
  const [owner, name, ...rest] = (repo ?? '').split('/');
  if (!owner || !name || rest.length > 0) return null;
  return { owner, repo: name, branch: BACKUP_BRANCH, path: BACKUP_PATH };
}

async function attemptBackup(env: BackupEnv, fetchImpl: FetchImpl, now: () => number): Promise<void> {
  const entries = [...(await readAllEntries(env.INTERVIEWS))].sort((a, b) => a.id.localeCompare(b.id));
  const plaintext = JSON.stringify(entries);
  const hash = await sha256Hex(plaintext);
  const previous = await env.INTERVIEWS.get<BackupRecord>(BACKUP_KEY, 'json');
  if (previous?.hash === hash) return;

  const { DIARY_BACKUP_KEY: key, DIARY_BACKUP_TOKEN: token } = env;
  const target = backupTarget(env.DIARY_BACKUP_REPO);
  if (!key || !token || target === null) {
    console.error('diary backup skipped: DIARY_BACKUP_KEY, DIARY_BACKUP_TOKEN or DIARY_BACKUP_REPO is missing');
    return;
  }

  const at = new Date(now()).toISOString();
  const content = await encryptPayload(key, plaintext);
  const existing = await readFileWithSha(fetchImpl, token, target, NO_CORS);
  if (existing.kind === 'refused') {
    console.error(`diary backup failed reading ${BACKUP_PATH}: ${existing.response.status}`);
    return;
  }
  const sha = existing.kind === 'found' ? existing.sha : undefined;
  const put = await putFile(fetchImpl, token, target, { message: `backup ${at}`, content }, sha, NO_CORS);
  if (put.kind !== 'written') {
    console.error(`diary backup failed writing ${BACKUP_PATH}: ${put.kind}`);
    return;
  }
  const record: BackupRecord = { hash, at };
  await env.INTERVIEWS.put(BACKUP_KEY, JSON.stringify(record));
}

/** Never rejects: a failed run is logged and `diary:backup` stays put, so the next run retries. */
export async function backupDiary(env: BackupEnv, fetchImpl: FetchImpl, now: () => number): Promise<void> {
  try {
    await attemptBackup(env, fetchImpl, now);
  } catch (error) {
    console.error('diary backup failed', error);
  }
}

/** The cron entry: run the backup after the scheduled handler returns. */
export function runScheduledBackup(env: BackupEnv, ctx: Pick<ExecutionContext, 'waitUntil'>): void {
  ctx.waitUntil(backupDiary(env, (input, init) => fetch(input, init), Date.now));
}
