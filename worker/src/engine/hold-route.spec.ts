import { describe, expect, it } from 'vitest';
import type { OnboardEnv } from '../onboard/handler';
import { HOLDS_PATH, HOLD_WHY, TRACKER_PATH } from './hold';
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
const TRACKER_URL = `${REPO_URL}/contents/${TRACKER_PATH}?ref=main`;
const HOLDS_GET_URL = `${REPO_URL}/contents/${HOLDS_PATH}?ref=main`;
const HOLDS_PUT_URL = `${REPO_URL}/contents/${HOLDS_PATH}`;
const ALICE_REPO = { owner: { login: 'alice', type: 'User' } };
const BOB_REPO = { owner: { login: 'bob', type: 'User' } };
const MS_PER_DAY = 86_400_000;
const HOLD_DAYS = 10;
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;
const TRACKER_TEXT = [
  '| Difficulty | Problem | Comfort | Streak | Next Review Date | Latest Rep Date | Rep Dates |',
  '|---|---|---|---|---|---|---|',
  '| Medium | [853. Car Fleet](https://leetcode.com/problems/car-fleet/) | Y | 0 |',
].join('\n');
const OLD_HOLDS = '# holds\n';

interface Answer {
  readonly status: number;
  readonly body?: unknown;
}

interface Call {
  readonly method: string;
  readonly url: string;
  readonly body: string | undefined;
}

// Answers per `${method} ${url}`, consumed in order; the last one repeats.
type Script = Record<string, readonly Answer[]>;

function stubFetch(script: Script): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const seen = new Map<string, number>();
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    const key = `${method} ${url}`;
    calls.push({ method, url, body: init?.body as string | undefined });
    const answers = script[key] ?? [{ status: 599 }];
    const index = Math.min(seen.get(key) ?? 0, answers.length - 1);
    seen.set(key, (seen.get(key) ?? 0) + 1);
    const answer = answers[index] as Answer;
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function fileAnswer(text: string, sha: string): Answer {
  return { status: 200, body: { sha, content: btoa(text) } };
}

function isoDayOffset(days: number): string {
  return new Date(Date.now() + days * MS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH);
}

function script(extra: Script = {}): Script {
  return {
    [`GET ${API}/user`]: [{ status: 200, body: { login: 'alice' } }],
    [`GET ${REPO_URL}`]: [{ status: 200, body: ALICE_REPO }],
    [`GET ${TRACKER_URL}`]: [fileAnswer(TRACKER_TEXT, 'tracker-sha')],
    [`GET ${HOLDS_GET_URL}`]: [fileAnswer(OLD_HOLDS, 'holds-sha-1')],
    [`PUT ${HOLDS_PUT_URL}`]: [{ status: 200 }],
    ...extra,
  };
}

function holdRequest(): Request {
  return new Request('https://worker.test/engine/hold', {
    method: 'POST',
    headers: { Origin: ORIGIN, Authorization: 'Bearer tok' },
    body: JSON.stringify({
      owner: 'alice',
      repo: 'cse-progress',
      number: 853,
      title: 'Car Fleet',
      until: isoDayOffset(HOLD_DAYS),
      today: isoDayOffset(0),
    }),
  });
}

function putBodies(calls: readonly Call[]): Array<{ content: string; sha?: string }> {
  return calls
    .filter((call) => call.method === 'PUT')
    .map((call) => JSON.parse(call.body ?? '{}') as { content: string; sha?: string });
}

describe('POST /engine/hold', () => {
  const cases: ReadonlyArray<{
    label: string;
    script: Script;
    status: number;
    body: unknown;
    puts: number;
    lastPutSha?: string;
    readsTracker: boolean;
  }> = [
    {
      label: 'ok',
      script: script(),
      status: 200,
      body: { status: 'held', until: isoDayOffset(HOLD_DAYS) },
      puts: 1,
      lastPutSha: 'holds-sha-1',
      readsTracker: true,
    },
    {
      label: 'conflict then retry',
      script: script({
        [`GET ${HOLDS_GET_URL}`]: [fileAnswer(OLD_HOLDS, 'holds-sha-1'), fileAnswer(OLD_HOLDS, 'holds-sha-2')],
        [`PUT ${HOLDS_PUT_URL}`]: [{ status: 409 }, { status: 201 }],
      }),
      status: 200,
      body: { status: 'held', until: isoDayOffset(HOLD_DAYS) },
      puts: 2,
      lastPutSha: 'holds-sha-2',
      readsTracker: true,
    },
    {
      label: 'no row',
      script: script({ [`GET ${TRACKER_URL}`]: [fileAnswer('| Difficulty | Problem | Comfort |\n', 't')] }),
      status: 404,
      body: { error: 'no-row' },
      puts: 0,
      readsTracker: true,
    },
    {
      label: 'not owner',
      script: script({ [`GET ${REPO_URL}`]: [{ status: 200, body: BOB_REPO }] }),
      status: 403,
      body: { error: 'not-owner' },
      puts: 0,
      readsTracker: false,
    },
  ];

  it.each(cases)('$label', async (testCase) => {
    const { fetchImpl, calls } = stubFetch(testCase.script);
    const response = await handle(holdRequest(), ENV, fetchImpl);

    expect(response.status).toBe(testCase.status);
    expect(await response.json()).toEqual(testCase.body);
    expect(calls.some((call) => call.url === TRACKER_URL)).toBe(testCase.readsTracker);

    const puts = putBodies(calls);
    expect(puts).toHaveLength(testCase.puts);
    if (testCase.lastPutSha === undefined) return;
    const last = puts.at(-1) as { content: string; sha?: string };
    expect(last.sha).toBe(testCase.lastPutSha);
    expect(atob(last.content)).toContain(`why: ${HOLD_WHY}`);
  });
});
