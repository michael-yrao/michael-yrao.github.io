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
const API = 'https://api.github.com';
const REPO_URL = `${API}/repos/alice/cse-progress`;
const WEEK_FILE_URL = `${REPO_URL}/contents/docs/foundations/schedules/20261026_schedule.md`;
const GET_WEEK = `GET ${WEEK_FILE_URL}?ref=main`;
const PUT_WEEK = `PUT ${WEEK_FILE_URL}`;
const MONDAY = '2026-10-26';
const TUESDAY = '2026-10-27';
const DRAFT_TEXT = '# Week\n<!-- status: draft -->\n| row |\n';
const APPROVED_TEXT = '# Week\n| row |\n';

type Script = Record<string, { status: number; body?: unknown }>;

function fileAnswer(text: string): { status: number; body: unknown } {
  return { status: 200, body: { sha: 'week-sha', content: btoa(text) } };
}

function script(extra: Script = {}): Script {
  return {
    [`GET ${API}/user`]: { status: 200, body: { login: 'alice' } },
    [`GET ${REPO_URL}`]: { status: 200, body: { owner: { login: 'alice', type: 'User' } } },
    [GET_WEEK]: fileAnswer(DRAFT_TEXT),
    [PUT_WEEK]: { status: 200 },
    ...extra,
  };
}

function stubFetch(stub: Script): { fetchImpl: typeof fetch; puts: string[] } {
  const puts: string[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    if (method === 'PUT') puts.push(init?.body as string);
    const answer = stub[`${method} ${String(input)}`] ?? { status: 599 };
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status });
  }) as typeof fetch;
  return { fetchImpl, puts };
}

function approveRequest(weekOf: string): Request {
  return new Request('https://worker.test/engine/approve-week', {
    method: 'POST',
    headers: { Origin: ORIGIN, Authorization: 'Bearer tok' },
    body: JSON.stringify({ owner: 'alice', repo: 'cse-progress', weekOf }),
  });
}

describe('POST /engine/approve-week', () => {
  const cases: ReadonlyArray<{
    label: string;
    weekOf: string;
    script: Script;
    status: number;
    body: unknown;
    wrote: boolean;
  }> = [
    { label: 'success', weekOf: MONDAY, script: script(), status: 200, body: { status: 'approved' }, wrote: true },
    {
      label: 'file missing',
      weekOf: MONDAY,
      script: script({ [GET_WEEK]: { status: 404 } }),
      status: 404,
      body: { error: 'no-week' },
      wrote: false,
    },
    {
      label: 'no marker',
      weekOf: MONDAY,
      script: script({ [GET_WEEK]: fileAnswer(APPROVED_TEXT) }),
      status: 409,
      body: { error: 'not-draft' },
      wrote: false,
    },
    {
      label: 'not the owner',
      weekOf: MONDAY,
      script: script({ [`GET ${REPO_URL}`]: { status: 200, body: { owner: { login: 'bob', type: 'User' } } } }),
      status: 403,
      body: { error: 'not-owner' },
      wrote: false,
    },
    {
      label: 'weekOf not a Monday',
      weekOf: TUESDAY,
      script: script(),
      status: 400,
      body: { error: 'invalid-request' },
      wrote: false,
    },
  ];

  it.each(cases)('$label', async ({ weekOf, script: stub, status, body, wrote }) => {
    const { fetchImpl, puts } = stubFetch(stub);
    const response = await handle(approveRequest(weekOf), ENV, fetchImpl);
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
    expect(puts).toHaveLength(wrote ? 1 : 0);
    if (!wrote) return;
    const put = JSON.parse(puts[0] ?? '') as { message: string; content: string };
    expect(put.message).toBe(`chore(schedule): approve week of ${MONDAY}`);
    expect(atob(put.content)).toBe(APPROVED_TEXT);
  });
});
