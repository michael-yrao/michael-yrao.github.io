import { describe, expect, it } from 'vitest';
import {
  HOLD_WHY,
  MAX_TITLE_CODE_POINTS,
  parseHoldRequest,
  removeHold,
  trackerRow,
  upsertHold,
  type HoldEdit,
  type HoldFields,
} from './hold';

const UTC_TODAY = '2026-10-20';
const LAST_ALLOWED_UNTIL = '2027-01-18';
const FIRST_REFUSED_UNTIL = '2027-01-19';
const LINE_SEPARATOR = String.fromCharCode(0x2028);

const VALID_BODY = {
  owner: 'alice',
  repo: 'cse-progress',
  number: 853,
  title: 'Car Fleet',
  until: '2026-11-01',
  today: UTC_TODAY,
};

describe('parseHoldRequest', () => {
  const cases: ReadonlyArray<{
    name: string;
    body: unknown;
    expected: 'ok' | string;
  }> = [
    { name: 'valid set', body: VALID_BODY, expected: 'ok' },
    { name: 'valid release', body: { ...VALID_BODY, until: null }, expected: 'ok' },
    { name: 'non-object body', body: 'hold', expected: 'invalid-request' },
    { name: 'bad owner', body: { ...VALID_BODY, owner: 'a/b' }, expected: 'invalid-target' },
    { name: 'number 0', body: { ...VALID_BODY, number: 0 }, expected: 'invalid-number' },
    { name: 'non-integer number', body: { ...VALID_BODY, number: 1.5 }, expected: 'invalid-number' },
    { name: 'empty title', body: { ...VALID_BODY, title: '  ' }, expected: 'invalid-title' },
    { name: 'control char in title', body: { ...VALID_BODY, title: 'a\tb' }, expected: 'invalid-title' },
    {
      name: 'U+2028 in title',
      body: { ...VALID_BODY, title: `a${LINE_SEPARATOR}b` },
      expected: 'invalid-title',
    },
    {
      name: 'title over the cap',
      body: { ...VALID_BODY, title: 'x'.repeat(MAX_TITLE_CODE_POINTS + 1) },
      expected: 'invalid-title',
    },
    { name: 'today off by 2', body: { ...VALID_BODY, today: '2026-10-22' }, expected: 'invalid-today' },
    { name: 'today off by 1', body: { ...VALID_BODY, today: '2026-10-19' }, expected: 'ok' },
    { name: 'until equals today', body: { ...VALID_BODY, until: UTC_TODAY }, expected: 'invalid-until' },
    { name: 'until at the cap', body: { ...VALID_BODY, until: LAST_ALLOWED_UNTIL }, expected: 'ok' },
    {
      name: 'until one past the cap',
      body: { ...VALID_BODY, until: FIRST_REFUSED_UNTIL },
      expected: 'invalid-until',
    },
    { name: 'until not a real date', body: { ...VALID_BODY, until: '2026-02-30' }, expected: 'invalid-until' },
  ];

  it.each(cases)('$name', ({ body, expected }) => {
    const result = parseHoldRequest(body, UTC_TODAY);
    if (expected === 'ok') expect('ok' in result).toBe(true);
    else expect(result).toEqual({ error: expected });
  });

});

describe('trackerRow', () => {
  const HEADER = '| Difficulty | Problem | Comfort | Streak | Next Review Date | Latest Rep Date | Rep Dates |';
  const TRACKER = [
    HEADER,
    '|---|---|---|---|---|---|---|',
    '| Medium | [853. Car Fleet](https://leetcode.com/problems/car-fleet/) | 🟡 | 0 |',
    '| Medium | [743. Network Delay Time (Dijkstra — array-scan)](https://leetcode.com/problems/network-delay-time/) | 🟡 |',
    '| Medium | [743. Network Delay Time (Dijkstra — min-heap)](https://leetcode.com/problems/network-delay-time/) | 🟢 |',
    '| Hard | [9. Say "hi" — ok](https://leetcode.com/problems/x/) | 🟡 |',
    '',
    '| Difficulty | Problem | Trigger | Notes |',
    '|---|---|---|---|',
    '| Medium | [300. Longest Increasing Subsequence](https://leetcode.com/problems/lis/) | `graduates:300` | |',
  ].join('\n');
  const NO_HEADER = '| Medium | [853. Car Fleet](https://leetcode.com/problems/car-fleet/) | 🟡 | 0 |';

  const cases: ReadonlyArray<{
    name: string;
    text?: string;
    number: number;
    title: string;
    expected: string | null;
  }> = [
    { name: 'unique row', number: 853, title: 'Car Fleet', expected: '853. Car Fleet' },
    {
      name: 'variant row',
      number: 743,
      title: 'Network Delay Time (Dijkstra — min-heap)',
      expected: '743. Network Delay Time (Dijkstra — min-heap)',
    },
    { name: 'missing', number: 1, title: 'Two Sum', expected: null },
    { name: 'em dash and quote', number: 9, title: 'Say "hi" — ok', expected: '9. Say "hi" — ok' },
    {
      name: 'link only in a later non-tracker table',
      number: 300,
      title: 'Longest Increasing Subsequence',
      expected: null,
    },
    { name: 'no tracker header', text: NO_HEADER, number: 853, title: 'Car Fleet', expected: null },
  ];

  it.each(cases)('$name', ({ text, number, title, expected }) => {
    expect(trackerRow(text ?? TRACKER, number, title)).toBe(expected);
  });
});

