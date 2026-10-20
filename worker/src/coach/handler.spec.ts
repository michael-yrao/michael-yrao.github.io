import { describe, expect, it } from 'vitest';
import { LimiterUnavailableError } from '../interviews/handler';
import { COACH_TOKEN_HEADER } from './contract';
import { handle, type CoachStub, type CoachWiring } from './handler';

const ORIGIN = 'https://progressiveoverflow.com';
const OWNER_LOGIN = 'michael-yrao';
const ENV = {
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: ORIGIN,
};
const SSE_BODY = 'event: text\ndata: {"type":"text","delta":"Hi"}\n\n';
const MESSAGE = { sessionId: null, message: 'hi', context: { route: '/practice/1', repo: 'cse-progress' } };

interface Rig {
  readonly deps: CoachWiring;
  readonly stubFetches: Request[];
  readonly githubCalls: string[];
  readonly fetchImpl: typeof fetch;
}

function rig(options: { login?: string; state?: string; limit?: () => Promise<boolean> } = {}): Rig {
  const stubFetches: Request[] = [];
  const githubCalls: string[] = [];
  const stub: CoachStub = {
    fetch: async (request) => {
      stubFetches.push(request);
      return new Response(SSE_BODY, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    },
    getState: async () => ({ status: options.state ?? 'healthy' }),
  };
  const fetchImpl = (async (input: string | URL | Request) => {
    githubCalls.push(String(input));
    return new Response(JSON.stringify({ login: options.login ?? 'michael-yrao' }), { status: 200 });
  }) as typeof fetch;
  return {
    deps: { stub, limit: options.limit ?? (async () => true), ownerLogin: OWNER_LOGIN },
    stubFetches,
    githubCalls,
    fetchImpl,
  };
}

function req(path: string, init: { method?: string; origin?: string | null; bearer?: boolean; body?: unknown } = {}): Request {
  const headers: Record<string, string> = {};
  if (init.origin !== null) headers['Origin'] = init.origin ?? ORIGIN;
  if (init.bearer !== false) headers['Authorization'] = 'Bearer tok-test';
  return new Request(`https://worker.example${path}`, {
    method: init.method ?? 'POST',
    headers,
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
}

describe('coach handle', () => {
  const refusals: ReadonlyArray<[string, string, Parameters<typeof req>[1], Parameters<typeof rig>[0], number, string]> = [
    ['an origin that is not allowed', '/coach/message', { origin: 'https://evil.example', body: MESSAGE }, {}, 403, 'origin-not-allowed'],
    ['a request with no bearer token', '/coach/message', { bearer: false, body: MESSAGE }, {}, 401, 'bad-token'],
    ['a rate-limited request', '/coach/message', { body: MESSAGE }, { limit: async () => false }, 429, 'rate-limited'],
    [
      'a missing limiter binding',
      '/coach/message',
      { body: MESSAGE },
      { limit: async () => { throw new LimiterUnavailableError(); } },
      503,
      'rate-limiter-unavailable',
    ],
    ['a login that is not the owner', '/coach/message', { body: MESSAGE }, { login: 'someone-else' }, 403, 'not-owner'],
    ['an unknown route', '/coach/nope', { body: MESSAGE }, {}, 404, 'not-found'],
  ];

  it.each(refusals)('refuses %s', async (_name, path, init, options, status, error) => {
    const { deps, stubFetches, fetchImpl, githubCalls } = rig(options);
    const response = await handle(req(path, init), ENV, fetchImpl, deps);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
    expect(stubFetches).toHaveLength(0);
    if (status === 429 || status === 503) expect(githubCalls).toHaveLength(0);
  });

  it('answers the preflight with the GET and POST methods', async () => {
    const { deps, fetchImpl } = rig();
    const response = await handle(req('/coach/message', { method: 'OPTIONS' }), ENV, fetchImpl, deps);
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS');
  });

  it('reports a sleeping container as asleep without touching the stub', async () => {
    const { deps, stubFetches, fetchImpl } = rig({ state: 'stopped' });
    const response = await handle(req('/coach/status', { method: 'GET' }), ENV, fetchImpl, deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ awake: false, busy: false, sessionId: null, repoHead: null });
    expect(stubFetches).toHaveLength(0);
  });

  it('streams a message through with only the token header added upstream', async () => {
    const { deps, stubFetches, fetchImpl } = rig();
    const response = await handle(req('/coach/message', { body: MESSAGE }), ENV, fetchImpl, deps);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(await response.text()).toBe(SSE_BODY);

    const upstream = stubFetches[0];
    expect(upstream?.headers.get(COACH_TOKEN_HEADER)).toBe('tok-test');
    expect(upstream?.headers.get('Authorization')).toBeNull();
    expect(await upstream?.json()).toEqual(MESSAGE);
  });
});
