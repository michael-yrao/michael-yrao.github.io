import { describe, expect, it, vi } from 'vitest';
import type { FetchImpl } from './aggregate';
import { createWorker } from './index';
import { SOURCES } from './sources';

// createWorker's memo builds one feed by fetching every configured source; the memo tests
// below assert the fetch fan-out multiplies by this count, not a hardcoded "1".
const SOURCE_COUNT = SOURCES.length;

const validIcalBody = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:evt-1@example.com',
  'DTSTART:20261001T120000Z',
  'SUMMARY:Test Event',
  'URL;VALUE=URI:https://example.com/e/1',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

function makeWorker(overrides: { fetchImpl?: FetchImpl; now?: () => number } = {}) {
  const fetchImpl =
    overrides.fetchImpl ?? vi.fn<FetchImpl>(async () => new Response(validIcalBody, { status: 200 }));
  const now = overrides.now ?? (() => Date.UTC(2026, 8, 26, 17));
  return { worker: createWorker({ fetchImpl, now }), fetchImpl };
}

function request(method: string, origin?: string): Request {
  const headers = origin ? { Origin: origin } : undefined;
  return new Request('https://po-events.example.workers.dev/', { method, headers });
}

describe('createWorker CORS', () => {
  it('echoes an allow-listed origin and sets Vary: Origin', async () => {
    const { worker } = makeWorker();
    const response = await worker.handle(request('GET', 'http://localhost:4200'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4200');
    expect(response.headers.get('Vary')).toBe('Origin');
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('does not set Access-Control-Allow-Origin for a disallowed origin', async () => {
    const { worker } = makeWorker();
    const response = await worker.handle(request('GET', 'https://evil.example.com'));
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('answers an OPTIONS preflight with 204 and CORS headers', async () => {
    const { worker } = makeWorker();
    const response = await worker.handle(request('OPTIONS', 'https://progressiveoverflow.com'));
    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://progressiveoverflow.com');
  });

  it('rejects a non-GET/OPTIONS method with 405', async () => {
    const { worker } = makeWorker();
    const response = await worker.handle(request('POST'));
    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, OPTIONS');
  });

  it('sets a 300s Cache-Control on a successful GET', async () => {
    const { worker } = makeWorker();
    const response = await worker.handle(request('GET'));
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=300');
  });
});

describe('createWorker memo', () => {
  it('serves the same built feed within the 5-minute TTL without refetching', async () => {
    let clock = Date.UTC(2026, 8, 26, 17);
    const { worker, fetchImpl } = makeWorker({ now: () => clock });

    await worker.handle(request('GET'));
    clock += 60 * 1000; // +1 minute, still inside the 5-minute TTL
    await worker.handle(request('GET'));

    expect(fetchImpl).toHaveBeenCalledTimes(SOURCE_COUNT);
  });

  it('rebuilds the feed once the memo TTL has elapsed', async () => {
    let clock = Date.UTC(2026, 8, 26, 17);
    const { worker, fetchImpl } = makeWorker({ now: () => clock });

    await worker.handle(request('GET'));
    clock += 6 * 60 * 1000; // +6 minutes, past the 5-minute TTL
    await worker.handle(request('GET'));

    expect(fetchImpl).toHaveBeenCalledTimes(SOURCE_COUNT * 2);
  });

  it('returns valid JSON matching the EventsFeed envelope', async () => {
    const { worker } = makeWorker();
    const response = await worker.handle(request('GET'));
    const body = (await response.json()) as { schemaVersion: number; events: unknown[] };
    expect(body.schemaVersion).toBe(1);
    expect(Array.isArray(body.events)).toBe(true);
  });
});
