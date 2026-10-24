import { describe, expect, it } from 'vitest';
import type { PatternSenseEnv } from '../pattern-sense/handler';
import { handle } from './handler';
import { MAX_ATTEMPT_BYTES } from './validate';

const ORIGIN = 'https://progressiveoverflow.com';
const ENV: PatternSenseEnv = {
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  ALLOWED_ORIGINS: ORIGIN,
};
const API = 'https://api.github.com';
const REPO_URL = `${API}/repos/alice/cse-progress`;
const PATH = 'dsa/attempts/20261101/1_two_sum.py';
const CONTENTS_URL = `${REPO_URL}/contents/${PATH}`;
const ATTEMPTS_URL = `${REPO_URL}/contents/dsa/attempts?ref=main`;
const ALICE_REPO = { owner: { login: 'alice', type: 'User' } };
const SAVED_AT = '2026-11-01T10:00:00.000Z';

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

function ownerScript(login: string, extra: Script = {}): Script {
  return {
    [`GET ${API}/user`]: { status: 200, body: { login } },
    [`GET ${REPO_URL}`]: { status: 200, body: ALICE_REPO },
    [`GET ${CONTENTS_URL}?ref=main`]: { status: 404 },
    [`PUT ${CONTENTS_URL}`]: { status: 201, body: {} },
    ...extra,
  };
}

const COMPLEXITY = {
  time: 'O(n)',
  space: 'O(1)',
  whyTime: 'one pass over the input',
  whySpace: 'a few counters',
};

function header(fields: Record<string, unknown> = {}): string {
  return `# po-attempt: ${JSON.stringify({
    complete: false,
    rating: null,
    tests: '3/9',
    complexity: null,
    savedAt: SAVED_AT,
    ...fields,
  })}`;
}

function post(route: string, body: Record<string, unknown>): Request {
  return new Request(`https://worker.example/practice/${route}`, {
    method: 'POST',
    headers: { Origin: ORIGIN, Authorization: 'Bearer user-token' },
    body: JSON.stringify({ owner: 'alice', repo: 'cse-progress', branch: 'main', ...body }),
  });
}

function saveRequest(path: string, content: string): Request {
  return post('save', { path, content });
}

