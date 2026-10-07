import { describe, expect, it, vi } from 'vitest';
import { BODY_MAX_BYTES } from './contract';
import {
  CANDIDATE_REFRESH_MS,
  INTERVIEW_TTL_SECONDS,
  createInterviewHandler,
  type KvStore,
  type LimitBucket,
} from './handler';

const ID = 'A'.repeat(32);
const OTHER_ID = 'F'.repeat(32);
const CANDIDATE = 'B'.repeat(32);
const KEY = 'K'.repeat(87);
const IV = 'C'.repeat(16);
const TOKEN = 'D'.repeat(43);
const OTHER_TOKEN = 'E'.repeat(43);
const START = Date.UTC(2026, 9, 5);
const BASE = 'https://api.example/interviews';

class FakeKv implements KvStore {
  readonly store = new Map<string, string>();
  readonly ttls = new Map<string, number>();
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string, options: { expirationTtl: number }) {
    this.store.set(key, value);
    this.ttls.set(key, options.expirationTtl);
  }
  async delete(key: string) {
    this.store.delete(key);
  }
}

function setup(options: { isLimited?: boolean } = {}) {
  const kv = new FakeKv();
  const clock = { now: START };
  const limited: LimitBucket[] = [];
  const handler = createInterviewHandler({
    kv,
    now: () => clock.now,
    limit: async (bucket) => {
      limited.push(bucket);
      return !options.isLimited;
    },
  });
  const seen: Array<{ status: number; body: string; cache: string | null }> = [];
  async function send(path: string, init: RequestInit = {}, token?: string) {
    const headers = new Headers(init.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await handler.handle(new Request(`${BASE}${path}`, { ...init, headers }));
    const body = await response.clone().text();
    seen.push({ status: response.status, body, cache: response.headers.get('Cache-Control') });
    return { response, body };
  }
  return { kv, clock, limited, send, seen };
}

function putInit(overrides: Record<string, unknown> = {}): RequestInit {
  const body = { v: 1, rev: 1, candidateId: CANDIDATE, publicRaw: KEY, iv: IV, ciphertext: 'abc', ...overrides };
  return { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

async function seeded() {
  const ctx = setup();
  await ctx.send(`/i/${ID}`, putInit({ rev: 5 }), TOKEN);
  return ctx;
}

describe('interview handler', () => {
  it('answers a preflight with CORS headers for the allowed methods and headers', async () => {
    const { send } = setup();
    const { response } = await send(`/i/${ID}`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:4200' } });
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4200');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, PUT, DELETE, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
  });

  it('answers a wrong method with 405 and Allow, an unknown path with 404', async () => {
    const { send } = setup();
    const post = await send(`/i/${ID}`, { method: 'POST' });
    expect(post.response.status).toBe(405);
    expect(post.response.headers.get('Allow')).toBe('GET, PUT, DELETE, OPTIONS');
    const put = await send(`/c/${CANDIDATE}`, { method: 'PUT' });
    expect(put.response.status).toBe(405);
    expect(put.response.headers.get('Allow')).toBe('GET, OPTIONS');
    expect((await send(`/x/${ID}`)).response.status).toBe(404);
  });

  it('serves a candidate record, 404 when absent, 400 for a bad id', async () => {
    const { send } = await seeded();
    const found = await send(`/c/${CANDIDATE}`);
    expect(found.response.status).toBe(200);
    expect(JSON.parse(found.body)).toEqual({ v: 1, publicRaw: KEY });
    expect((await send(`/c/${OTHER_ID}`)).response.status).toBe(404);
    expect((await send('/c/short')).response.status).toBe(400);
  });

  it('serves an interviewer record, 404 when absent, 410 once deleted', async () => {
    const { send } = await seeded();
    const found = await send(`/i/${ID}`);
    expect(found.response.status).toBe(200);
    expect(JSON.parse(found.body)).toEqual({ v: 1, rev: 5, iv: IV, ciphertext: 'abc' });
    expect((await send(`/i/${OTHER_ID}`)).response.status).toBe(404);
    await send(`/i/${ID}`, { method: 'DELETE' }, TOKEN);
    const gone = await send(`/i/${ID}`);
    expect(gone.response.status).toBe(410);
    expect(JSON.parse(gone.body)).toEqual({ error: 'deleted' });
  });

  it('creates with 201, writing both records with the TTL', async () => {
    const { kv, clock, send } = setup();
    const { response, body } = await send(`/i/${ID}`, putInit(), TOKEN);
    expect(response.status).toBe(201);
    expect(JSON.parse(body)).toEqual({ rev: 1 });
    expect(JSON.parse(kv.store.get(`c:${CANDIDATE}`) ?? '')).toEqual({ v: 1, publicRaw: KEY, owner: ID });
    expect(JSON.parse(kv.store.get(`i:${ID}`) ?? '')).toMatchObject({ rev: 1, candidateId: CANDIDATE, cWrittenAt: clock.now });
    expect(kv.ttls.get(`c:${CANDIDATE}`)).toBe(INTERVIEW_TTL_SECONDS);
    expect(kv.ttls.get(`i:${ID}`)).toBe(INTERVIEW_TTL_SECONDS);
  });

  it('updates with 200 for the right token', async () => {
    const { send } = await seeded();
    const { response, body } = await send(`/i/${ID}`, putInit({ rev: 6, ciphertext: 'new' }), TOKEN);
    expect(response.status).toBe(200);
    expect(JSON.parse(body)).toEqual({ rev: 6 });
  });

  it('rejects a missing token with 401 and a wrong token with 403', async () => {
    const { send } = await seeded();
    expect((await send(`/i/${ID}`, putInit({ rev: 6 }))).response.status).toBe(401);
    expect((await send(`/i/${ID}`, putInit({ rev: 6 }), OTHER_TOKEN)).response.status).toBe(403);
  });

  it('answers stale, with the stored rev, for rev below and equal to it', async () => {
    const { send } = await seeded();
    for (const rev of [4, 5]) {
      const { response, body } = await send(`/i/${ID}`, putInit({ rev }), TOKEN);
      expect(response.status).toBe(409);
      expect(JSON.parse(body)).toEqual({ error: 'stale', rev: 5 });
    }
  });

  it('answers candidate-taken when another interviewer owns the candidate id', async () => {
    const { send } = await seeded();
    const { response, body } = await send(`/i/${OTHER_ID}`, putInit(), OTHER_TOKEN);
    expect(response.status).toBe(409);
    expect(JSON.parse(body)).toEqual({ error: 'candidate-taken' });
  });

  it('answers immutable for a changed candidateId or publicRaw', async () => {
    const { send } = await seeded();
    for (const change of [{ candidateId: OTHER_ID }, { publicRaw: 'Z'.repeat(87) }]) {
      const { response, body } = await send(`/i/${ID}`, putInit({ rev: 6, ...change }), TOKEN);
      expect(response.status).toBe(409);
      expect(JSON.parse(body)).toEqual({ error: 'immutable' });
    }
  });

  it('answers 410 to a PUT on the deleted marker', async () => {
    const { send } = await seeded();
    await send(`/i/${ID}`, { method: 'DELETE' }, TOKEN);
    expect((await send(`/i/${ID}`, putInit({ rev: 9 }), TOKEN)).response.status).toBe(410);
  });

  it('answers 413 by Content-Length and by bytes read with no header', async () => {
    const { send } = setup();
    const declared = await send(
      `/i/${ID}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': String(BODY_MAX_BYTES + 1) }, body: '{}' },
      TOKEN,
    );
    expect(declared.response.status).toBe(413);
    const oversized = new Uint8Array(BODY_MAX_BYTES + 1).fill(32);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(oversized);
        controller.close();
      },
    });
    const streamed = await send(
      `/i/${ID}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: stream, duplex: 'half' } as RequestInit,
      TOKEN,
    );
    expect(streamed.response.status).toBe(413);
  });

  it('answers 415 for a non-JSON content type', async () => {
    const { send } = setup();
    const { response } = await send(`/i/${ID}`, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: '{}' }, TOKEN);
    expect(response.status).toBe(415);
  });

  it('answers 429 with Retry-After when limited, and never limits when the limiter allows', async () => {
    const limited = setup({ isLimited: true });
    const { response } = await limited.send(`/c/${CANDIDATE}`);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    const open = setup();
    expect((await open.send(`/c/${CANDIDATE}`)).response.status).toBe(404);
  });

  it('deletes: writes the marker, removes c:, 403, 404, and a second DELETE is 204', async () => {
    const { kv, send } = await seeded();
    expect((await send(`/i/${ID}`, { method: 'DELETE' }, OTHER_TOKEN)).response.status).toBe(403);
    expect((await send(`/i/${OTHER_ID}`, { method: 'DELETE' }, TOKEN)).response.status).toBe(404);
    expect((await send(`/i/${ID}`, { method: 'DELETE' }, TOKEN)).response.status).toBe(204);
    expect(kv.store.has(`c:${CANDIDATE}`)).toBe(false);
    expect(JSON.parse(kv.store.get(`i:${ID}`) ?? '')).toMatchObject({ v: 1, deleted: true });
    expect(kv.ttls.get(`i:${ID}`)).toBe(INTERVIEW_TTL_SECONDS);
    expect((await send(`/i/${ID}`, { method: 'DELETE' }, TOKEN)).response.status).toBe(204);
  });

  it('rewrites the candidate record only after the refresh window', async () => {
    const { kv, clock, send } = await seeded();
    kv.ttls.delete(`c:${CANDIDATE}`);
    clock.now += CANDIDATE_REFRESH_MS;
    await send(`/i/${ID}`, putInit({ rev: 6 }), TOKEN);
    expect(kv.ttls.has(`c:${CANDIDATE}`)).toBe(false);
    clock.now += 1;
    await send(`/i/${ID}`, putInit({ rev: 7 }), TOKEN);
    expect(kv.ttls.get(`c:${CANDIDATE}`)).toBe(INTERVIEW_TTL_SECONDS);
  });

  it('marks every response no-store and leaks no tokenHash, owner or candidateId', async () => {
    const { send, seen } = await seeded();
    await send(`/c/${CANDIDATE}`);
    await send(`/i/${ID}`);
    await send(`/i/${ID}`, putInit({ rev: 1 }), TOKEN);
    await send(`/i/${ID}`, putInit({ rev: 9 }), OTHER_TOKEN);
    await send(`/i/${ID}`, { method: 'DELETE' }, TOKEN);
    await send(`/i/${ID}`);
    expect(seen.length).toBeGreaterThan(5);
    for (const { body, cache } of seen) {
      expect(cache).toBe('no-store');
      expect(body).not.toMatch(/tokenHash|owner|candidateId/);
    }
  });

  it('turns an unexpected error into a 500 that still carries CORS and no-store', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const kv = new FakeKv();
    kv.get = async () => {
      throw new Error('boom');
    };
    const handler = createInterviewHandler({ kv, now: () => START, limit: async () => true });
    const response = await handler.handle(
      new Request(`${BASE}/i/${ID}`, { headers: { Origin: 'http://localhost:4200' } }),
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'internal' });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4200');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
