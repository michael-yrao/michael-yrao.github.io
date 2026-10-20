import { describe, expect, it } from 'vitest';
import { encodeBase64Utf8, putFile, readFileWithSha, type FileTarget } from './write-file';

const API = 'https://api.github.com';
const TARGET: FileTarget = { owner: 'alice', repo: 'cse-progress', branch: 'main', path: 'mastery/holds.yml' };
const CONTENTS_URL = `${API}/repos/alice/cse-progress/contents/mastery/holds.yml`;
const READ_KEY = `GET ${CONTENTS_URL}?ref=main`;
const PUT_KEY = `PUT ${CONTENTS_URL}`;
const COMMIT = { message: 'chore: hold', content: 'text' };
const CORS = {};
const TEXT = '| 🟡 | a — b |\nsecond line';
const SHA = 'abc123';

interface Call {
  readonly key: string;
  readonly body: string | undefined;
}

function stubFetch(status: number, body: unknown = {}): { fetchImpl: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ key: `${init?.method ?? 'GET'} ${String(input)}`, body: init?.body as string | undefined });
    return new Response(JSON.stringify(body), { status });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

async function errorOf(response: Response): Promise<{ status: number; error: unknown }> {
  const body = (await response.json()) as { error: unknown };
  return { status: response.status, error: body.error };
}

describe('readFileWithSha', () => {
  const encoded = encodeBase64Utf8(TEXT);
  const middle = Math.floor(encoded.length / 2);
  const wrapped = `${encoded.slice(0, middle)}\n${encoded.slice(middle)}\n`;

  const cases: ReadonlyArray<{
    name: string;
    status: number;
    body?: unknown;
    expected: { kind: 'found'; text: string; sha: string } | { kind: 'missing' } | { status: number; error: string };
  }> = [
    {
      name: 'found, UTF-8 intact across a base64 newline',
      status: 200,
      body: { sha: SHA, content: wrapped },
      expected: { kind: 'found', text: TEXT, sha: SHA },
    },
    { name: '404 is missing', status: 404, expected: { kind: 'missing' } },
    { name: '403 is not-installed', status: 403, expected: { status: 409, error: 'not-installed' } },
    { name: '500 is github-error', status: 500, expected: { status: 502, error: 'github-error' } },
  ];

  it.each(cases)('$name', async ({ status, body, expected }) => {
    const { fetchImpl, calls } = stubFetch(status, body);
    const result = await readFileWithSha(fetchImpl, 'token', TARGET, CORS);
    expect(calls[0]?.key).toBe(READ_KEY);
    if (result.kind === 'refused') expect(await errorOf(result.response)).toEqual(expected);
    else expect(result).toEqual(expected);
  });
});

describe('putFile', () => {
  const cases: ReadonlyArray<{
    name: string;
    status: number;
    sha: string | undefined;
    expected: { kind: 'written' } | { kind: 'conflict' } | { status: number; error: string };
  }> = [
    { name: '201 with sha sends the sha', status: 201, sha: SHA, expected: { kind: 'written' } },
    { name: '201 without sha omits it', status: 201, sha: undefined, expected: { kind: 'written' } },
    { name: '409 is a conflict', status: 409, sha: SHA, expected: { kind: 'conflict' } },
    { name: '422 is a conflict', status: 422, sha: SHA, expected: { kind: 'conflict' } },
    { name: '403 is not-installed', status: 403, sha: SHA, expected: { status: 409, error: 'not-installed' } },
    { name: '500 is github-error', status: 500, sha: SHA, expected: { status: 502, error: 'github-error' } },
  ];

  it.each(cases)('$name', async ({ status, sha, expected }) => {
    const { fetchImpl, calls } = stubFetch(status);
    const result = await putFile(fetchImpl, 'token', TARGET, COMMIT, sha, CORS);
    expect(calls[0]?.key).toBe(PUT_KEY);
    expect((JSON.parse(calls[0]?.body ?? '{}') as { sha?: string }).sha).toBe(sha);
    if (result.kind === 'refused') expect(await errorOf(result.response)).toEqual(expected);
    else expect(result).toEqual(expected);
  });
});
