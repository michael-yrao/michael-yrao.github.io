import { describe, expect, it } from 'vitest';
import { buildBlobQuery, createTree, parseBlobTexts } from './git-data';

describe('createTree', () => {
  it('posts base_tree and inline blob entries keeping the executable mode', async () => {
    const requests: { url: string; body: unknown }[] = [];
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: String(input), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ sha: 'newtree' }), { status: 201 });
    }) as typeof fetch;

    const result = await createTree(fetchImpl, 'tok', 'alice', 'cse-progress', 'basetree', [
      { path: '.githooks/pre-commit', mode: '100755', content: '#!/bin/sh\n' },
      { path: 'a.py', mode: '100644', content: 'print(1)\n' },
    ]);

    expect(result).toEqual({ kind: 'ok', value: 'newtree' });
    expect(requests[0]?.url).toBe('https://api.github.com/repos/alice/cse-progress/git/trees');
    expect(requests[0]?.body).toEqual({
      base_tree: 'basetree',
      tree: [
        { path: '.githooks/pre-commit', mode: '100755', type: 'blob', content: '#!/bin/sh\n' },
        { path: 'a.py', mode: '100644', type: 'blob', content: 'print(1)\n' },
      ],
    });
  });
});

describe('blob query', () => {
  const paths = ['a.py', 'dir/with space "q".md'];

  it('round-trips aliases back to paths, escaping quotes in the expression', () => {
    const query = buildBlobQuery('o', 'r', 'abc', paths);
    expect(query).toContain(String.raw`"abc:dir/with space \"q\".md"`);
    const data = {
      repository: {
        f0: { text: 'one', isBinary: false, isTruncated: false },
        f1: { text: 'two', isBinary: false, isTruncated: false },
      },
    };
    const result = parseBlobTexts(data, paths);
    expect(result).toEqual({
      kind: 'ok',
      value: new Map([
        ['a.py', 'one'],
        ['dir/with space "q".md', 'two'],
      ]),
    });
  });

  const bad: ReadonlyArray<[string, Record<string, unknown>]> = [
    ['binary', { text: null, isBinary: true, isTruncated: false }],
    ['truncated', { text: 'x', isBinary: false, isTruncated: true }],
  ];
  it.each(bad)('%s is an error naming the path', (reason, node) => {
    const result = parseBlobTexts({ repository: { f0: node } }, ['a.py']);
    expect(result).toEqual({ kind: 'error', error: `${reason}: a.py` });
  });
});
