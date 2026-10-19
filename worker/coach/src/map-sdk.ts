import type { CoachEvent, CoachStopReason } from './contract.js';
import { toolLabel } from './tool-label.js';

// SDK messages arrive as `unknown`: each field is checked where it is read, so a changed SDK shape
// yields no events rather than a crash.

type MappedEvent = Extract<CoachEvent, { type: 'text' | 'tool_start' | 'tool_end' }>;

export interface TurnResult {
  readonly sessionId: string | null;
  readonly totalCostUsd: number;
  readonly stopReason: CoachStopReason;
}

const MAX_TURNS_SUBTYPE = 'error_max_turns';
const SUCCESS_SUBTYPE = 'success';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function contentBlocks(message: Record<string, unknown>): Record<string, unknown>[] {
  const content = asRecord(message['message'])?.['content'];
  if (!Array.isArray(content)) return [];
  return content.map(asRecord).filter((block): block is Record<string, unknown> => block !== null);
}

function textDelta(message: Record<string, unknown>): MappedEvent[] {
  if (message['parent_tool_use_id'] !== null && message['parent_tool_use_id'] !== undefined) return [];
  const event = asRecord(message['event']);
  const delta = asRecord(event?.['delta']);
  if (event?.['type'] !== 'content_block_delta' || delta?.['type'] !== 'text_delta') return [];
  const text = delta['text'];
  return typeof text === 'string' && text !== '' ? [{ type: 'text', delta: text }] : [];
}

function toolStarts(message: Record<string, unknown>): MappedEvent[] {
  return contentBlocks(message).flatMap((block) => {
    const { type, id, name, input } = block;
    if (type !== 'tool_use' || typeof id !== 'string' || typeof name !== 'string') return [];
    return [{ type: 'tool_start' as const, id, label: toolLabel(name, input) }];
  });
}

function toolEnds(message: Record<string, unknown>): MappedEvent[] {
  return contentBlocks(message).flatMap((block) => {
    const id = block['tool_use_id'];
    if (block['type'] !== 'tool_result' || typeof id !== 'string') return [];
    return [{ type: 'tool_end' as const, id, ok: block['is_error'] !== true }];
  });
}

/**
 * The coach events one SDK message carries. Text comes only from streamed deltas: the complete
 * assistant message repeats it, so its text blocks are ignored.
 */
export function toCoachEvents(raw: unknown): readonly MappedEvent[] {
  const message = asRecord(raw);
  if (message === null) return [];
  switch (message['type']) {
    case 'stream_event':
      return textDelta(message);
    case 'assistant':
      return toolStarts(message);
    case 'user':
      return toolEnds(message);
    default:
      return [];
  }
}

function stopReasonOf(result: Record<string, unknown>): CoachStopReason {
  if (result['subtype'] === MAX_TURNS_SUBTYPE) return 'max-turns';
  const isSuccess = result['subtype'] === SUCCESS_SUBTYPE && result['is_error'] !== true;
  return isSuccess ? 'done' : 'error';
}

/** The turn-complete summary when `raw` is an SDK result message, else null. */
export function toTurnResult(raw: unknown): TurnResult | null {
  const message = asRecord(raw);
  if (message === null || message['type'] !== 'result') return null;
  const cost = message['total_cost_usd'];
  const sessionId = message['session_id'];
  return {
    sessionId: typeof sessionId === 'string' ? sessionId : null,
    totalCostUsd: typeof cost === 'number' && Number.isFinite(cost) ? cost : 0,
    stopReason: stopReasonOf(message),
  };
}
