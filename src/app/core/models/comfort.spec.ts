import { ComfortKey, ComfortStageKey, comfortName, comfortStage, streakFromNote } from './comfort';

describe('comfortName', () => {
  it.each<[string, ComfortKey]>([
    ['🔴', 'blank'],
    ['🟡', 'shaky'],
    ['🟢', 'clean'],
    ['🎓', 'graduated'],
    ['🏆', 'retired'],
    ['?', 'unknown'],
  ])('maps %s to %s', (input, expected) => {
    expect(comfortName(input)).toBe(expected);
  });
});

describe('comfortStage', () => {
  it.each<[string, number | undefined, ComfortStageKey, number, string]>([
    ['🔴', undefined, 'blank', 1, 'Comfort: blank'],
    ['🟡', undefined, 'shaky', 2, 'Comfort: shaky'],
    ['🟢', 0, 's0', 3, 'Comfort: clean, streak 0'],
    ['🟢', 1, 's1', 4, 'Comfort: clean, streak 1'],
    ['🟢', 2, 's2', 5, 'Comfort: clean, streak 2 or more'],
    ['🟢', 7, 's2', 5, 'Comfort: clean, streak 2 or more'],
    ['🟢', undefined, 'clean', 5, 'Comfort: clean'],
    ['🎓', undefined, 'graduated', 6, 'Comfort: graduated'],
    ['🏆', undefined, 'retired', 7, 'Comfort: retired'],
    ['?', undefined, 'unknown', 0, 'Comfort: unknown'],
  ])('maps %s with streak %s to %s', (comfort, streak, key, ordinal, spoken) => {
    expect(comfortStage(comfort, streak)).toEqual({ key, ordinal, spoken });
  });
});

describe('streakFromNote', () => {
  it.each<[string | null, number | null]>([
    ['s0', 0],
    ['prov', 0],
    ['s1', 1],
    ['s2', 2],
    ['dropped', null],
    [null, null],
  ])('maps %s to %s', (note, expected) => {
    expect(streakFromNote(note)).toBe(expected);
  });
});
