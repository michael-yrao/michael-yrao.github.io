import { describe, expect, it, vi } from 'vitest';
import { backupDiary } from './backup';
import { BACKUP_KEY, ENTRY_PREFIX, type BackupEnv } from './store';

const NOW = Date.UTC(2026, 10, 8, 9, 0, 0);
const KEY_BYTES = 32;
const IV_BYTES = 12;
const KEY_BASE64 = btoa(String.fromCharCode(...new Uint8Array(KEY_BYTES).fill(7)));
const TOKEN = 'backup-token';
const REPO = 'michael-yrao/diary-backup';
const HTTP_CREATED = 201;
const HTTP_NOT_FOUND = 404;
const ENTRIES = [
  { id: '2026-11-05-bbbbbb', date: '2026-11-05', title: 'Secret Title Two', body: 'Sit amet.', updatedAt: 'u2' },
  { id: '2026-11-01-aaaaaa', date: '2026-11-01', title: 'Secret Title One', body: 'Dolor.', updatedAt: 'u1' },
];

class FakeKv {
  readonly store = new Map<string, string>();
  async get(key: string, type?: string) {
    const raw = this.store.get(key) ?? null;
    return raw !== null && type === 'json' ? (JSON.parse(raw) as unknown) : raw;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
  }
  async list(options: { prefix: string }) {
    const keys = [...this.store.keys()].filter((key) => key.startsWith(options.prefix)).sort();
    return { keys: keys.map((name) => ({ name })), list_complete: true, cursor: '' };
  }
}

function setup(overrides: Partial<BackupEnv> = {}) {
  const kv = new FakeKv();
  ENTRIES.forEach((entry) => kv.store.set(`${ENTRY_PREFIX}${entry.id}`, JSON.stringify(entry)));
  const env: BackupEnv = {
    INTERVIEWS: kv as unknown as KVNamespace,
    DIARY_BACKUP_KEY: KEY_BASE64,
    DIARY_BACKUP_TOKEN: TOKEN,
    DIARY_BACKUP_REPO: REPO,
    ...overrides,
  };
  return { kv, env };
}

function githubFake(putStatus: number) {
  const calls: Array<{ method: string; url: string; body: string }> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({ method, url: String(input), body: String(init?.body ?? '') });
    return new Response('{}', { status: method === 'PUT' ? putStatus : HTTP_NOT_FOUND });
  }) as typeof fetch;
  return { calls, fetchImpl, puts: () => calls.filter((call) => call.method === 'PUT') };
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

async function decrypt(fileText: string): Promise<unknown> {
  const file = JSON.parse(fileText) as { v: number; alg: string; iv: string; ct: string };
  const key = await crypto.subtle.importKey('raw', fromBase64(KEY_BASE64), 'AES-GCM', false, ['decrypt']);
  const iv = fromBase64(file.iv);
  expect(iv).toHaveLength(IV_BYTES);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromBase64(file.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

describe('backupDiary', () => {
  it('writes one encrypted diary.enc that holds the entries and no title text, then records the hash', async () => {
    const { kv, env } = setup();
    const github = githubFake(HTTP_CREATED);
    await backupDiary(env, github.fetchImpl, () => NOW);

    expect(github.puts()).toHaveLength(1);
    const put = github.puts()[0];
    expect(put?.url).toContain(`/repos/${REPO}/contents/diary.enc`);
    const payload = JSON.parse(put?.body ?? '{}') as { message: string; content: string };
    const fileText = new TextDecoder().decode(fromBase64(payload.content));
    expect(await decrypt(fileText)).toEqual([...ENTRIES].sort((a, b) => a.id.localeCompare(b.id)));
    expect(payload.message).toBe(`backup ${new Date(NOW).toISOString()}`);
    for (const text of [fileText, payload.message]) expect(text).not.toContain('Secret Title');

    const record = JSON.parse(kv.store.get(BACKUP_KEY) ?? '{}') as { hash: string; at: string };
    expect(record.at).toBe(new Date(NOW).toISOString());
    expect(record.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('makes no GitHub call when the entries are unchanged since the last backup', async () => {
    const { env } = setup();
    await backupDiary(env, githubFake(HTTP_CREATED).fetchImpl, () => NOW);
    const second = githubFake(HTTP_CREATED);
    await backupDiary(env, second.fetchImpl, () => NOW);
    expect(second.calls).toEqual([]);
  });

  it.each([
    ['conflict', 409],
    ['forbidden', 403],
    ['server error', 500],
  ])('leaves diary:backup unchanged when GitHub answers %s', async (_name, putStatus) => {
    const { kv, env } = setup();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await backupDiary(env, githubFake(putStatus).fetchImpl, () => NOW);
    expect(kv.store.has(BACKUP_KEY)).toBe(false);
    errorLog.mockRestore();
  });

  it.each([
    ['no key', { DIARY_BACKUP_KEY: undefined }],
    ['no token', { DIARY_BACKUP_TOKEN: undefined }],
  ])('makes no GitHub call with %s', async (_name, overrides) => {
    const { kv, env } = setup(overrides);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const github = githubFake(HTTP_CREATED);
    await backupDiary(env, github.fetchImpl, () => NOW);
    expect(github.calls).toEqual([]);
    expect(kv.store.has(BACKUP_KEY)).toBe(false);
    errorLog.mockRestore();
  });
});
