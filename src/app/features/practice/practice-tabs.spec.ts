import { vi } from 'vitest';

import { createMemoryStorage } from '../../core/memory-storage.testing';
import { CONTENT_REPO } from '../../core/services/github-file.service';
import { draftKey } from './practice-draft';
import { loadTabs, saveTabs, tabsKey } from './practice-tabs';

const NUMBER = 90;
const STUB = 'stub';
const DRAFT = draftKey(CONTENT_REPO, NUMBER);
const TABS = tabsKey(CONTENT_REPO, NUMBER);

describe('practice tabs storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    { name: 'only the old draft key becomes Solution 1', stored: null, draft: 'old', expected: { texts: ['old'], active: 0 } },
    { name: 'nothing stored gives the stub', stored: null, draft: null, expected: { texts: [STUB], active: 0 } },
    { name: 'corrupt JSON falls back', stored: '{nope', draft: 'old', expected: { texts: ['old'], active: 0 } },
    {
      name: 'an out-of-range active is clamped',
      stored: JSON.stringify({ texts: ['a', 'b'], active: 7 }),
      draft: null,
      expected: { texts: ['a', 'b'], active: 1 },
    },
  ])('loadTabs: $name', ({ stored, draft, expected }) => {
    if (stored !== null) localStorage.setItem(TABS, stored);
    if (draft !== null) localStorage.setItem(DRAFT, draft);

    expect(loadTabs(CONTENT_REPO, NUMBER, STUB)).toEqual(expected);
  });

  it('saveTabs writes the tabs and removes the old draft key', () => {
    localStorage.setItem(DRAFT, 'old');

    saveTabs(CONTENT_REPO, NUMBER, { texts: ['a'], active: 0 });

    expect(JSON.parse(localStorage.getItem(TABS)!)).toEqual({ texts: ['a'], active: 0, savedAt: expect.any(Number) });
    expect(localStorage.getItem(DRAFT)).toBeNull();
  });
});
