import { describe, expect, it, vi } from 'vitest';
import {
  ENTRY_PREFIX,
  handle,
  MAX_BODY_CHARS,
  SEEN_WINDOW_HOURS,
  VIEW_PREFIX,
  type DiaryEnv,
} from './handler';

const ORIGIN = 'https://progressiveoverflow.com';
const PASSWORD = 'placeholder-password';
const IP = '203.0.113.7';
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const MS_PER_HOUR = 3_600_000;
const KV_PAGE_SIZE = 2;
const OWNER = 'michael-yrao';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const VISIT_ID = `${new Date(NOW).toISOString()}_${'a'.repeat(32)}`;
const OLD_ENTRY = { id: '2026-11-01-aaaaaa', date: '2026-11-01', title: 'Lorem', body: 'Dolor.', updatedAt: 'u1' };
const NEW_ENTRY = { id: '2026-11-05-bbbbbb', date: '2026-11-05', title: 'Ipsum', body: 'Sit amet.', updatedAt: 'u2' };

class FakeKv {
  readonly store = new Map<string, string>();
  async get(key: string, type?: string) {
    const raw = this.store.get(key) ?? null;
    return raw !== null && type === 'json' ? (JSON.parse(raw) as unknown) : raw;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
  }
  async delete(key: string) {
    this.store.delete(key);
  }
  async list(options: { prefix: string; cursor?: string }) {
    const all = [...this.store.keys()].filter((key) => key.startsWith(options.prefix)).sort();
    const start = options.cursor === undefined ? 0 : Number(options.cursor);
    const end = start + KV_PAGE_SIZE;
    return {
      keys: all.slice(start, end).map((name) => ({ name })),
      list_complete: end >= all.length,
      cursor: String(end),
    };
  }
  viewKeys(): string[] {
    return [...this.store.keys()].filter((key) => key.startsWith(VIEW_PREFIX));
  }
}

type Limiter = 'none' | 'deny' | 'allow';

function limiterOf(mode: Limiter) {
  return mode === 'none' ? undefined : { limit: async () => ({ success: mode === 'allow' }) };
}

function setup(overrides: { limiter?: Limiter; seen?: Limiter; secret?: string } = {}) {
  const kv = new FakeKv();
  kv.store.set(`${ENTRY_PREFIX}${OLD_ENTRY.id}`, JSON.stringify(OLD_ENTRY));
  kv.store.set(`${ENTRY_PREFIX}${NEW_ENTRY.id}`, JSON.stringify(NEW_ENTRY));
  const waited: Promise<unknown>[] = [];
  const ctx = { waitUntil: (promise: Promise<unknown>) => void waited.push(promise) };
  const env = {
    GITHUB_CLIENT_ID: 'id',
    GITHUB_CLIENT_SECRET: 'secret',
    ALLOWED_ORIGINS: ORIGIN,
    INTERVIEWS: kv as unknown as KVNamespace,
    DIARY_PASSWORD: 'secret' in overrides ? overrides.secret : PASSWORD,
    OWNER_LOGIN: OWNER,
    DIARY_ATTEMPTS: limiterOf(overrides.limiter ?? 'allow'),
    DIARY_SEEN: limiterOf(overrides.seen ?? 'allow'),
  } satisfies DiaryEnv;
  return { kv, env, ctx, waited };
}

function unlockRequest(password: unknown): Request {
  const request = new Request('https://worker.example/diary/unlock', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'cf-connecting-ip': IP, 'user-agent': UA },
    body: JSON.stringify({ password }),
  });
  Object.defineProperty(request, 'cf', { value: { city: 'Lorem City', country: 'LC' } });
  return request;
}

