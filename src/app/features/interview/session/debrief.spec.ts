import { CheckKey, Debrief, EMPTY_NOTES, EndSummary, InterviewNotes, debriefMarkdown, parseEndSummary, verdictOf } from './debrief';

const MS_PER_MINUTE = 60_000;
const ENDED_AT = new Date(2026, 9, 5, 10, 0, 0).getTime();
const STARTED_AT = ENDED_AT - 45 * MS_PER_MINUTE - 20_000;

const withChecks = (keys: readonly CheckKey[], move: InterviewNotes['move'] = 'stream'): InterviewNotes => ({
  ...EMPTY_NOTES,
  move,
  checks: {
    restated: keys.includes('restated'),
    survives: keys.includes('survives'),
    tradeoff: keys.includes('tradeoff'),
    approach: keys.includes('approach'),
    coded: keys.includes('coded'),
  },
});

describe('verdictOf', () => {
  const cases: readonly { name: string; notes: InterviewNotes; expected: ReturnType<typeof verdictOf> }[] = [
    { name: 'correct + 3 others', notes: withChecks(['approach', 'restated', 'survives', 'tradeoff']), expected: 'pass' },
    { name: 'correct + 2 others', notes: withChecks(['approach', 'restated', 'survives']), expected: 'partial' },
    { name: 'correct alone', notes: withChecks(['approach']), expected: 'partial' },
    { name: '3 others without correct', notes: withChecks(['restated', 'survives', 'coded']), expected: 'partial' },
    { name: '2 others without correct', notes: withChecks(['restated', 'survives']), expected: 'fail' },
    { name: 'none', notes: withChecks([]), expected: 'fail' },
    { name: 'no move chosen', notes: withChecks(['approach', 'restated', 'survives', 'tradeoff'], null), expected: null },
  ];
  it.each(cases)('$name', ({ notes, expected }) => {
    expect(verdictOf(notes)).toBe(expected);
  });
});

const VALID_NOTES: InterviewNotes = { ...withChecks(['approach', 'coded']), isCold: true, recognition: 'hit', raiserMinute: 34, notes: 'a\nb' };
const VALID_SUMMARY: EndSummary = { v: 1, startedAt: 1000, endedAt: 2000, awayCount: 1, pasteCount: 2, notes: VALID_NOTES };
const mutate = (patch: Record<string, unknown>): unknown => ({ ...VALID_SUMMARY, ...patch });
const mutateNotes = (patch: Record<string, unknown>): unknown => mutate({ notes: { ...VALID_NOTES, ...patch } });
const without = (record: object, key: string): unknown => Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));

describe('parseEndSummary', () => {
  const rejected: readonly { name: string; value: unknown }[] = [
    { name: 'null', value: null },
    { name: 'a string', value: 'summary' },
    { name: 'an array', value: [] },
    { name: 'a wrong version', value: mutate({ v: 2 }) },
    { name: 'a wrong move enum', value: mutateNotes({ move: 'rewrite' }) },
    { name: 'a wrong recognition enum', value: mutateNotes({ recognition: 'maybe' }) },
    { name: 'over-long notes', value: mutateNotes({ notes: 'x'.repeat(4_001) }) },
    { name: 'a negative timestamp', value: mutate({ startedAt: -1 }) },
    { name: 'reversed timestamps', value: mutate({ startedAt: 3000 }) },
    { name: 'a fractional count', value: mutate({ awayCount: 1.5 }) },
    { name: 'a fractional raiser minute', value: mutateNotes({ raiserMinute: 1.5 }) },
    { name: 'an extra summary key', value: mutate({ code: 'x' }) },
    { name: 'a missing summary key', value: without(VALID_SUMMARY, 'pasteCount') },
    { name: 'an extra notes key', value: mutateNotes({ extra: 1 }) },
    { name: 'a missing notes key', value: mutate({ notes: without(VALID_NOTES, 'move') }) },
    { name: 'an extra check key', value: mutateNotes({ checks: { ...VALID_NOTES.checks, extra: true } }) },
    { name: 'a missing check key', value: mutateNotes({ checks: without(VALID_NOTES.checks, 'coded') }) },
    { name: 'a non-boolean check', value: mutateNotes({ checks: { ...VALID_NOTES.checks, coded: 1 } }) },
  ];
  it.each(rejected)('rejects $name', ({ value }) => {
    expect(parseEndSummary(value)).toBeNull();
  });

  it('accepts a valid summary and returns a fresh object', () => {
    const parsed = parseEndSummary(JSON.parse(JSON.stringify(VALID_SUMMARY)));
    expect(parsed).toEqual(VALID_SUMMARY);
    expect(parseEndSummary(VALID_SUMMARY)).not.toBe(VALID_SUMMARY);
  });
});

const FULL: Debrief = {
  sessionId: 'po-abc',
  role: 'interviewer',
  title: 'Two Sum!',
  source: 1,
  summary: { ...VALID_SUMMARY, startedAt: STARTED_AT, endedAt: ENDED_AT, notes: { ...VALID_NOTES, hasTime: true, raiserMinute: 34 } },
  finalCode: 'def f():\n    return 1',
  lastRun: null,
};

const FULL_MARKDOWN = `# Mock debrief — 20261005 two_sum

| | |
|---|---|
| **Problem** | #1 Two Sum! |
| **Cold?** | yes |
| **Time** | 45 min |
| **Base rating** | |

## Clarify

- Questions asked:
- Constraints pinned:

## Base — what came out

- Approach:
- Recognition call: hit
- Complexity stated: time ✅ · space ❌

## Level raiser

- Move: Stream / online
- Thrown at ~minute: 34
- The delta:
- What happened:

| Checklist | | Evidence |
|---|---|---|
| Restated the delta | ❌ | |
| Named what survives | ❌ | |
| Trade-off before code | ❌ | |
| Correct approach | ✅ | |
| Coded if time | ✅ | |

Verdict: partial

## ❓ Open

- a
- b

## Follow-ups

- Ledger entries:
- Tracker row:

## Final code

\`\`\`python
def f():
    return 1
\`\`\`
`;

describe('debriefMarkdown', () => {
  it('fills the template for a full debrief', () => {
    expect(debriefMarkdown(FULL)).toBe(FULL_MARKDOWN);
  });

  it('leaves the level raiser, verdict and open bullets empty when nothing was chosen', () => {
    const bare: Debrief = { ...FULL, summary: { ...FULL.summary, notes: EMPTY_NOTES } };
    const text = debriefMarkdown(bare);
    expect(text).toContain('- Move:\n- Thrown at ~minute:\n');
    expect(text).toContain('- Recognition call:\n');
    expect(text).toContain('\nVerdict:\n');
    expect(text).toContain('## ❓ Open\n\n-\n\n## Follow-ups');
  });

  it('names a hand-written problem without a number', () => {
    expect(debriefMarkdown({ ...FULL, source: null })).toContain('| **Problem** | Two Sum! |');
  });

  it('opens a longer fence than any backtick run in the final code', () => {
    const text = debriefMarkdown({ ...FULL, finalCode: 'print("""\n```\n""")' });
    expect(text).toContain('````python\nprint("""\n```\n""")\n````\n');
  });
});
