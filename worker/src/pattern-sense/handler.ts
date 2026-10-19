import {
  bearerToken,
  failure,
  writeOwnedFile,
  type FetchImpl,
  type HeaderMap,
} from '../github/write-file';
import { expectedPath, parseResults, parseSaveRequest } from './validate';

// Re-exported so the auth handler keeps one import site for the shared GitHub plumbing.
export {
  failure,
  fetchUser,
  HTTP_OK,
  isRecord,
  jsonResponse,
  readJson,
  type FetchImpl,
  type HeaderMap,
} from '../github/write-file';

export const ROUTE_PREFIX = '/pattern-sense/';

export interface PatternSenseEnv {
  readonly GITHUB_CLIENT_ID: string;
  readonly GITHUB_CLIENT_SECRET: string;
  readonly ALLOWED_ORIGINS: string;
}

const CORS_MAX_AGE_SECONDS = '86400';

function allowedOrigins(env: PatternSenseEnv): readonly string[] {
  return env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
}

function corsHeaders(origin: string): HeaderMap {
  return { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' };
}

/** The CORS headers for an allowed origin, or the 403 refusing the request. */
export function gateOrigin(request: Request, env: PatternSenseEnv): HeaderMap | Response {
  const origin = request.headers.get('Origin');
  if (origin === null || !allowedOrigins(env).includes(origin)) {
    return failure(403, 'origin-not-allowed', {});
  }
  return corsHeaders(origin);
}

export function preflight(cors: HeaderMap, methods = 'POST, OPTIONS'): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...cors,
      'Access-Control-Allow-Methods': methods,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': CORS_MAX_AGE_SECONDS,
    },
  });
}

async function handleSave(
  request: Request,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(401, 'bad-token', cors);

  const save = parseSaveRequest(await request.text());
  if (save === null) return failure(400, 'invalid-request', cors);
  const results = parseResults(save.results);
  if (results === null) return failure(422, 'invalid-results', cors);
  if (save.path !== expectedPath(results.week)) return failure(422, 'invalid-path', cors);

  return writeOwnedFile(
    fetchImpl,
    token,
    save,
    {
      message: `chore(pattern-sense): results for ${results.week}`,
      content: `${JSON.stringify(results, null, 2)}\n`,
    },
    cors,
  );
}

export async function handle(
  request: Request,
  env: PatternSenseEnv,
  fetchImpl: FetchImpl,
): Promise<Response> {
  const cors = gateOrigin(request, env);
  if (cors instanceof Response) return cors;

  if (request.method === 'OPTIONS') return preflight(cors);
  if (request.method !== 'POST') return failure(405, 'method-not-allowed', cors);

  const { pathname } = new URL(request.url);
  if (pathname === `${ROUTE_PREFIX}save`) return handleSave(request, fetchImpl, cors);
  return failure(404, 'not-found', cors);
}
