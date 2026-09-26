export const ALLOWED_ORIGINS: readonly string[] = [
  'https://progressiveoverflow.com',
  'https://www.progressiveoverflow.com',
  'http://localhost:4200',
];

/**
 * CORS response headers for one request's `Origin`. Echoes the origin back only when it's on
 * the allow-list (never `*`, since the caller sends no credentials but we still want a real
 * allow-list rather than a wildcard); always varies on `Origin` so shared/edge caches don't
 * serve one origin's CORS headers to another.
 */
export function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return headers;
}
