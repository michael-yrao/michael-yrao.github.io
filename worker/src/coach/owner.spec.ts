import { describe, expect, it } from 'vitest';
import { checkCoachOwner } from './owner';

const OWNER = 'michael-yrao';

function userFetch(status: number, login?: string): typeof fetch {
  return (async () => new Response(JSON.stringify(login === undefined ? {} : { login }), { status })) as typeof fetch;
}

describe('checkCoachOwner', () => {
  const cases: ReadonlyArray<[string, typeof fetch, number | null, string | null]> = [
    ['the owner', userFetch(200, OWNER), null, null],
    ['the owner with different letter case', userFetch(200, 'Michael-YRao'), null, null],
    ['another login', userFetch(200, 'someone-else'), 403, 'not-owner'],
    ['a GitHub 401', userFetch(401), 401, 'bad-token'],
    ['a GitHub 403', userFetch(403), 401, 'bad-token'],
    ['a GitHub 500', userFetch(500), 502, 'github-error'],
    ['a reply with no login', userFetch(200), 502, 'github-error'],
  ];

  it.each(cases)('handles %s', async (_name, fetchImpl, status, error) => {
    const refusal = await checkCoachOwner(fetchImpl, 'tok-test', OWNER, {});
    if (status === null) {
      expect(refusal).toBeNull();
      return;
    }
    expect(refusal?.status).toBe(status);
    expect(await refusal?.json()).toEqual({ error });
  });
});