function ownerRequest(method: string, path: string, body?: unknown, token: string | null = 'tok'): Request {
  return new Request(`https://worker.example/diary/${path}`, {
    method,
    headers: { Origin: ORIGIN, ...(token === null ? {} : { Authorization: `Bearer ${token}` }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function seenRequest(body: unknown): Request {
  return new Request('https://worker.example/diary/seen', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'cf-connecting-ip': IP },
    body: JSON.stringify(body),
  });
}

function githubAs(login: string): typeof fetch {
  return (async () => new Response(JSON.stringify({ login }), { status: 200 })) as typeof fetch;
}

function seedVisit(kv: FakeKv, overrides: { at?: string; read?: string[] } = {}) {
  const view = { at: new Date(NOW).toISOString(), city: '', country: '', device: 'Other · Other', read: [], ...overrides };
  kv.store.set(`${VIEW_PREFIX}${VISIT_ID}`, JSON.stringify(view));
}

function readOf(kv: FakeKv): string[] {
  return (JSON.parse(kv.store.get(`${VIEW_PREFIX}${VISIT_ID}`) ?? '{}') as { read: string[] }).read;
}

describe('diary handle', () => {
  const refusals: ReadonlyArray<[string, Parameters<typeof setup>[0], unknown, number, string]> = [
    ['no limiter binding', { limiter: 'none' }, PASSWORD, 503, 'rate-limiter-unavailable'],
    ['limiter says no', { limiter: 'deny' }, PASSWORD, 429, 'too-many-tries'],
    ['no secret', { secret: '' }, PASSWORD, 503, 'not-configured'],
    ['wrong password', {}, 'nope', 401, 'wrong-password'],
    ['password not a string', {}, 42, 400, 'invalid-request'],
  ];

  it.each(refusals)('unlock refuses: %s', async (_name, options, password, status, error) => {
    const { kv, env, ctx } = setup(options);
    const response = await handle(unlockRequest(password), env, githubAs(OWNER), ctx, () => NOW);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
    expect(kv.viewKeys()).toEqual([]);
  });

  it('unlock with the right password returns visitId and entries newest first, and logs one view without the IP', async () => {
    const { kv, env, ctx } = setup();
    const response = await handle(unlockRequest(PASSWORD), env, githubAs(OWNER), ctx, () => NOW);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = (await response.json()) as { visitId: string; entries: unknown[] };
    expect(body.entries).toEqual([NEW_ENTRY, OLD_ENTRY]);

    expect(kv.viewKeys()).toEqual([`${VIEW_PREFIX}${body.visitId}`]);
    expect(body.visitId).toMatch(/^2026-11-07T12:00:00\.000Z_[0-9a-f]{32}$/);
    const stored = kv.store.get(kv.viewKeys()[0] ?? '') ?? '';
    expect(JSON.parse(stored)).toEqual({
      at: new Date(NOW).toISOString(),
      city: 'Lorem City',
      country: 'LC',
      device: 'Mac · Chrome',
      read: [],
    });
    expect(stored).not.toContain(IP);
  });

  it('views refuses a token that is not the owner', async () => {
    const { env, ctx } = setup();
    const response = await handle(ownerRequest('GET', 'views'), env, githubAs('someone-else'), ctx);
    expect(response.status).toBe(403);
  });

  it('views lists newest first across two KV pages, with the backup time', async () => {
    const { kv, env, ctx } = setup();
    const ats = ['2026-11-01T00:00:00.000Z', '2026-11-03T00:00:00.000Z', '2026-11-02T00:00:00.000Z'];
    ats.forEach((at, index) => {
      const view = { at, city: '', country: '', device: 'Other · Other', read: [] };
      kv.store.set(`${VIEW_PREFIX}${at}_${String(index).repeat(32)}`, JSON.stringify(view));
    });
    kv.store.set('diary:backup', JSON.stringify({ hash: 'h', at: '2026-11-04T00:00:00.000Z' }));
    const response = await handle(ownerRequest('GET', 'views'), env, githubAs(OWNER), ctx);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { views: Array<{ at: string }>; backupAt: string | null };
    expect(body.views.map((view) => view.at)).toEqual([...ats].sort().reverse());
    expect(body.backupAt).toBe('2026-11-04T00:00:00.000Z');
  });

  const listCases: ReadonlyArray<[string, string | null, string, number]> = [
    ['no token', null, OWNER, 401],
    ['not the owner', 'tok', 'someone-else', 403],
    ['the owner', 'tok', OWNER, 200],
  ];

  it.each(listCases)('GET entries: %s', async (_name, token, login, status) => {
    const { kv, env, ctx } = setup();
    const response = await handle(ownerRequest('GET', 'entries', undefined, token), env, githubAs(login), ctx);
    expect(response.status).toBe(status);
    if (status === 200) {
      expect(((await response.json()) as { entries: unknown[] }).entries).toEqual([NEW_ENTRY, OLD_ENTRY]);
    }
    expect(kv.viewKeys()).toEqual([]);
  });

  const validBody = { date: '2026-11-08', title: 'Dolor', body: 'Consectetur.' };
  const putCases: ReadonlyArray<[string, unknown, string, number]> = [
    ['bad date', { ...validBody, date: '2026-13-40' }, OWNER, 400],
    ['body over max', { ...validBody, body: 'x'.repeat(MAX_BODY_CHARS + 1) }, OWNER, 400],
    ['not the owner', validBody, 'someone-else', 403],
    ['the owner', validBody, OWNER, 200],
  ];

  it.each(putCases)('PUT entry: %s', async (_name, body, login, status) => {
    const { kv, env, ctx, waited } = setup();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const id = '2026-11-08-cccccc';
    const response = await handle(ownerRequest('PUT', `entries/${id}`, body), env, githubAs(login), ctx, () => NOW);
    expect(response.status).toBe(status);
    const isWritten = status === 200;
    expect(kv.store.has(`${ENTRY_PREFIX}${id}`)).toBe(isWritten);
    expect(waited).toHaveLength(isWritten ? 1 : 0);
    if (isWritten) {
      expect(JSON.parse(kv.store.get(`${ENTRY_PREFIX}${id}`) ?? '')).toEqual({
        id,
        ...validBody,
        updatedAt: new Date(NOW).toISOString(),
      });
    }
    await Promise.all(waited);
    errorLog.mockRestore();
  });

  it('DELETE entry as the owner removes the key', async () => {
    const { kv, env, ctx, waited } = setup();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handle(ownerRequest('DELETE', `entries/${OLD_ENTRY.id}`), env, githubAs(OWNER), ctx);
    expect(response.status).toBe(204);
    expect(kv.store.has(`${ENTRY_PREFIX}${OLD_ENTRY.id}`)).toBe(false);
    expect(kv.store.has(`${ENTRY_PREFIX}${NEW_ENTRY.id}`)).toBe(true);
    await Promise.all(waited);
    errorLog.mockRestore();
  });

  const seenRefusals: ReadonlyArray<[string, Parameters<typeof setup>[0], unknown, number, string]> = [
    ['malformed body', {}, { visitId: 'not-a-visit', entryIds: [] }, 400, 'invalid-request'],
    ['unknown visit', {}, { visitId: VISIT_ID, entryIds: [] }, 404, 'not-found'],
    ['limiter refusal', { seen: 'deny' }, { visitId: VISIT_ID, entryIds: [] }, 429, 'too-many-tries'],
  ];

  it.each(seenRefusals)('seen refuses: %s', async (_name, options, body, status, error) => {
    const { env, ctx } = setup(options);
    const response = await handle(seenRequest(body), env, githubAs(OWNER), ctx, () => NOW);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });

  it('seen refuses a visit older than the window', async () => {
    const { kv, env, ctx } = setup();
    seedVisit(kv, { at: new Date(NOW - (SEEN_WINDOW_HOURS + 1) * MS_PER_HOUR).toISOString() });
    const response = await handle(seenRequest({ visitId: VISIT_ID, entryIds: [] }), env, githubAs(OWNER), ctx, () => NOW);
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({ error: 'visit-expired' });
  });

  it('seen drops an unknown entry id and keeps the union with the existing read set, without duplicates', async () => {
    const { kv, env, ctx } = setup();
    seedVisit(kv, { read: [OLD_ENTRY.id] });
    const entryIds = [OLD_ENTRY.id, NEW_ENTRY.id, '2026-11-09-ffffff'];
    const response = await handle(seenRequest({ visitId: VISIT_ID, entryIds }), env, githubAs(OWNER), ctx, () => NOW);
    expect(response.status).toBe(204);
    expect(readOf(kv)).toEqual([OLD_ENTRY.id, NEW_ENTRY.id]);
  });
});
