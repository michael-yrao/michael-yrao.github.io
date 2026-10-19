import { describe, expect, it } from 'vitest';
import { toCoachEvents, toTurnResult } from './map-sdk.js';

const TEXT_DELTA = {
  type: 'stream_event',
  parent_tool_use_id: null,
  event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } },
};
const SUBAGENT_DELTA = { ...TEXT_DELTA, parent_tool_use_id: 'toolu_parent' };
const NON_TEXT_DELTA = {
  type: 'stream_event',
  parent_tool_use_id: null,
  event: { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{' } },
};
const MESSAGE_START = { type: 'stream_event', parent_tool_use_id: null, event: { type: 'message_start' } };
// The complete message repeats the streamed text; only its tool_use block may produce an event.
const ASSISTANT_WITH_TEXT = {
  type: 'assistant',
  message: { content: [{ type: 'text', text: 'Hello' }] },
};
const ASSISTANT_TOOL = {
  type: 'assistant',
  message: {
    content: [
      { type: 'text', text: 'Hello' },
      { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'python scripts/effort_budget.py' } },
    ],
  },
};
const USER_RESULT_OK = {
  type: 'user',
  message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'fine' }] },
};
const USER_RESULT_ERROR = {
  type: 'user',
  message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_2', is_error: true, content: 'Denied: x' }] },
};
const USER_TEXT_ONLY = { type: 'user', message: { content: 'plain string' } };

describe('toCoachEvents', () => {
  const cases: ReadonlyArray<[string, unknown, unknown[]]> = [
    ['a text delta', TEXT_DELTA, [{ type: 'text', delta: 'Hello' }]],
    ['a subagent text delta', SUBAGENT_DELTA, []],
    ['a non-text delta', NON_TEXT_DELTA, []],
    ['message_start', MESSAGE_START, []],
    ['an assistant message holding only text (already streamed)', ASSISTANT_WITH_TEXT, []],
    ['an assistant tool_use block', ASSISTANT_TOOL, [{ type: 'tool_start', id: 'toolu_1', label: 'Ran effort_budget.py' }]],
    ['a successful tool_result', USER_RESULT_OK, [{ type: 'tool_end', id: 'toolu_1', ok: true }]],
    ['a failed tool_result', USER_RESULT_ERROR, [{ type: 'tool_end', id: 'toolu_2', ok: false }]],
    ['a user message with string content', USER_TEXT_ONLY, []],
    ['a system message', { type: 'system', subtype: 'init' }, []],
    ['a result message', { type: 'result', subtype: 'success' }, []],
    ['not an object', 'text', []],
  ];

  it.each(cases)('maps %s', (_name, message, expected) => {
    expect(toCoachEvents(message)).toEqual(expected);
  });

  it('yields each text exactly once across a streamed turn', () => {
    const turn = [MESSAGE_START, TEXT_DELTA, ASSISTANT_WITH_TEXT, ASSISTANT_TOOL, USER_RESULT_OK];
    const text = turn.flatMap(toCoachEvents).filter((event) => event.type === 'text');
    expect(text).toEqual([{ type: 'text', delta: 'Hello' }]);
  });
});

describe('toTurnResult', () => {
  const base = { type: 'result', session_id: 's1', total_cost_usd: 0.25, is_error: false };
  const cases: ReadonlyArray<[string, unknown, unknown]> = [
    ['success', { ...base, subtype: 'success' }, { sessionId: 's1', totalCostUsd: 0.25, stopReason: 'done' }],
    ['max turns', { ...base, subtype: 'error_max_turns' }, { sessionId: 's1', totalCostUsd: 0.25, stopReason: 'max-turns' }],
    ['execution error', { ...base, subtype: 'error_during_execution' }, { sessionId: 's1', totalCostUsd: 0.25, stopReason: 'error' }],
    ['success flagged as an error', { ...base, subtype: 'success', is_error: true }, { sessionId: 's1', totalCostUsd: 0.25, stopReason: 'error' }],
    ['missing cost and session', { type: 'result', subtype: 'success' }, { sessionId: null, totalCostUsd: 0, stopReason: 'done' }],
    ['a non-result message', { type: 'assistant' }, null],
  ];

  it.each(cases)('reads %s', (_name, message, expected) => {
    expect(toTurnResult(message)).toEqual(expected);
  });
});
