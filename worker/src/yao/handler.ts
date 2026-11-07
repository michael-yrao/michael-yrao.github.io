import { checkCoachOwner } from '../coach/owner';
import {
  bearerToken,
  failure,
  isRecord,
  type FetchImpl,
  type HeaderMap,
} from '../github/write-file';
import { gateOrigin, preflight, type PatternSenseEnv } from '../pattern-sense/handler';
import type { YaoView, YaoViewsResponse } from './contract';
import { deviceLabel } from './device';

export const ROUTE_PREFIX = '/yao/';

export const STORY_KEY = 'yao:story';
export const VIEW_PREFIX = 'yao:view:';

const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_TOO_MANY = 429;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_NOT_FOUND = 404;
const HTTP_UNAVAILABLE = 503;
const RANDOM_SUFFIX_BYTES = 3;
const UNKNOWN_IP = 'unknown';
const NO_STORE = 'no-store';
const CORS_METHODS = 'GET, POST, OPTIONS';

interface YaoLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface YaoEnv extends PatternSenseEnv {
  readonly INTERVIEWS: KVNamespace;
  readonly YAO_ATTEMPTS?: YaoLimiter;
  readonly YAO_PASSWORD?: string;
  readonly OWNER_LOGIN?: string;
}

type TimingSafeSubtle = SubtleCrypto & {
  timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean;
};

async function sha256(text: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
}

/** Both inputs are equal-length digests, so a full XOR pass is constant-time. Used where the
 *  Workers-only `timingSafeEqual` is absent (the Node test runtime). */
function isSameBytes(a: ArrayBuffer, b: ArrayBuffer): boolean {
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  return left.reduce((diff, byte, index) => diff | (byte ^ (right[index] ?? 0)), 0) === 0;
}

async function isPasswordMatch(given: string, secret: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(given), sha256(secret)]);
  const compare = (crypto.subtle as TimingSafeSubtle).timingSafeEqual;
  return compare === undefined ? isSameBytes(a, b) : compare.call(crypto.subtle, a, b);
}

async function parsePassword(request: Request): Promise<string | null> {
  try {
    const body: unknown = JSON.parse(await request.text());
    return isRecord(body) && typeof body['password'] === 'string' ? body['password'] : null;
  } catch {
    return null;
  }
}

function randomHex(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(RANDOM_SUFFIX_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function viewFor(request: Request, nowMs: number): YaoView {
  const cf = request.cf;
  return {
    at: new Date(nowMs).toISOString(),
    city: typeof cf?.city === 'string' ? cf.city : '',
    country: typeof cf?.country === 'string' ? cf.country : '',
    device: deviceLabel(request.headers.get('user-agent') ?? ''),
  };
}

async function handleUnlock(
  request: Request,
  env: YaoEnv,
  now: () => number,
  cors: HeaderMap,
): Promise<Response> {
  // The limiter runs first, and a missing binding fails closed.
  if (env.YAO_ATTEMPTS === undefined) return failure(HTTP_UNAVAILABLE, 'rate-limiter-unavailable', cors);
  const key = request.headers.get('cf-connecting-ip') ?? UNKNOWN_IP;
  if (!(await env.YAO_ATTEMPTS.limit({ key })).success) return failure(HTTP_TOO_MANY, 'too-many-tries', cors);

  const password = await parsePassword(request);
  if (password === null) return failure(HTTP_BAD_REQUEST, 'invalid-request', cors);

  if (!env.YAO_PASSWORD) return failure(HTTP_UNAVAILABLE, 'not-configured', cors);
  if (!(await isPasswordMatch(password, env.YAO_PASSWORD)))
    return failure(HTTP_UNAUTHORIZED, 'wrong-password', cors);

  const story = await env.INTERVIEWS.get(STORY_KEY, 'json');
  if (story === null) return failure(HTTP_UNAVAILABLE, 'story-missing', cors);

  const view = viewFor(request, now());
  await env.INTERVIEWS.put(`${VIEW_PREFIX}${view.at}:${randomHex()}`, JSON.stringify(view));
  return Response.json(story, { headers: { ...cors, 'Cache-Control': NO_STORE } });
}

async function readAllViews(kv: KVNamespace): Promise<YaoView[]> {
  const views: YaoView[] = [];
  let cursor: string | undefined;
  do {
    const page = await kv.list({ prefix: VIEW_PREFIX, cursor });
    const values = await Promise.all(page.keys.map((entry) => kv.get<YaoView>(entry.name, 'json')));
    views.push(...values.filter((value): value is YaoView => value !== null));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor !== undefined);
  return views;
}

async function handleViews(
  request: Request,
  env: YaoEnv,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(HTTP_UNAUTHORIZED, 'bad-token', cors);
  if (!env.OWNER_LOGIN) return failure(HTTP_UNAVAILABLE, 'not-configured', cors);

  const refusal = await checkCoachOwner(fetchImpl, token, env.OWNER_LOGIN, cors);
  if (refusal !== null) return refusal;

  const views = (await readAllViews(env.INTERVIEWS)).sort((a, b) => b.at.localeCompare(a.at));
  const body: YaoViewsResponse = { views };
  return Response.json(body, { headers: { ...cors, 'Cache-Control': NO_STORE } });
}

export async function handle(
  request: Request,
  env: YaoEnv,
  fetchImpl: FetchImpl,
  now: () => number = Date.now,
): Promise<Response> {
  const cors = gateOrigin(request, env);
  if (cors instanceof Response) return cors;

  if (request.method === 'OPTIONS') return preflight(cors, CORS_METHODS);

  const { pathname } = new URL(request.url);
  if (pathname === `${ROUTE_PREFIX}unlock`) {
    if (request.method !== 'POST') return failure(HTTP_METHOD_NOT_ALLOWED, 'method-not-allowed', cors);
    return handleUnlock(request, env, now, cors);
  }
  if (pathname === `${ROUTE_PREFIX}views`) {
    if (request.method !== 'GET') return failure(HTTP_METHOD_NOT_ALLOWED, 'method-not-allowed', cors);
    return handleViews(request, env, fetchImpl, cors);
  }
  return failure(HTTP_NOT_FOUND, 'not-found', cors);
}
