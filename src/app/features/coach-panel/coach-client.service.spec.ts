import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import type { CoachEvent, CoachMessageRequest } from '../../core/models/coach.model';
import { CoachClientService } from './coach-client.service';

const FAKE_TOKEN = 'fake-token-for-tests';
const REQUEST: CoachMessageRequest = { sessionId: null, message: 'hi', context: { route: '/', repo: 'o/r' } };

/** A recorded stream: a ping, a split frame and a closing turn_end. */
const SSE_CHUNKS: readonly string[] = [
  ': ping\n\n',
  'event: session\ndata: {"sessionId":"s1","resumed":false,"repoHead":"abc"}\n\nevent: text\nda',
  'ta: {"delta":"hello"}\n\n',
  'event: turn_end\ndata: {"sessionId":"s1","turnCostUsd":0.1,"sessionCostUsd":0.1,"repoHead":"abc","repoChanged":false,"dirty":false,"stopReason":"done"}\n\n',
];

function streamOf(chunks: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

const jsonReply = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function collect(stream: AsyncGenerator<CoachEvent>): Promise<CoachEvent[]> {
  const events: CoachEvent[] = [];
  for await (const e of stream) events.push(e);
  return events;
}

describe('CoachClientService.send', () => {
  let client: CoachClientService;
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [CoachClientService, { provide: AuthService, useValue: { getToken: async () => FAKE_TOKEN } }],
    });
    client = TestBed.inject(CoachClientService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each([
    { name: '401 unauthorized', reply: () => jsonReply(401, { error: 'unauthorized' }), code: 'unauthorized' },
    { name: '403 not-owner', reply: () => jsonReply(403, { error: 'not-owner' }), code: 'not-owner' },
    { name: '429 rate-limited', reply: () => jsonReply(429, { error: 'rate-limited' }), code: 'rate-limited' },
    { name: '502 container-unavailable', reply: () => jsonReply(502, {}), code: 'container-unavailable' },
    { name: '503 container-unavailable', reply: () => jsonReply(503, {}), code: 'container-unavailable' },
    { name: '409 busy', reply: () => jsonReply(409, { error: 'busy' }), code: 'busy' },
  ])('$name arrives as one error event', async ({ reply, code }) => {
    fetchMock.mockResolvedValue(reply());
    expect(await collect(client.send(REQUEST, new AbortController().signal))).toEqual([{ type: 'error', code }]);
  });

  it('streams validated events, skipping the ping, and sends the bearer token', async () => {
    fetchMock.mockResolvedValue(new Response(streamOf(SSE_CHUNKS), { status: 200 }));
    const events = await collect(client.send(REQUEST, new AbortController().signal));
    expect(events.map((e) => e.type)).toEqual(['session', 'text', 'turn_end']);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${FAKE_TOKEN}`);
  });

  it('ends quietly when the signal aborts the request', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementation(async () => {
      controller.abort();
      throw new DOMException('aborted', 'AbortError');
    });
    expect(await collect(client.send(REQUEST, controller.signal))).toEqual([]);
  });
});
