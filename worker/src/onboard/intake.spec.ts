import { describe, expect, it } from 'vitest';
import { handle, type OnboardEnv } from './handler';
import { parseIntake } from './intake';

const ORIGIN = 'https://progressiveoverflow.com';
const ENV: OnboardEnv = {
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: ORIGIN,
  TEMPLATE_OWNER: 'tpl-owner',
  TEMPLATE_REPO: 'tpl-repo',
};
const API = 'https://api.github.com';
const REPO_URL = `${API}/repos/alice/cse-progress`;
const CONFIG_URL = `${REPO_URL}/contents/cse.config.yml?ref=main`;
const INTAKE_URL = `${REPO_URL}/contents/intake.yml`;
const ALICE_REPO = { owner: { login: 'alice', type: 'User' } };
const TODAY = '2026-10-19';
const TIMEZONE = 'America/New_York';
const NAME_MAX = 80;

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
    return new Response(answer.text ?? JSON.stringify(answer.body ?? {}), {
      status: answer.status,
    });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function valid(fields: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Alice',
    target: 'fintech_interview',
    timezone: TIMEZONE,
    startDate: TODAY,
    ...fields,
  };
}

describe('parseIntake', () => {
  const cases: ReadonlyArray<[string, unknown, string | null]> = [
    ['body not an object', 'text', 'invalid-request'],
    ['name empty after trim', valid({ name: '   ' }), 'invalid-name'],
    ['name with a newline', valid({ name: 'Ada\nLovelace' }), 'invalid-name'],
    ['name 81 code points', valid({ name: '😀'.repeat(NAME_MAX + 1) }), 'invalid-name'],
    ['name 80 code points', valid({ name: '😀'.repeat(NAME_MAX) }), null],
    ['target unknown', valid({ target: 'astronaut' }), 'invalid-target'],
    ['timezone unknown', valid({ timezone: 'Mars/Olympus' }), 'invalid-timezone'],
    ['timezone empty', valid({ timezone: '' }), 'invalid-timezone'],
    ['timezone fixed offset', valid({ timezone: '+01:00' }), 'invalid-timezone'],
    ['timezone Asia/Kolkata', valid({ timezone: 'Asia/Kolkata' }), null],
    ['timezone Asia/Calcutta', valid({ timezone: 'Asia/Calcutta' }), null],
    ['timezone UTC', valid({ timezone: 'UTC' }), null],
    ['startDate malformed', valid({ startDate: '2026-13-40' }), 'invalid-start-date'],
    ['startDate today-32', valid({ startDate: '2026-09-17' }), 'invalid-start-date'],
    ['startDate today+32', valid({ startDate: '2026-11-20' }), 'invalid-start-date'],
    ['startDate today+31', valid({ startDate: '2026-11-19' }), null],
  ];

  it.each(cases)('%s', (_label, body, code) => {
    const result = parseIntake(body, TODAY);
    if (code === null) expect('ok' in result).toBe(true);
    else expect(result).toEqual({ error: code });
  });
});

function intakeRequest(body: unknown, withToken = true): Request {
  return new Request('https://worker.test/onboard/intake', {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      ...(withToken ? { Authorization: 'Bearer tok' } : {}),
    },
    body: JSON.stringify(body),
  });
}

function aliceScript(extra: Script = {}): Script {
  return {
    [`GET ${API}/user`]: { status: 200, body: { login: 'alice' } },
    [`GET ${REPO_URL}`]: { status: 200, body: ALICE_REPO },
    [`GET ${CONFIG_URL}`]: { status: 404 },
    [`GET ${INTAKE_URL}?ref=main`]: { status: 404 },
    [`PUT ${INTAKE_URL}`]: { status: 201, body: {} },
    ...extra,
  };
}

const NAME_WITH_QUOTE = 'Al "Ace": Smith';
const EXPECTED_YAML = [
  'name: "Al \\"Ace\\": Smith"',
  'target: fintech_interview',
  `timezone: ${TIMEZONE}`,
  `start_date: ${new Date().toISOString().slice(0, 10)}`,
  '',
].join('\n');

describe('POST /onboard/intake', () => {
  const todayNow = new Date().toISOString().slice(0, 10);
  const cases: ReadonlyArray<{
    label: string;
    withToken?: boolean;
    script: Script;
    status: number;
    body: unknown;
    hasPut: boolean;
  }> = [
    { label: 'no bearer', withToken: false, script: {}, status: 401, body: { error: 'bad-token' }, hasPut: false },
    {
      label: 'config exists',
      script: aliceScript({ [`GET ${CONFIG_URL}`]: { status: 200, body: {} } }),
      status: 409,
      body: { error: 'already-onboarded' },
      hasPut: false,
    },
    {
      label: 'not owner',
      script: aliceScript({
        [`GET ${REPO_URL}`]: { status: 200, body: { owner: { login: 'bob', type: 'User' } } },
      }),
      status: 403,
      body: { error: 'not-owner' },
      hasPut: false,
    },
    { label: 'success', script: aliceScript(), status: 200, body: { status: 'queued' }, hasPut: true },
  ];

  it.each(cases)('$label', async ({ withToken, script, status, body, hasPut }) => {
    const { fetchImpl, calls } = stubFetch(script);
    const response = await handle(
      intakeRequest(valid({ name: NAME_WITH_QUOTE, startDate: todayNow, timezone: TIMEZONE.toLowerCase() }), withToken),
      ENV,
      fetchImpl,
    );
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
    const puts = calls.filter((call) => call.method === 'PUT');
    expect(puts.length).toBe(hasPut ? 1 : 0);
    if (!hasPut) return;
    const content = (JSON.parse(puts[0]?.body ?? '{}') as { content: string }).content;
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(content), (c) => c.charCodeAt(0)));
    expect(decoded).toBe(EXPECTED_YAML);
  });
});
