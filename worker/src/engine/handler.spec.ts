import { describe, expect, it } from 'vitest';
import type { OnboardEnv } from '../onboard/handler';
import { handle } from './handler';

const ORIGIN = 'https://progressiveoverflow.com';
const ENV: OnboardEnv = {
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: ORIGIN,
  TEMPLATE_OWNER: 'michael-yrao',
  TEMPLATE_REPO: 'cse-coach',
};
const NO_CONTENT = 204;
const API = 'https://api.github.com';
const REPO_URL = `${API}/repos/alice/cse-progress`;
const ENABLE_URL = `${REPO_URL}/actions/workflows/weekly-build.yml/enable`;
const DISPATCH_URL = `${REPO_URL}/actions/workflows/weekly-build.yml/dispatches`;
const ALICE_REPO = { owner: { login: 'alice', type: 'User' } };

interface Call {
  readonly method: string;
  readonly url: string;
  readonly body: string | undefined;
}

type Script = Record<string, { status: number; body?: unknown; text?: string }>;

function stubFetch(script: Script): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: init?.body as string | undefined });
    const answer = script[`${method} ${url}`] ?? { status: 599 };
    const body = answer.status === NO_CONTENT ? null : (answer.text ?? JSON.stringify(answer.body ?? {}));
    return new Response(body, { status: answer.status });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function script(extra: Script = {}): Script {
  return {
    [`GET ${API}/user`]: { status: 200, body: { login: 'alice' } },
    [`GET ${REPO_URL}`]: { status: 200, body: ALICE_REPO },
    [`PUT ${ENABLE_URL}`]: { status: 204 },
    [`POST ${DISPATCH_URL}`]: { status: 204 },
    ...extra,
  };
}

function weeklyBuildRequest(): Request {
  return new Request('https://worker.test/engine/weekly-build', {
    method: 'POST',
    headers: { Origin: ORIGIN, Authorization: 'Bearer tok' },
    body: JSON.stringify({ owner: 'alice', repo: 'cse-progress' }),
  });
}

describe('POST /engine/weekly-build', () => {
  const cases: ReadonlyArray<{
    label: string;
    script: Script;
    status: number;
    body: unknown;
    github: readonly string[];
  }> = [
    {
      label: 'success',
      script: script(),
      status: 202,
      body: { status: 'dispatched' },
      github: [`PUT ${ENABLE_URL}`, `POST ${DISPATCH_URL}`],
    },
    {
      label: 'enable refused',
      script: script({ [`PUT ${ENABLE_URL}`]: { status: 403 } }),
      status: 403,
      body: { error: 'integration-refused' },
      github: [`PUT ${ENABLE_URL}`],
    },
    {
      label: 'dispatch finds no workflow',
      script: script({ [`POST ${DISPATCH_URL}`]: { status: 404 } }),
      status: 404,
      body: { error: 'no-workflow' },
      github: [`PUT ${ENABLE_URL}`, `POST ${DISPATCH_URL}`],
    },
  ];

  it.each(cases)('$label', async ({ script: stub, status, body, github }) => {
    const { fetchImpl, calls } = stubFetch(stub);
    const response = await handle(weeklyBuildRequest(), ENV, fetchImpl);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
    const workflowCalls = calls.filter((call) => call.url.includes('/actions/'));
    expect(workflowCalls.map((call) => `${call.method} ${call.url}`)).toEqual(github);
    const dispatch = workflowCalls.find((call) => call.method === 'POST');
    if (dispatch) expect(dispatch.body).toBe('{"ref":"main"}');
  });
});
