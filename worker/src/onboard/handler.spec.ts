import { describe, expect, it } from 'vitest';
import { handle, READY_ATTEMPTS, type OnboardEnv } from './handler';

const ORIGIN = 'https://progressiveoverflow.com';
const ENV: OnboardEnv = {
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: ORIGIN,
  TEMPLATE_OWNER: 'michael-yrao',
  TEMPLATE_REPO: 'cse-coach',
};
const API = 'https://api.github.com';
const USER_URL = `${API}/user`;
const REPO_URL = `${API}/repos/alice/cse-progress`;
const MANIFEST_URL = `${REPO_URL}/contents/dashboard/manifest.json`;
const EXAMPLE_URL = `${REPO_URL}/contents/cse.config.example.yml`;
const GENERATE_URL = `${API}/repos/michael-yrao/cse-coach/generate`;
const OWNER = { login: 'alice', type: 'User' };
const COACH_REPO = {
  full_name: 'alice/cse-progress',
  owner: OWNER,
  template_repository: { full_name: 'michael-yrao/cse-coach' },
};
const PLAIN_REPO = { full_name: 'alice/cse-progress', owner: OWNER };
const RENAMED_REPO = { ...COACH_REPO, full_name: 'bob/cse-progress' };

interface Answer {
  readonly status: number;
  readonly body?: unknown;
  readonly headers?: Record<string, string>;
}
type Script = Record<string, Answer | readonly Answer[]>;

interface Call {
  readonly method: string;
  readonly url: string;
  readonly body: string | undefined;
}

function stubFetch(script: Script): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const seen: Record<string, number> = {};
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const key = `${method} ${url}`;
    calls.push({ method, url, body: init?.body as string | undefined });
    const entry = script[key];
    const answers = entry === undefined ? [{ status: 599 }] : [entry].flat();
    const index = Math.min(seen[key] ?? 0, answers.length - 1);
    seen[key] = (seen[key] ?? 0) + 1;
    const answer = answers[index] as Answer;
    return new Response(JSON.stringify(answer.body ?? {}), {
      status: answer.status,
      headers: answer.headers,
    });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

interface RequestOptions {
  readonly origin?: string;
  readonly hasBearer?: boolean;
  readonly method?: string;
}

function onboardRequest(options: RequestOptions = {}): Request {
  const { origin = ORIGIN, hasBearer = true, method = 'POST' } = options;
  const headers: Record<string, string> = { Origin: origin };
  if (hasBearer) headers['Authorization'] = 'Bearer user-token';
  return new Request('https://worker.example/onboard/dsa', { method, headers });
}

const signedIn: Script = { [`GET ${USER_URL}`]: { status: 200, body: { login: 'alice' } } };
const noop = async (): Promise<void> => {};

interface Row {
  readonly name: string;
  readonly script: Script;
  readonly request?: RequestOptions;
  readonly status: number;
  readonly body: unknown;
  readonly manifestGets?: number;
}

const created = (ready: boolean) => ({
  status: 'created',
  owner: 'alice',
  repo: 'cse-progress',
  ready,
});
const adopted = (ready: boolean) => ({ ...created(ready), status: 'adopted' });

