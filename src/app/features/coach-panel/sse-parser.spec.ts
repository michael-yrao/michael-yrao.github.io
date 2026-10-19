import type { CoachEvent } from '../../core/models/coach.model';
import { createSseParser } from './sse-parser';

const TEXT_A: CoachEvent = { type: 'text', delta: 'a' };
const TEXT_B: CoachEvent = { type: 'text', delta: 'b' };
const frame = (event: string, data: string): string => `event: ${event}\ndata: ${data}\n\n`;

interface Row {
  readonly name: string;
  readonly chunks: readonly string[];
  readonly events: readonly CoachEvent[];
}

const ROWS: readonly Row[] = [
  {
    name: 'a frame split across chunks, even mid-separator',
    chunks: ['event: text\nda', 'ta: {"delta":"a"}\n', '\n'],
    events: [TEXT_A],
  },
  {
    name: 'several frames in one chunk',
    chunks: [frame('text', '{"delta":"a"}') + frame('text', '{"delta":"b"}')],
    events: [TEXT_A, TEXT_B],
  },
  {
    name: 'CRLF line endings, split between the CR and the LF',
    chunks: ['event: text\r\ndata: {"delta":"a"}\r\n\r', '\n'],
    events: [TEXT_A],
  },
  {
    name: ': comment frames and lines are skipped',
    chunks: [': ping\n\n' + 'event: text\n: note\ndata: {"delta":"a"}\n\n'],
    events: [TEXT_A],
  },
  { name: 'unknown event type', chunks: [frame('mystery', '{"delta":"a"}')], events: [] },
  { name: 'bad JSON', chunks: [frame('text', '{"delta":')], events: [] },
  {
    name: 'missing or mistyped fields, one per variant',
    chunks: [
      frame('text', '{}'),
      frame('session', '{"sessionId":"s","resumed":"yes","repoHead":"h"}'),
      frame('tool_start', '{"id":"t"}'),
      frame('tool_end', '{"id":"t","ok":"true"}'),
      frame('turn_end', '{"sessionId":"s","turnCostUsd":1,"sessionCostUsd":1,"repoHead":"h","repoChanged":true,"dirty":false,"stopReason":"nope"}'),
      frame('error', '{"code":"unheard-of"}'),
    ],
    events: [],
  },
  {
    name: 'the four gateway error codes pass',
    chunks: ['unauthorized', 'not-owner', 'rate-limited', 'container-unavailable'].map((code) =>
      frame('error', `{"code":"${code}"}`),
    ),
    events: [
      { type: 'error', code: 'unauthorized' },
      { type: 'error', code: 'not-owner' },
      { type: 'error', code: 'rate-limited' },
      { type: 'error', code: 'container-unavailable' },
    ],
  },
  {
    name: 'a valid turn_end passes with every field',
    chunks: [frame('turn_end', '{"sessionId":"s","turnCostUsd":0.5,"sessionCostUsd":1.5,"repoHead":"h","repoChanged":true,"dirty":false,"stopReason":"done"}')],
    events: [
      {
        type: 'turn_end',
        sessionId: 's',
        turnCostUsd: 0.5,
        sessionCostUsd: 1.5,
        repoHead: 'h',
        repoChanged: true,
        dirty: false,
        stopReason: 'done',
      },
    ],
  },
];

describe('createSseParser', () => {
  it.each(ROWS)('$name', ({ chunks, events }) => {
    const parser = createSseParser();
    expect(chunks.flatMap((chunk) => parser.push(chunk))).toEqual(events);
  });
});
