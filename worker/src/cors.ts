export const ALLOWED_ORIGINS: readonly string[] = [
  'https://progressiveoverflow.com',
  'https://www.progressiveoverflow.com',
  'http://localhost:4200',
];

export const EVENTS_CORS_METHODS = 'GET, OPTIONS';
export const EVENTS_CORS_HEADERS = 'Content-Type';

/**
 * CORS response headers for one request's `Origin`. Echoes the origin back only when it's on
 * the allow-list (never `*`, since the caller sends no credentials but we still want a real
 * allow-list rather than a wildcard); always varies on `Origin` so shared/edge caches don't
 * serve one origin's CORS headers to another. The allowed methods and request headers are
 * per route family, so the events feed and the interview directory each state their own.
 */
export function corsHeaders(
  origin: string | null,
  methods: string = EVENTS_CORS_METHODS,
  allowHeaders: string = EVENTS_CORS_HEADERS,
): Headers {
  const headers = new Headers();
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', methods);
  headers.set('Access-Control-Allow-Headers', allowHeaders);
  return headers;
}
