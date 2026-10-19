import { failure, type HeaderMap } from '../github/write-file';
import { COACH_TOKEN_HEADER } from './contract';

export type CoachRoute = 'message' | 'interrupt' | 'wake' | 'status';

// The host is a placeholder: a Container stub ignores it and forwards to the container's port.
const UPSTREAM_ORIGIN = 'http://coach.internal';
const SSE_CONTENT_TYPE = 'text/event-stream';
const JSON_CONTENT_TYPE = 'application/json';
const HTTP_BAD_GATEWAY = 502;

/**
 * The request sent to the container: only Content-Type and the GitHub token header. The browser's
 * Authorization, Origin and Cookie never go through. `signal` carries a client disconnect upstream.
 */
export function upstreamRequest(
  route: CoachRoute,
  token: string,
  body: string | null,
  signal?: AbortSignal,
): Request {
  const headers = new Headers({ [COACH_TOKEN_HEADER]: token });
  if (body !== null) headers.set('Content-Type', JSON_CONTENT_TYPE);
  return new Request(`${UPSTREAM_ORIGIN}/${route}`, {
    method: route === 'status' ? 'GET' : 'POST',
    headers,
    ...(body === null ? {} : { body }),
    ...(signal === undefined ? {} : { signal }),
  });
}

/** The container's event stream, piped through unbuffered. */
export function streamThrough(upstream: Response, cors: HeaderMap): Response {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...cors,
      'Content-Type': SSE_CONTENT_TYPE,
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}

/** A JSON reply from the container, with its status kept. */
export function relayJson(upstream: Response, cors: HeaderMap): Response {
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { ...cors, 'Content-Type': JSON_CONTENT_TYPE, 'Cache-Control': 'no-store' },
  });
}

/** Streams an SSE reply, relays a JSON one, and turns anything else into a 502. */
export function relay(upstream: Response, cors: HeaderMap): Response {
  const contentType = upstream.headers.get('Content-Type') ?? '';
  if (contentType.startsWith(SSE_CONTENT_TYPE)) return streamThrough(upstream, cors);
  if (contentType.startsWith(JSON_CONTENT_TYPE)) return relayJson(upstream, cors);
  return failure(HTTP_BAD_GATEWAY, 'container-error', cors);
}
