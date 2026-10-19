import type { CoachErrorCode, CoachEvent, CoachStopReason } from '../../core/models/coach.model';

export type ToolStatus = 'running' | 'ok' | 'failed';
export type TurnStatus = 'streaming' | CoachStopReason;

export interface ToolRow {
  readonly id: string;
  readonly label: string;
  readonly status: ToolStatus;
}

export interface CoachTurn {
  readonly userText: string;
  readonly text: string;
  readonly tools: readonly ToolRow[];
  readonly status: TurnStatus;
  readonly errorCode: CoachErrorCode | null;
}

export interface CoachTranscript {
  readonly turns: readonly CoachTurn[];
  readonly sessionId: string | null;
  readonly sessionCostUsd: number;
  /** false when the runtime started a fresh session instead of resuming one. */
  readonly isResumed: boolean | null;
}

export const EMPTY_TRANSCRIPT: CoachTranscript = {
  turns: [],
  sessionId: null,
  sessionCostUsd: 0,
  isResumed: null,
};

/** A new transcript with the learner's message and an open, empty coach turn. */
export function startTurn(t: CoachTranscript, userText: string): CoachTranscript {
  const turn: CoachTurn = { userText, text: '', tools: [], status: 'streaming', errorCode: null };
  return { ...t, turns: [...t.turns, turn] };
}

export function isStreaming(t: CoachTranscript): boolean {
  return t.turns.at(-1)?.status === 'streaming';
}

function updateOpenTurn(t: CoachTranscript, change: (turn: CoachTurn) => CoachTurn): CoachTranscript {
  const last = t.turns.at(-1);
  if (last === undefined || last.status !== 'streaming') return t;
  return { ...t, turns: [...t.turns.slice(0, -1), change(last)] };
}

function withToolEnd(tools: readonly ToolRow[], id: string, ok: boolean): readonly ToolRow[] {
  return tools.map((row) => (row.id === id ? { ...row, status: ok ? 'ok' : 'failed' } : row));
}

/** Pure reducer: every call returns a new transcript; events with no open turn (or an unknown tool id) change nothing. */
export function applyEvent(t: CoachTranscript, e: CoachEvent): CoachTranscript {
  switch (e.type) {
    case 'session':
      return { ...t, sessionId: e.sessionId, isResumed: e.resumed };
    case 'text':
      return updateOpenTurn(t, (turn) => ({ ...turn, text: turn.text + e.delta }));
    case 'tool_start':
      return updateOpenTurn(t, (turn) => ({
        ...turn,
        tools: [...turn.tools, { id: e.id, label: e.label, status: 'running' }],
      }));
    case 'tool_end':
      return updateOpenTurn(t, (turn) =>
        turn.tools.some((row) => row.id === e.id) ? { ...turn, tools: withToolEnd(turn.tools, e.id, e.ok) } : turn,
      );
    case 'turn_end':
      return {
        ...updateOpenTurn(t, (turn) => ({ ...turn, status: e.stopReason })),
        sessionId: e.sessionId,
        sessionCostUsd: e.sessionCostUsd,
      };
    case 'error':
      return updateOpenTurn(t, (turn) => ({ ...turn, status: 'error', errorCode: e.code }));
  }
}
