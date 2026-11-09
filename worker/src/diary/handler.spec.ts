import { describe, expect, it, vi } from 'vitest';
import {
  ENTRY_PREFIX,
  handle,
  MAX_BODY_CHARS,
  SEEN_WINDOW_HOURS,
  VIEW_PREFIX,
  type DiaryEnv,
} from './handler';
import { VISIT_PREFIX } from './store';

const ORIGIN = 'https://progressiveoverflow.com';
const PASSWORD = 'placeholder-password';
const IP = '203.0.113.7';
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const MS_PER_HOUR = 3_600_000;
const KV_PAGE_SIZE = 2;
const SECONDS_PER_HOUR = 3_600;
const OWNER = 'michael-yrao';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
const VISIT_ID = `${new Date(NOW).toISOString()}_${'a'.repeat(32)}`;
const OLD_ENTRY = { id: 'lorem', date: '2026-11-01', title: 'Lorem', body: 'Dolor.', updatedAt: 'u1' };
const NEW_ENTRY = { id: 'ipsum', date: '2026-11-05', title: 'Ipsum', body: 'Sit amet.', updatedAt: 'u2' };

class FakeKv {
  readonly store = new Map<string, string>();
  async get(key: string, type?: string) {
    const raw = this.store.get(key) ?? null;
    return raw !== null && type === 'json' ? (JSON.parse(raw) as unknown) : raw;
  }
  readonly ttls = new Map<string, number>();
  async put(key: string, value: string, options?: { expirationTtl?: number }) {
    this.store.set(key, value);
    if (options?.expirationTtl !== undefined) this.ttls.set(key, options.expirationTtl);
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
  visitKeys(): string[] {
    return [...this.store.keys()].filter((key) => key.startsWith(VISIT_PREFIX));
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

function seedVisit(kv: FakeKv, at = new Date(NOW).toISOString()) {
  kv.store.set(`${VISIT_PREFIX}${VISIT_ID}`, JSON.stringify({ at }));
}

function seedView(kv: FakeKv, read: string[]) {
  const view = { at: new Date(NOW).toISOString(), city: '', country: '', device: 'Other · Other', read };
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

  it('unlock with the right password returns visitId and entries newest first, and logs no view', async () => {
    const { kv, env, ctx } = setup();
    const response = await handle(unlockRequest(PASSWORD), env, githubAs(OWNER), ctx, () => NOW);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = (await response.json()) as { visitId: string; entries: unknown[] };
    expect(body.entries).toEqual([NEW_ENTRY, OLD_ENTRY]);
    expect(body.visitId).toMatch(/^2026-11-07T12:00:00\.000Z_[0-9a-f]{32}$/);

    expect(kv.viewKeys()).toEqual([]);
    const visitKey = `${VISIT_PREFIX}${body.visitId}`;
    expect(kv.visitKeys()).toEqual([visitKey]);
    expect(JSON.parse(kv.store.get(visitKey) ?? '')).toEqual({ at: new Date(NOW).toISOString() });
    expect(kv.ttls.get(visitKey)).toBe(SEEN_WINDOW_HOURS * SECONDS_PER_HOUR);
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
      const view = { at, city: '', country: '', device: 'Other · Other', read: [OLD_ENTRY.id] };
      kv.store.set(`${VIEW_PREFIX}${at}_${String(index).repeat(32)}`, JSON.stringify(view));
    });
    kv.store.set('diary:backup', JSON.stringify({ hash: 'h', at: '2026-11-04T00:00:00.000Z' }));
    const emptyAt = '2026-11-05T00:00:00.000Z';
    const empty = { at: emptyAt, city: '', country: '', device: 'Other · Other', read: [] };
    kv.store.set(`${VIEW_PREFIX}${emptyAt}_${'9'.repeat(32)}`, JSON.stringify(empty));
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

  // Keeps the slug of OLD_ENTRY's title, so a PUT stays on the same id.
  const validBody = { date: '2026-11-08', title: 'Lorem', body: 'Consectetur.' };
  const putCases: ReadonlyArray<[string, unknown, string, number]> = [
    ['bad date', { ...validBody, date: '2026-13-40' }, OWNER, 400],
    ['body over max', { ...validBody, body: 'x'.repeat(MAX_BODY_CHARS + 1) }, OWNER, 400],
    ['not the owner', validBody, 'someone-else', 403],
    ['the owner keeps the id', validBody, OWNER, 200],
  ];

  it.each(putCases)('PUT entry: %s', async (_name, body, login, status) => {
    const { kv, env, ctx, waited } = setup();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const key = `${ENTRY_PREFIX}${OLD_ENTRY.id}`;
    const response = await handle(ownerRequest('PUT', `entries/${OLD_ENTRY.id}`, body), env, githubAs(login), ctx, () => NOW);
    expect(response.status).toBe(status);
    const isWritten = status === 200;
    expect(waited).toHaveLength(isWritten ? 1 : 0);
    const stored: unknown = JSON.parse(kv.store.get(key) ?? '');
    expect(stored).toEqual(
      isWritten ? { id: OLD_ENTRY.id, ...validBody, updatedAt: new Date(NOW).toISOString() } : OLD_ENTRY,
    );
    await Promise.all(waited);
    errorLog.mockRestore();
  });

  it('PUT of an unknown id is 404 and writes nothing', async () => {
    const { kv, env, ctx } = setup();
    const before = kv.store.size;
    const response = await handle(ownerRequest('PUT', 'entries/no-such-entry', validBody), env, githubAs(OWNER), ctx);
    expect(response.status).toBe(404);
    expect(kv.store.size).toBe(before);
  });

  it('POST creates the entry under the slug of its title, and refuses a taken title with nothing written', async () => {
    const { kv, env, ctx } = setup();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const created = await handle(ownerRequest('POST', 'entries', { ...validBody, title: 'Dolor Sit!' }), env, githubAs(OWNER), ctx, () => NOW);
    expect(created.status).toBe(200);
    expect(((await created.json()) as { entry: { id: string } }).entry.id).toBe('dolor-sit');
    expect(kv.store.has(`${ENTRY_PREFIX}dolor-sit`)).toBe(true);

    const before = new Map(kv.store);
    const taken = await handle(ownerRequest('POST', 'entries', { ...validBody, title: 'LOREM' }), env, githubAs(OWNER), ctx, () => NOW);
    expect(taken.status).toBe(409);
    expect(await taken.json()).toEqual({ error: 'title-taken' });
    expect(kv.store).toEqual(before);
    errorLog.mockRestore();
  });

  it('PUT with a new title moves the key, rewrites the views that read it and deletes the old key', async () => {
    const { kv, env, ctx, waited } = setup();
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    seedView(kv, [OLD_ENTRY.id, NEW_ENTRY.id]);
    const body = { ...validBody, title: 'Dolor' };
    const response = await handle(ownerRequest('PUT', `entries/${OLD_ENTRY.id}`, body), env, githubAs(OWNER), ctx, () => NOW);
    expect(response.status).toBe(200);
    expect(((await response.json()) as { entry: { id: string } }).entry.id).toBe('dolor');
    expect(kv.store.has(`${ENTRY_PREFIX}dolor`)).toBe(true);
    expect(kv.store.has(`${ENTRY_PREFIX}${OLD_ENTRY.id}`)).toBe(false);
    expect(readOf(kv)).toEqual(['dolor', NEW_ENTRY.id]);
    await Promise.all(waited);
    errorLog.mockRestore();
  });

  it('PUT onto a title another entry holds is 409 and changes neither entry', async () => {
    const { kv, env, ctx } = setup();
    const before = new Map(kv.store);
    const body = { ...validBody, title: 'Ipsum' };
    const response = await handle(ownerRequest('PUT', `entries/${OLD_ENTRY.id}`, body), env, githubAs(OWNER), ctx, () => NOW);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'title-taken' });
    expect(kv.store).toEqual(before);
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

  const validSeen = { visitId: VISIT_ID, entryId: OLD_ENTRY.id };
  const EXPIRED_AT = new Date(NOW - (SEEN_WINDOW_HOURS + 1) * MS_PER_HOUR).toISOString();
  const seenRefusals: ReadonlyArray<
    [string, Parameters<typeof setup>[0], string | null, unknown, number, string]
  > = [
    ['malformed body', {}, null, { visitId: 'not-a-visit', entryId: OLD_ENTRY.id }, 400, 'invalid-request'],
    ['limiter refusal', { seen: 'deny' }, null, validSeen, 429, 'too-many-tries'],
    ['unknown visit', {}, null, validSeen, 404, 'not-found'],
    ['unknown entry id', {}, new Date(NOW).toISOString(), { ...validSeen, entryId: 'unknown-entry' }, 404, 'not-found'],
    ['expired visit', {}, EXPIRED_AT, validSeen, 410, 'visit-expired'],
  ];

  it.each(seenRefusals)('seen refuses: %s', async (_name, options, visitAt, body, status, error) => {
    const { kv, env, ctx } = setup(options);
    if (visitAt !== null) seedVisit(kv, visitAt);
    const response = await handle(seenRequest(body), env, githubAs(OWNER), ctx, () => NOW);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
    expect(kv.viewKeys()).toEqual([]);
  });

  it('two seen calls for the same entry write two rows, each reading that entry', async () => {
    const { kv, env, ctx } = setup();
    seedVisit(kv);
    const openEntry = () => handle(seenRequest(validSeen), env, githubAs(OWNER), ctx, () => NOW);
    expect((await openEntry()).status).toBe(204);
    expect((await openEntry()).status).toBe(204);
    const rows = kv.viewKeys().map((key) => JSON.parse(kv.store.get(key) ?? '') as { read: string[] });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.read)).toEqual([[OLD_ENTRY.id], [OLD_ENTRY.id]]);
  });
});