describe('upsertHold and removeHold', () => {
  const HOLDS = `# Learner-requested deferrals past the ladder date. Hand-authored.
# scripts/update_review_dates.py sets a row's Next Review = max(ladder date, \`until\`);
# once \`until\` has passed the hold changes nothing. \`row\` is the tracker row's problem
# title exactly as dsa_progress.md shows it; \`why\` is a decisions.yml id.

# 743 array-scan runs with its Dense Dijkstra siblings (dense-dijkstra-split-oct04).
- row: "743. Network Delay Time (Dijkstra — array-scan)"
  until: 2026-12-07
  since: 2026-10-05
  why: tracker-hold-oct11

# Fri Oct 16 ended early; 648 moves to Sat, 124 to the Oct 19 build (reseat-648-124-oct16).
# 648's Sat Oct 17 hold was superseded Oct 18 by the entry below (sun-oct18-wedding-lite-reseat).
- row: "124. Binary Tree Maximum Path Sum"
  until: 2026-10-19
  since: 2026-10-16
  why: reseat-648-124-oct16

# Sat Oct 17 not attempted; Sun Oct 18 rebuilt to the wedding-lite size (sun-oct18-wedding-lite-reseat).
- row: "648. Replace Words"
  until: 2026-10-19
  since: 2026-10-18
  why: sun-oct18-wedding-lite-reseat
- row: "452. Minimum Number of Arrows to Burst Balloons"
  until: 2026-10-19
  since: 2026-10-18
  why: sun-oct18-wedding-lite-reseat
- row: "853. Car Fleet"
  until: 2026-10-20
  since: 2026-10-18
  why: sun-oct18-wedding-lite-reseat
`;
  const FIRST: HoldFields = { row: '300. Longest Increasing Subsequence', until: '2026-11-01', since: '2026-10-20' };
  const SECOND: HoldFields = { ...FIRST, until: '2026-11-15', since: '2026-10-21' };
  const QUOTED: HoldFields = { row: '9. Say "hi" — ok', until: '2026-11-01', since: '2026-10-20' };
  const QUOTED_LATER: HoldFields = { ...QUOTED, until: '2026-11-15', since: '2026-10-21' };

  function block(hold: HoldFields, eol = '\n'): string {
    return [
      `- row: ${JSON.stringify(hold.row)}`,
      `  until: ${hold.until}`,
      `  since: ${hold.since}`,
      `  why: ${HOLD_WHY}`,
    ].join(eol) + eol;
  }

  function text(edit: HoldEdit): string {
    if (edit.kind !== 'text') throw new Error(`expected text, got ${edit.kind}`);
    return edit.text;
  }

  const CRLF_HOLDS = HOLDS.replaceAll('\n', '\r\n');

  const cases: ReadonlyArray<{ name: string; actual: () => HoldEdit; expected: HoldEdit }> = [
    {
      name: 'upsert appends, every other byte unchanged',
      actual: () => upsertHold(HOLDS, FIRST),
      expected: { kind: 'text', text: HOLDS + block(FIRST) },
    },
    {
      name: 'upsert replaces the site block',
      actual: () => upsertHold(text(upsertHold(HOLDS, FIRST)), SECOND),
      expected: { kind: 'text', text: HOLDS + block(SECOND) },
    },
    {
      name: 'upsert twice on a row with quotes replaces, not duplicates',
      actual: () => upsertHold(text(upsertHold(HOLDS, QUOTED)), QUOTED_LATER),
      expected: { kind: 'text', text: HOLDS + block(QUOTED_LATER) },
    },
    {
      name: 'upsert refuses a decision hold',
      actual: () =>
        upsertHold(HOLDS, { ...FIRST, row: '743. Network Delay Time (Dijkstra — array-scan)' }),
      expected: { kind: 'owned', why: 'tracker-hold-oct11' },
    },
    {
      name: 'upsert on a missing file writes the block alone',
      actual: () => upsertHold(null, FIRST),
      expected: { kind: 'text', text: block(FIRST) },
    },
    {
      name: 'upsert keeps CRLF',
      actual: () => upsertHold(CRLF_HOLDS, FIRST),
      expected: { kind: 'text', text: CRLF_HOLDS + block(FIRST, '\r\n') },
    },
    {
      name: 'remove deletes the site block',
      actual: () => removeHold(HOLDS + block(FIRST), FIRST.row),
      expected: { kind: 'text', text: HOLDS },
    },
    { name: 'remove with no entry', actual: () => removeHold(HOLDS, FIRST.row), expected: { kind: 'unchanged' } },
    { name: 'remove on a missing file', actual: () => removeHold(null, FIRST.row), expected: { kind: 'unchanged' } },
    {
      name: 'remove refuses a decision hold',
      actual: () => removeHold(HOLDS, '853. Car Fleet'),
      expected: { kind: 'owned', why: 'sun-oct18-wedding-lite-reseat' },
    },
  ];

  it.each(cases)('$name', ({ actual, expected }) => {
    expect(actual()).toEqual(expected);
  });
});
