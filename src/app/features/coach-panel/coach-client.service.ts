import { Injectable, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';
import { WORKER_API_URL } from '../../core/data/site-links';
import type {
  CoachErrorCode,
  CoachEvent,
  CoachMessageRequest,
  CoachStatus,
} from '../../core/models/coach.model';
import { createSseParser } from './sse-parser';

const ROUTE_PREFIX = 'coach/';
const HTTP_CONFLICT = 409;
const HTTP_BAD_REQUEST = 400;
const HTTP_TOO_LARGE = 413;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_BAD_GATEWAY = 502;
const HTTP_SERVICE_UNAVAILABLE = 503;

const errorEvent = (code: CoachErrorCode): CoachEvent => ({ type: 'error', code });

/** A failed pre-stream reply to the one error code the panel can show. */
function codeForFailure(status: number, reason: string | null): CoachErrorCode {
  if (status === HTTP_CONFLICT || reason === 'busy') return 'busy';
  if (status === HTTP_BAD_REQUEST || status === HTTP_TOO_LARGE || reason === 'bad-request') return 'bad-request';
  if (status === HTTP_UNAUTHORIZED) return 'unauthorized';
  if (status === HTTP_FORBIDDEN) return 'not-owner';
  if (status === HTTP_TOO_MANY_REQUESTS) return 'rate-limited';
  if (status === HTTP_BAD_GATEWAY || status === HTTP_SERVICE_UNAVAILABLE) return 'container-unavailable';
  return 'sdk-error';
}

/** The `{error}` string of a JSON failure body; null when the body is anything else. */
async function failureReason(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json();
    const reason = typeof body === 'object' && body !== null ? (body as Record<string, unknown>)['error'] : null;
    return typeof reason === 'string' ? reason : null;
  } catch {
    return null;
  }
}

function isCoachStatus(value: unknown): value is CoachStatus {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['awake'] === 'boolean' &&
    typeof v['busy'] === 'boolean' &&
    (v['sessionId'] === null || typeof v['sessionId'] === 'string') &&
    (v['repoHead'] === null || typeof v['repoHead'] === 'string') &&
    typeof v['dirty'] === 'boolean' &&
    typeof v['sessionCostUsd'] === 'number'
  );
}

/** Talks to the Worker's `/coach/*` routes as the signed-in owner. Provided by the panel, not the root. */
@Injectable()
export class CoachClientService {
  private readonly auth = inject(AuthService);

  /** Streams one turn. Pre-stream failures arrive as one `error` event; an aborted signal just ends the stream. */
  async *send(request: CoachMessageRequest, signal: AbortSignal): AsyncGenerator<CoachEvent> {
    const token = await this.auth.getToken();
    if (token === null) {
      yield errorEvent('unauthorized');
      return;
    }
    let response: Response;
    try {
      response = await fetch(`${WORKER_API_URL}${ROUTE_PREFIX}message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(request),
        signal,
      });
    } catch {
      if (!signal.aborted) yield errorEvent('sdk-error');
      return;
    }
    if (!response.ok || response.body === null) {
      yield errorEvent(codeForFailure(response.status, await failureReason(response)));
      return;
    }
    yield* this.readEvents(response.body, signal);
  }

  async interrupt(): Promise<void> {
    await this.post('interrupt');
  }

  /** Fire and forget: warms the container on first open. */
  wake(): void {
    void this.post('wake');
  }

  /** The runtime's state; null when unreachable, refused or malformed. */
  async status(): Promise<CoachStatus | null> {
    const response = await this.request('status', 'GET');
    if (response === null || !response.ok) return null;
    try {
      const body: unknown = await response.json();
      return isCoachStatus(body) ? body : null;
    } catch {
      return null;
    }
  }

  private async *readEvents(body: ReadableStream<Uint8Array>, signal: AbortSignal): AsyncGenerator<CoachEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    const parser = createSseParser();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return;
        yield* parser.push(decoder.decode(value, { stream: true }));
      }
    } catch {
      if (!signal.aborted) yield errorEvent('sdk-error');
    } finally {
      void reader.cancel().catch(() => undefined);
    }
  }

  private async post(route: string): Promise<void> {
    await this.request(route, 'POST');
  }

  private async request(route: string, method: 'GET' | 'POST'): Promise<Response | null> {
    const token = await this.auth.getToken();
    if (token === null) return null;
    try {
      return await fetch(`${WORKER_API_URL}${ROUTE_PREFIX}${route}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      return null;
    }
  }
}