const ROWS: readonly Row[] = [
  {
    name: 'no bearer',
    script: signedIn,
    request: { hasBearer: false },
    status: 401,
    body: { error: 'bad-token' },
  },
  {
    name: 'bad token',
    script: { [`GET ${USER_URL}`]: { status: 401 } },
    status: 401,
    body: { error: 'bad-token' },
  },
  {
    name: 'disallowed origin',
    script: signedIn,
    request: { origin: 'https://evil.example' },
    status: 403,
    body: { error: 'origin-not-allowed' },
  },
  {
    name: 'non-POST',
    script: signedIn,
    request: { method: 'GET' },
    status: 405,
    body: { error: 'method-not-allowed' },
  },
  {
    name: 'exists from the template, manifest ready',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 200, body: COACH_REPO },
      [`GET ${MANIFEST_URL}`]: { status: 200 },
    },
    status: 200,
    body: adopted(true),
  },
  {
    name: 'exists with a marker file only',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 200, body: PLAIN_REPO },
      [`GET ${MANIFEST_URL}`]: { status: 404 },
      [`GET ${EXAMPLE_URL}`]: { status: 200 },
    },
    status: 200,
    body: adopted(true),
  },
  {
    name: 'exists, foreign repo',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 200, body: PLAIN_REPO },
      [`GET ${MANIFEST_URL}`]: { status: 404 },
      [`GET ${EXAMPLE_URL}`]: { status: 404 },
      [`GET ${REPO_URL}/contents/cse.config.yml`]: { status: 404 },
    },
    status: 409,
    body: { error: 'name-taken' },
  },
  {
    name: 'rename redirect',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 200, body: RENAMED_REPO },
      [`GET ${MANIFEST_URL}`]: { status: 200 },
    },
    status: 409,
    body: { error: 'name-taken' },
  },
  {
    name: 'generated, manifest never appears',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 404 },
      [`POST ${GENERATE_URL}`]: { status: 201 },
      [`GET ${MANIFEST_URL}`]: { status: 404 },
    },
    status: 200,
    body: created(false),
    manifestGets: READY_ATTEMPTS,
  },
  {
    name: 'generated, manifest appears on retry',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 404 },
      [`POST ${GENERATE_URL}`]: { status: 201 },
      [`GET ${MANIFEST_URL}`]: [{ status: 404 }, { status: 200 }],
    },
    status: 200,
    body: created(true),
    manifestGets: 2,
  },
  {
    name: 'generate 422 then repo found',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: [{ status: 404 }, { status: 200, body: COACH_REPO }],
      [`POST ${GENERATE_URL}`]: { status: 422 },
      [`GET ${MANIFEST_URL}`]: { status: 200 },
    },
    status: 200,
    body: adopted(true),
  },
  {
    name: 'generate 422 then still missing',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 404 },
      [`POST ${GENERATE_URL}`]: { status: 422 },
    },
    status: 409,
    body: { error: 'name-taken' },
  },
  {
    name: 'generate 403',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 404 },
      [`POST ${GENERATE_URL}`]: { status: 403 },
    },
    status: 403,
    body: { error: 'integration-refused' },
  },
  {
    name: 'generate 403 with rate limit exhausted',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 404 },
      [`POST ${GENERATE_URL}`]: { status: 403, headers: { 'x-ratelimit-remaining': '0' } },
    },
    status: 429,
    body: { error: 'rate-limited' },
  },
  {
    name: 'generate 404',
    script: {
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 404 },
      [`POST ${GENERATE_URL}`]: { status: 404 },
    },
    status: 502,
    body: { error: 'template-unavailable' },
  },
];

describe('POST /onboard/dsa', () => {
  it.each(ROWS)('$name', async (row) => {
    const { fetchImpl, calls } = stubFetch(row.script);
    const response = await handle(onboardRequest(row.request), ENV, fetchImpl, noop);
    expect(response.status).toBe(row.status);
    expect(await response.json()).toEqual(row.body);
    if (row.manifestGets !== undefined) {
      expect(calls.filter((call) => call.url === MANIFEST_URL)).toHaveLength(row.manifestGets);
    }
  });

  it('sends the exact generate body', async () => {
    const { fetchImpl, calls } = stubFetch({
      ...signedIn,
      [`GET ${REPO_URL}`]: { status: 404 },
      [`POST ${GENERATE_URL}`]: { status: 201 },
      [`GET ${MANIFEST_URL}`]: { status: 200 },
    });
    await handle(onboardRequest(), ENV, fetchImpl, noop);
    const generate = calls.find((call) => call.method === 'POST');
    expect(JSON.parse(generate?.body ?? 'null')).toEqual({
      owner: 'alice',
      name: 'cse-progress',
      private: false,
      description: 'My cse-coach practice log, created from progressiveoverflow.com',
    });
  });
});
