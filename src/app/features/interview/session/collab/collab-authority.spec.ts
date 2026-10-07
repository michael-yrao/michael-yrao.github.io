import { Update } from '@codemirror/collab';
import { ChangeSet, Text } from '@codemirror/state';

import { authorityVersion, createAuthority, receivePush } from './collab-authority';

const START = 'ab';

function insertAtStart(text: string): Update {
  return { clientID: 'c', changes: ChangeSet.of({ from: 0, insert: text }, START.length) };
}

describe('receivePush', () => {
  const empty = createAuthority(Text.of([START]));
  const afterOne = receivePush(empty, 0, [insertAtStart('x')]).authority;

  it.each([
    { name: 'a push at the current version is accepted and advances the version', base: empty, version: 0, accepts: true },
    { name: 'a push at a stale version is rejected and the authority is unchanged', base: afterOne, version: 0, accepts: false },
  ])('$name', ({ base, version, accepts }) => {
    const before = authorityVersion(base);
    const result = receivePush(base, version, [insertAtStart('y')]);

    if (accepts) {
      expect(result.accepted).toHaveLength(1);
      expect(authorityVersion(result.authority)).toBe(before + 1);
      expect(authorityVersion(base)).toBe(before);
      return;
    }
    expect(result.accepted).toEqual([]);
    expect(result.authority).toBe(base);
  });
});
