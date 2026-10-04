import { SESSION_KEY_PREFIX, SESSION_TTL_MS, StoredRole, StoredSession, clearSession, loadSession, pruneExpiredSessions, saveSession } from './session-store';

const PEER_ID = 'po-abc';
const NOW = 1_000_000_000_000;
const KEY = `${SESSION_KEY_PREFIX}interviewer:${PEER_ID}`;
const ROLES: readonly StoredRole[] = ['interviewer', 'candidate'];
const FRESH: StoredSession = { problem: 7, doc: 'x', rev: 4, savedAt: NOW - 1 };
const EXPIRED: StoredSession = { problem: 7, doc: 'x', rev: 4, savedAt: NOW - SESSION_TTL_MS - 1 };

const LOAD_CASES: readonly { name: string; raw: string; expected: StoredSession | null }[] = [
  { name: 'a valid entry loads', raw: JSON.stringify(FRESH), expected: FRESH },
  { name: 'malformed JSON is null', raw: '{not json', expected: null },
  { name: 'a wrong shape is null', raw: JSON.stringify({ problem: '7', doc: 'x', savedAt: NOW }), expected: null },
  { name: 'an entry without a valid rev is null', raw: JSON.stringify({ problem: 7, doc: 'x', savedAt: NOW - 1 }), expected: null },
  { name: 'an expired entry is null', raw: JSON.stringify(EXPIRED), expected: null },
];

describe('session store', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it.each(LOAD_CASES)('load: $name', ({ raw, expected }) => {
    localStorage.setItem(KEY, raw);
    expect(loadSession('interviewer', PEER_ID, NOW)).toEqual(expected);
  });

  it.each(ROLES)('%s and the other role save and load the same peer id independently, and clear only its own', (role) => {
    const other: StoredRole = role === 'interviewer' ? 'candidate' : 'interviewer';
    saveSession(role, PEER_ID, 1, 'mine', 0, NOW);
    saveSession(other, PEER_ID, 2, 'theirs', 0, NOW);

    expect(loadSession(role, PEER_ID, NOW)?.doc).toBe('mine');
    expect(loadSession(other, PEER_ID, NOW)?.doc).toBe('theirs');

    clearSession(role, PEER_ID);

    expect(loadSession(role, PEER_ID, NOW)).toBeNull();
    expect(loadSession(other, PEER_ID, NOW)?.doc).toBe('theirs');
  });

  it('prune drops only the expired session keys', () => {
    localStorage.setItem(`${SESSION_KEY_PREFIX}old-1`, JSON.stringify(EXPIRED));
    localStorage.setItem(`${SESSION_KEY_PREFIX}old-2`, JSON.stringify(EXPIRED));
    localStorage.setItem(`${SESSION_KEY_PREFIX}fresh`, JSON.stringify(FRESH));
    localStorage.setItem('unrelated', JSON.stringify(EXPIRED));

    pruneExpiredSessions(NOW);

    expect(Object.keys(localStorage).sort()).toEqual([`${SESSION_KEY_PREFIX}fresh`, 'unrelated']);
  });
});