describe('practice /save', () => {
  it('refuses without writing', async () => {
    const rows: Array<{ name: string; request: Request; login?: string; status: number; error: string }> = [
      ...[
        ['wrong folder', 'dsa/other/20261101/1_two_sum.py'],
        ['non-8-digit date', 'dsa/attempts/2026111/1_two_sum.py'],
        ['uppercase name', 'dsa/attempts/20261101/1_Two_Sum.py'],
        ['dot-dot', 'dsa/attempts/20261101/../1_two_sum.py'],
      ].map(([name, path]) => ({
        name: `bad path: ${name}`,
        request: saveRequest(path as string, `${header()}\npass\n`),
        status: 400,
        error: 'invalid-path',
      })),
      {
        name: 'missing first line',
        request: saveRequest(PATH, 'def two_sum(): pass\n'),
        status: 400,
        error: 'missing-attempt-header',
      },
      {
        name: 'malformed first line',
        request: saveRequest(PATH, '# po-attempt: {not json\npass\n'),
        status: 400,
        error: 'invalid-attempt-header',
      },
      {
        name: 'complete with 7/9',
        request: saveRequest(
          PATH,
          `${header({ complete: true, rating: 'clean', tests: '7/9', complexity: COMPLEXITY })}\npass\n`,
        ),
        status: 400,
        error: 'invalid-attempt-header',
      },
      {
        name: 'complete with null rating',
        request: saveRequest(
          PATH,
          `${header({ complete: true, tests: '9/9', complexity: COMPLEXITY })}\npass\n`,
        ),
        status: 400,
        error: 'invalid-attempt-header',
      },
      {
        name: 'complete without complexity',
        request: saveRequest(
          PATH,
          `${header({ complete: true, rating: 'clean', tests: '9/9' })}\npass\n`,
        ),
        status: 400,
        error: 'invalid-attempt-header',
      },
      {
        name: 'complete with an empty why',
        request: saveRequest(
          PATH,
          `${header({
            complete: true,
            rating: 'clean',
            tests: '9/9',
            complexity: { ...COMPLEXITY, whyTime: '   ' },
          })}\npass\n`,
        ),
        status: 400,
        error: 'invalid-attempt-header',
      },
      {
        name: 'incomplete with a rating',
        request: saveRequest(PATH, `${header({ rating: 'shaky' })}\npass\n`),
        status: 400,
        error: 'invalid-attempt-header',
      },
      {
        name: 'oversized content',
        request: saveRequest(PATH, `${header()}\n${'x'.repeat(MAX_ATTEMPT_BYTES)}`),
        status: 400,
        error: 'attempt-too-large',
      },
      {
        name: 'non-owner',
        request: saveRequest(PATH, `${header()}\npass\n`),
        login: 'mallory',
        status: 403,
        error: 'not-owner',
      },
    ];

    for (const row of rows) {
      const { fetchImpl, calls } = stubFetch(ownerScript(row.login ?? 'alice'));
      const response = await handle(row.request, ENV, fetchImpl);
      expect(response.status, row.name).toBe(row.status);
      expect(await response.json(), row.name).toEqual({ error: row.error });
      expect(
        calls.filter((call) => call.method === 'PUT'),
        `${row.name}: no PUT`,
      ).toHaveLength(0);
    }
  });

  it('writes the attempt with the commit message, branch and base64 UTF-8 content', async () => {
    const content = `${header({ complete: true, rating: 'clean', tests: '9/9', complexity: COMPLEXITY })}\n# naïve ✓\n`;
    const script = ownerScript('alice', {
      [`GET ${CONTENTS_URL}?ref=main`]: { status: 200, body: { sha: 'abc123' } },
    });
    const { fetchImpl, calls } = stubFetch(script);
    const response = await handle(saveRequest(PATH, content), ENV, fetchImpl);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const put = calls.find((call) => call.method === 'PUT');
    expect(put?.url).toBe(CONTENTS_URL);
    const body = JSON.parse(put?.body ?? '{}');
    expect(body.branch).toBe('main');
    expect(body.message).toBe('chore(practice): 1 complete 20261101');
    expect(body.sha).toBe('abc123');
    expect(Buffer.from(body.content, 'base64').toString('utf8')).toBe(content);
  });

  it('a non-rated save is 409 over a file it would bury, and writes otherwise', async () => {
    const existingFile = (fields: Record<string, unknown>) => ({
      sha: 'abc123',
      content: Buffer.from(`${header(fields)}\nold\n`).toString('base64'),
    });
    const inProgress = {};
    const provisional = { complete: true, tests: '9/9' };
    const rated = { complete: true, rating: 'clean', tests: '9/9', complexity: COMPLEXITY };
    const rows = [
      { name: 'in-progress over provisional', incoming: inProgress, existing: provisional, status: 409, puts: 0 },
      { name: 'in-progress over in-progress', incoming: inProgress, existing: inProgress, status: 200, puts: 1 },
      { name: 'provisional over rated', incoming: provisional, existing: rated, status: 409, puts: 0 },
      { name: 'provisional over provisional', incoming: provisional, existing: provisional, status: 200, puts: 1 },
      { name: 'provisional over in-progress', incoming: provisional, existing: inProgress, status: 200, puts: 1 },
    ];

    for (const row of rows) {
      const script = ownerScript('alice', {
        [`GET ${CONTENTS_URL}?ref=main`]: { status: 200, body: existingFile(row.existing) },
      });
      const { fetchImpl, calls } = stubFetch(script);
      const response = await handle(saveRequest(PATH, `${header(row.incoming)}\nnew\n`), ENV, fetchImpl);

      expect(response.status, row.name).toBe(row.status);
      if (row.status === 409) expect(await response.json()).toEqual({ error: 'already-complete' });
      expect(calls.filter((call) => call.method === 'PUT'), row.name).toHaveLength(row.puts);
      expect(calls.filter((call) => call.url.startsWith(CONTENTS_URL)), row.name).toHaveLength(
        row.puts + 1,
      );
    }
  });
});

describe('practice /latest', () => {
  const dir = (name: string) => ({ name, type: 'dir' });
  const file = (name: string) => ({ name, type: 'file' });

  it('picks the newest date folder holding the problem', async () => {
    const newest = 'dsa/attempts/20261103/1_two_sum.py';
    const { fetchImpl, calls } = stubFetch(
      ownerScript('alice', {
        [`GET ${ATTEMPTS_URL}`]: {
          status: 200,
          body: [dir('20261101'), dir('20261105'), dir('20261103'), file('README.md')],
        },
        [`GET ${REPO_URL}/contents/dsa/attempts/20261105?ref=main`]: {
          status: 200,
          body: [file('11_container.py'), file('2_add_two.py')],
        },
        [`GET ${REPO_URL}/contents/dsa/attempts/20261103?ref=main`]: {
          status: 200,
          body: [file('1_two_sum.py')],
        },
        [`GET ${REPO_URL}/contents/${newest}?ref=main`]: { status: 200, text: 'print(1)\n' },
      }),
    );
    const response = await handle(post('latest', { number: 1 }), ENV, fetchImpl);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ path: newest, content: 'print(1)\n' });
    expect(calls.some((call) => call.url.includes('20261101'))).toBe(false);
  });

  it('returns 404 none when no folder holds the problem', async () => {
    const { fetchImpl } = stubFetch(
      ownerScript('alice', {
        [`GET ${ATTEMPTS_URL}`]: { status: 200, body: [dir('20261101')] },
        [`GET ${REPO_URL}/contents/dsa/attempts/20261101?ref=main`]: {
          status: 200,
          body: [file('2_add_two.py')],
        },
      }),
    );
    const response = await handle(post('latest', { number: 1 }), ENV, fetchImpl);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'none' });
  });
});
