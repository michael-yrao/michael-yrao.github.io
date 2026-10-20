import { vi } from 'vitest';

import { createMemoryStorage } from '../../core/memory-storage.testing';
import { RepoRef } from '../../core/services/github-file.service';
import { loadPick, pickKey } from './practice-pick';

const REF: RepoRef = { owner: 'alice', repo: 'practice', branch: 'main' };
const NUMBER = 1;
const TODAY = '2026-10-20';
const AT = '2026-10-20T09:00:00.000Z';

describe('loadPick', () => {
  const rows: { name: string; raw: string; expected: { picked: string; at: string } | null }[] = [
    { name: 'bad JSON', raw: '{not json', expected: null },
    { name: 'wrong day', raw: JSON.stringify({ picked: 'Two pointers', at: AT, day: '2026-10-19' }), expected: null },
    { name: 'missing at', raw: JSON.stringify({ picked: 'Two pointers', day: TODAY }), expected: null },
    {
      name: 'valid',
      raw: JSON.stringify({ picked: 'Two pointers', at: AT, day: TODAY }),
      expected: { picked: 'Two pointers', at: AT },
    },
  ];

  it.each(rows)('$name', ({ raw, expected }) => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    localStorage.setItem(pickKey(REF, NUMBER), raw);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(loadPick(REF, NUMBER, TODAY)).toEqual(expected);

    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
