import { describe, expect, it } from 'vitest';
import { handle, type PatternSenseEnv } from './handler';

const ORIGIN = 'https://progressiveoverflow.com';
const ENV: PatternSenseEnv = {
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: `${ORIGIN}, http://localhost:4200`,
};
const WEEK = '2026-11-30';
const VOCABULARY = 'a1b2c3';
const PATH = 'dashboard/pattern_sense_results/20261130.json';
const API = 'https://api.github.com';
const REPO_URL = `${API}/repos/alice/cse-progress`;
const CONTENTS_URL = `${REPO_URL}/contents/${PATH}`;

const RESULTS = {
  schemaVersion: 1,
  week: WEEK,
  vocabulary: VOCABULARY,
  code: `PS1 ${WEEK} ${VOCABULARY} 1:array/two-pointers`,
  submittedAt: '2026-12-01T10:00:00.000Z',
};

interface Call {
  readonly method: string;
  readonly url: string;
  readonly body: string | undefined;
}

type Script = Record<string, { status: number; body?: unknown }>;

function stubFetch(script: Script): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: init?.body as string | undefined });
    const answer = script[`${method} ${url}`] ?? { status: 599 };
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function githubScript(
  login: string,
  repo: unknown,
  contents: { status: number; body?: unknown },
): Script {
  return {
    [`GET ${API}/user`]: { status: 200, body: { login } },
    [`GET ${REPO_URL}`]: { status: 200, body: repo },
    [`GET ${CONTENTS_URL}?ref=main`]: contents,
    [`PUT ${CONTENTS_URL}`]: { status: 201, body: {} },
  };
}

function saveRequest(
  overrides: { origin?: string; path?: string; results?: unknown } = {},
): Request {
  return new Request('https://worker.example/pattern-sense/save', {
    method: 'POST',
    headers: { Origin: overrides.origin ?? ORIGIN, Authorization: 'Bearer user-token' },
    body: JSON.stringify({
      owner: 'alice',
      repo: 'cse-progress',
      branch: 'main',
      path: overrides.path ?? PATH,
      results: overrides.results ?? RESULTS,
    }),
  });
}

const ALICE_REPO = { owner: { login: 'alice', type: 'User' } };
const NEW_FILE = { status: 404 };

describe('pattern-sense handler', () => {
  it('/save refusals never write', async () => {
    const rows: Array<{
      name: string;
      request: Request;
      script: Script;
      status: number;
      error: string;
      expectedFetches?: number;
    }> = [
      {
        name: 'non-owner login',
        request: saveRequest(),
        script: githubScript('mallory', ALICE_REPO, NEW_FILE),
        status: 403,
        error: 'not-owner',
      },
      {
        name: 'collaborator with push access',
        request: saveRequest(),
        script: githubScript('mallory', { ...ALICE_REPO, permissions: { push: true } }, NEW_FILE),
        status: 403,
        error: 'not-owner',
      },
      {
        name: 'org-owned repo with matching login',
        request: saveRequest(),
        script: githubScript(
          'alice',
          { owner: { login: 'alice', type: 'Organization' } },
          NEW_FILE,
        ),
        status: 403,
        error: 'not-owner',
      },
      {
        name: 'path outside the folder',
        request: saveRequest({ path: '.github/workflows/x.json' }),
        script: {},
        status: 422,
        error: 'invalid-path',
        expectedFetches: 0,
      },
      {
        name: 'filename differs from week',
        request: saveRequest({ path: 'dashboard/pattern_sense_results/20261207.json' }),
        script: {},
        status: 422,
        error: 'invalid-path',
        expectedFetches: 0,
      },
      {
        name: 'code prefix does not match',
        request: saveRequest({
          results: { ...RESULTS, code: `PS1 ${WEEK} ffffff 1:array/two-pointers` },
        }),
        script: {},
        status: 422,
        error: 'invalid-results',
        expectedFetches: 0,
      },
      {
        name: 'week is not a Monday',
        request: saveRequest({
          results: {
            ...RESULTS,
            week: '2026-12-01',
            code: `PS1 2026-12-01 ${VOCABULARY} 1:array/two-pointers`,
          },
        }),
        script: {},
        status: 422,
        error: 'invalid-results',
        expectedFetches: 0,
      },
      {
        name: 'disallowed origin',
        request: saveRequest({ origin: 'https://evil.example' }),
        script: {},
        status: 403,
        error: 'origin-not-allowed',
        expectedFetches: 0,
      },
    ];

    for (const row of rows) {
      const { fetchImpl, calls } = stubFetch(row.script);
      const response = await handle(row.request, ENV, fetchImpl);
      expect(response.status, row.name).toBe(row.status);
      expect(await response.json(), row.name).toEqual({ error: row.error });
      expect(
        calls.filter((call) => call.method === 'PUT'),
        `${row.name}: no PUT`,
      ).toHaveLength(0);
      if (row.expectedFetches !== undefined) {
        expect(calls, `${row.name}: fetch count`).toHaveLength(row.expectedFetches);
      }
    }
  });

  it('/save writes the results file, sending the existing sha', async () => {
    const { fetchImpl, calls } = stubFetch(
      githubScript('alice', ALICE_REPO, { status: 200, body: { sha: 'abc123' } }),
    );
    const response = await handle(saveRequest(), ENV, fetchImpl);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const put = calls.find((call) => call.method === 'PUT');
    expect(put?.url).toBe(CONTENTS_URL);
    const body = JSON.parse(put?.body ?? '{}');
    expect(body.branch).toBe('main');
    expect(body.message).toBe(`chore(pattern-sense): results for ${WEEK}`);
    expect(body.sha).toBe('abc123');
    expect(Buffer.from(body.content, 'base64').toString('utf8')).toBe(
      `${JSON.stringify(RESULTS, null, 2)}\n`,
    );
  });
});
