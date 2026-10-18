import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handle } from './handler';
import type { PatternSenseEnv } from '../pattern-sense/handler';

const ORIGIN = 'https://progressiveoverflow.com';
const ENV: PatternSenseEnv = {
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: `${ORIGIN}, http://localhost:4200`,
};
const EXCHANGE = 'POST https://github.com/login/oauth/access_token';
const USER = 'GET https://api.github.com/user';
const NOW = Date.parse('2026-10-18T12:00:00.000Z');
const EXPIRES_IN_SECONDS = 28800;
const REFRESH_EXPIRES_IN_SECONDS = 15811200;
const EXPECTED_SHAPE = {
  token: 'new-token',
  login: 'alice',
  expiresAt: new Date(NOW + EXPIRES_IN_SECONDS * 1000).toISOString(),
  refreshToken: 'new-refresh',
  refreshExpiresAt: new Date(NOW + REFRESH_EXPIRES_IN_SECONDS * 1000).toISOString(),
};
const GITHUB_GRANT = {
  access_token: 'new-token',
  expires_in: EXPIRES_IN_SECONDS,
  refresh_token: 'new-refresh',
  refresh_token_expires_in: REFRESH_EXPIRES_IN_SECONDS,
};

type Script = Record<string, { status: number; body?: unknown }>;

function stubFetch(script: Script): { fetchImpl: typeof fetch; calls: string[] } {
  const calls: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`;
    calls.push(key);
    const answer = script[key] ?? { status: 599 };
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function authRequest(path: string, body: unknown): Request {
  return new Request(`https://worker.example/auth/${path}`, {
    method: 'POST',
    headers: { Origin: ORIGIN },
    body: JSON.stringify(body),
  });
}

describe('auth handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('/token and /refresh succeed with the full shape', async () => {
    const rows = [
      { name: 'token', path: 'token', body: { code: 'one-time' } },
      { name: 'refresh', path: 'refresh', body: { refreshToken: 'old-refresh' } },
    ];
    for (const row of rows) {
      const { fetchImpl } = stubFetch({
        [EXCHANGE]: { status: 200, body: GITHUB_GRANT },
        [USER]: { status: 200, body: { login: 'alice' } },
      });
      const response = await handle(authRequest(row.path, row.body), ENV, fetchImpl);

      expect(response.status, row.name).toBe(200);
      expect(await response.json(), row.name).toEqual(EXPECTED_SHAPE);
    }
  });

  it('/token and /refresh without their input are refused before any fetch', async () => {
    const rows = [
      { name: 'token without code', path: 'token', body: {}, error: 'missing-code' },
      {
        name: 'refresh without refreshToken',
        path: 'refresh',
        body: {},
        error: 'missing-refresh-token',
      },
      {
        name: 'refresh with non-string refreshToken',
        path: 'refresh',
        body: { refreshToken: 7 },
        error: 'missing-refresh-token',
      },
      {
        name: 'refresh with empty refreshToken',
        path: 'refresh',
        body: { refreshToken: '' },
        error: 'missing-refresh-token',
      },
    ];
    for (const row of rows) {
      const { fetchImpl, calls } = stubFetch({});
      const response = await handle(authRequest(row.path, row.body), ENV, fetchImpl);

      expect(response.status, row.name).toBe(400);
      expect(await response.json(), row.name).toEqual({ error: row.error });
      expect(calls, row.name).toHaveLength(0);
    }
  });

  it('/refresh with a token GitHub rejects returns an error and no token', async () => {
    const { fetchImpl } = stubFetch({
      [EXCHANGE]: { status: 200, body: { error: 'bad_refresh_token' } },
    });
    const response = await handle(
      authRequest('refresh', { refreshToken: 'stale' }),
      ENV,
      fetchImpl,
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'exchange-failed' });
  });
});
