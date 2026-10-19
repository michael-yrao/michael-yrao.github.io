import type { CoachEvent } from '../../core/models/coach.model';
import { EMPTY_TRANSCRIPT, applyEvent, startTurn, type CoachTranscript } from './coach-transcript';

const OPEN = startTurn(EMPTY_TRANSCRIPT, 'hi');
const WITH_TOOL = applyEvent(OPEN, { type: 'tool_start', id: 't1', label: 'Read SKILL.md' });
const TURN_END: CoachEvent = {
  type: 'turn_end',
  sessionId: 's1',
  turnCostUsd: 0.1,
  sessionCostUsd: 0.7,
  repoHead: 'abc',
  repoChanged: false,
  dirty: false,
  stopReason: 'done',
};

interface Row {
  readonly name: string;
  readonly from: CoachTranscript;
  readonly event: CoachEvent;
  readonly check: (next: CoachTranscript) => void;
}

const ROWS: readonly Row[] = [
  {
    name: 'session sets the id and resumed mark',
    from: OPEN,
    event: { type: 'session', sessionId: 's1', resumed: false, repoHead: 'abc' },
    check: (n) => expect([n.sessionId, n.isResumed]).toEqual(['s1', false]),
  },
  {
    name: 'text appends to the open turn',
    from: applyEvent(OPEN, { type: 'text', delta: 'he' }),
    event: { type: 'text', delta: 'llo' },
    check: (n) => expect(n.turns[0].text).toBe('hello'),
  },
  {
    name: 'tool_start adds a running row',
    from: OPEN,
    event: { type: 'tool_start', id: 't1', label: 'Ran x.py' },
    check: (n) => expect(n.turns[0].tools).toEqual([{ id: 't1', label: 'Ran x.py', status: 'running' }]),
  },
  {
    name: 'tool_end settles the matching row',
    from: WITH_TOOL,
    event: { type: 'tool_end', id: 't1', ok: false },
    check: (n) => expect(n.turns[0].tools[0].status).toBe('failed'),
  },
  {
    name: 'tool_end for an unknown id changes nothing',
    from: WITH_TOOL,
    event: { type: 'tool_end', id: 'ghost', ok: true },
    check: (n) => expect(n).toEqual(WITH_TOOL),
  },
  {
    name: 'turn_end closes the turn and records session and cost',
    from: WITH_TOOL,
    event: TURN_END,
    check: (n) => expect([n.turns[0].status, n.sessionId, n.sessionCostUsd]).toEqual(['done', 's1', 0.7]),
  },
  {
    name: 'an error mid-stream closes the turn with its code',
    from: applyEvent(OPEN, { type: 'text', delta: 'partial' }),
    event: { type: 'error', code: 'sdk-error' },
    check: (n) => expect([n.turns[0].status, n.turns[0].errorCode, n.turns[0].text]).toEqual(['error', 'sdk-error', 'partial']),
  },
  {
    name: 'a text event with no open turn is ignored',
    from: EMPTY_TRANSCRIPT,
    event: { type: 'text', delta: 'stray' },
    check: (n) => expect(n).toEqual(EMPTY_TRANSCRIPT),
  },
];

describe('applyEvent', () => {
  it.each(ROWS)('$name', ({ from, event, check }) => {
    const snapshot = structuredClone(from);
    const next = applyEvent(from, event);
    check(next);
    expect(from).toEqual(snapshot); // the input is never mutated
  });
});
