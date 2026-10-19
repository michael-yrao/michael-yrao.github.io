import { describe, expect, it } from 'vitest';
import { COACH_TOKEN_HEADER } from './contract';
import { relay, upstreamRequest } from './forward';

const CORS = { 'Access-Control-Allow-Origin': 'https://progressiveoverflow.com' };

describe('upstreamRequest', () => {
  it('carries only Content-Type and the token header', async () => {
    const request = upstreamRequest('message', 'tok-test', '{"a":1}');
    const names = [...request.headers.keys()].sort();
    expect(names).toEqual(['content-type', COACH_TOKEN_HEADER.toLowerCase()]);
    expect(request.headers.get(COACH_TOKEN_HEADER)).toBe('tok-test');
    expect(request.headers.get('Authorization')).toBeNull();
    expect(request.headers.get('Origin')).toBeNull();
    expect(request.headers.get('Cookie')).toBeNull();
    expect(request.method).toBe('POST');
    expect(await request.text()).toBe('{"a":1}');
  });

  it('sends a bodiless GET for status with no Content-Type', () => {
    const request = upstreamRequest('status', 'tok-test', null);
    expect(request.method).toBe('GET');
    expect(request.url).toBe('http://coach.internal/status');
    expect(request.headers.get('Content-Type')).toBeNull();
  });
});

describe('relay', () => {
  const cases: ReadonlyArray<[string, Response, number, string | null]> = [
    ['an event stream', new Response('event: text\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } }), 200, 'text/event-stream'],
    ['a JSON refusal, status kept', new Response('{"error":"busy"}', { status: 409, headers: { 'Content-Type': 'application/json' } }), 409, 'application/json'],
    ['a non-JSON platform error', new Response('<html>', { status: 500, headers: { 'Content-Type': 'text/html' } }), 502, 'application/json'],
  ];

  it.each(cases)('relays %s', async (_name, upstream, status, contentType) => {
    const response = relay(upstream, CORS);
    expect(response.status).toBe(status);
    expect(response.headers.get('Content-Type')).toBe(contentType);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(CORS['Access-Control-Allow-Origin']);
  });

  it('marks the event stream unbuffered', () => {
    const response = relay(new Response('', { headers: { 'Content-Type': 'text/event-stream' } }), CORS);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Accel-Buffering')).toBe('no');
  });
});
