import { describe, expect, it } from 'vitest';
import { handle, STORY_KEY, VIEW_PREFIX, type YaoEnv } from './handler';

const ORIGIN = 'https://progressiveoverflow.com';
const PASSWORD = 'placeholder-password';
const STORY = { title: 'Lorem', chapters: [{ heading: 'Ipsum', paragraphs: ['Dolor sit amet.'] }] };
const IP = '203.0.113.7';
const NOW = Date.UTC(2026, 10, 7, 12, 0, 0);
const KV_PAGE_SIZE = 2;
const OWNER = 'michael-yrao';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

class FakeKv {
  readonly store = new Map<string, string>();
  async get(key: string, type?: string) {
    const raw = this.store.get(key) ?? null;
    return raw !== null && type === 'json' ? (JSON.parse(raw) as unknown) : raw;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
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

function setup(overrides: { limiter?: 'none' | 'deny' | 'allow'; secret?: string } = {}) {
  const kv = new FakeKv();
  kv.store.set(STORY_KEY, JSON.stringify(STORY));
  const limiter = overrides.limiter ?? 'allow';
  const env = {
    GITHUB_CLIENT_ID: 'id',
    GITHUB_CLIENT_SECRET: 'secret',
    ALLOWED_ORIGINS: ORIGIN,
    INTERVIEWS: kv as unknown as KVNamespace,
    YAO_PASSWORD: 'secret' in overrides ? overrides.secret : PASSWORD,
    OWNER_LOGIN: OWNER,
    ...(limiter === 'none' ? {} : { YAO_ATTEMPTS: { limit: async () => ({ success: limiter === 'allow' }) } }),
  } satisfies YaoEnv;
  return { kv, env };
}

function unlockRequest(password: unknown): Request {
  const request = new Request('https://worker.example/yao/unlock', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'cf-connecting-ip': IP, 'user-agent': UA },
    body: JSON.stringify({ password }),
  });
  Object.defineProperty(request, 'cf', { value: { city: 'Lorem City', country: 'LC' } });
  return request;
}

function viewsRequest(): Request {
  return new Request('https://worker.example/yao/views', {
    headers: { Origin: ORIGIN, Authorization: 'Bearer tok' },
  });
}

function githubAs(login: string): typeof fetch {
  return (async () => new Response(JSON.stringify({ login }), { status: 200 })) as typeof fetch;
}

describe('yao handle', () => {
  const refusals: ReadonlyArray<[string, Parameters<typeof setup>[0], unknown, number, string]> = [
    ['no limiter binding', { limiter: 'none' }, PASSWORD, 503, 'rate-limiter-unavailable'],
    ['limiter says no', { limiter: 'deny' }, PASSWORD, 429, 'too-many-tries'],
    ['no secret', { secret: '' }, PASSWORD, 503, 'not-configured'],
    ['wrong password', {}, 'nope', 401, 'wrong-password'],
    ['password not a string', {}, 42, 400, 'invalid-request'],
  ];

  it.each(refusals)('unlock refuses: %s', async (_name, options, password, status, error) => {
    const { kv, env } = setup(options);
    const response = await handle(unlockRequest(password), env, githubAs(OWNER), () => NOW);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
    expect(kv.viewKeys()).toEqual([]);
  });

  it('unlock with the right password returns the story and logs one view without the IP', async () => {
    const { kv, env } = setup();
    const response = await handle(unlockRequest(PASSWORD), env, githubAs(OWNER), () => NOW);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual(STORY);

    const keys = kv.viewKeys();
    expect(keys).toHaveLength(1);
    const stored = kv.store.get(keys[0] ?? '') ?? '';
    expect(JSON.parse(stored)).toEqual({
      at: new Date(NOW).toISOString(),
      city: 'Lorem City',
      country: 'LC',
      device: 'Mac · Chrome',
    });
    expect(stored).not.toContain(IP);
  });

  it('views refuses a token that is not the owner', async () => {
    const { env } = setup();
    const response = await handle(viewsRequest(), env, githubAs('someone-else'));
    expect(response.status).toBe(403);
  });

  it('views lists newest first across two KV pages', async () => {
    const { kv, env } = setup();
    const ats = ['2026-11-01T00:00:00.000Z', '2026-11-03T00:00:00.000Z', '2026-11-02T00:00:00.000Z'];
    ats.forEach((at, index) => {
      const view = { at, city: '', country: '', device: 'Other · Other' };
      kv.store.set(`${VIEW_PREFIX}${at}:00000${index}`, JSON.stringify(view));
    });
    const response = await handle(viewsRequest(), env, githubAs(OWNER));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { views: Array<{ at: string }> };
    expect(body.views.map((view) => view.at)).toEqual([...ats].sort().reverse());
  });
});
