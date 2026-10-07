import { Debrief, EMPTY_NOTES } from '../debrief';
import { DEBRIEFS_MAX, DEBRIEF_KEY_PREFIX, listDebriefs, loadDebrief, removeDebrief, saveDebrief } from './debrief-store';

const debriefAt = (index: number): Debrief => ({
  sessionId: `po-${index}`,
  role: 'candidate',
  title: `Problem ${index}`,
  source: null,
  summary: { v: 1, startedAt: index, endedAt: index + 10, awayCount: 0, pasteCount: 0, notes: EMPTY_NOTES },
  finalCode: 'x = 1',
  lastRun: { passed: 2, total: 3 },
});

describe('debrief store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it('round-trips a debrief', () => {
    expect(saveDebrief(debriefAt(1))).toBe(true);
    expect(loadDebrief('po-1')).toEqual(debriefAt(1));
  });

  it('skips a malformed entry in the list and reads it as null', () => {
    saveDebrief(debriefAt(1));
    localStorage.setItem(`${DEBRIEF_KEY_PREFIX}bad`, '{not json');
    localStorage.setItem(`${DEBRIEF_KEY_PREFIX}wrong`, JSON.stringify({ ...debriefAt(2), role: 'viewer' }));
    expect(listDebriefs().map((entry) => entry.sessionId)).toEqual(['po-1']);
    expect(loadDebrief('bad')).toBeNull();
    expect(loadDebrief('wrong')).toBeNull();
  });

  it('lists newest first', () => {
    [2, 3, 1].forEach((index) => saveDebrief(debriefAt(index)));
    expect(listDebriefs().map((entry) => entry.sessionId)).toEqual(['po-3', 'po-2', 'po-1']);
  });

  it('drops the oldest when the 21st is saved', () => {
    for (let index = 1; index <= DEBRIEFS_MAX + 1; index++) {
      saveDebrief(debriefAt(index));
    }
    const ids = listDebriefs().map((entry) => entry.sessionId);
    expect(ids).toHaveLength(DEBRIEFS_MAX);
    expect(ids).not.toContain('po-1');
    expect(loadDebrief('po-1')).toBeNull();
  });

  it('removes one debrief', () => {
    saveDebrief(debriefAt(1));
    removeDebrief('po-1');
    expect(loadDebrief('po-1')).toBeNull();
  });
});
