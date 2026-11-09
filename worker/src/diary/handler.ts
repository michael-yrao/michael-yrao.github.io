import { checkCoachOwner } from '../coach/owner';
import { bearerToken, failure, isRecord, type FetchImpl, type HeaderMap } from '../github/write-file';
import { gateOrigin, preflight } from '../pattern-sense/handler';
import { backupDiary } from './backup';
import type {
  DiaryEntry,
  DiaryEntryInput,
  DiaryEntriesResponse,
  DiarySaveResponse,
  DiaryUnlockResponse,
  DiaryView,
  DiaryViewsResponse,
} from './contract';
import { deviceLabel } from './device';
import {
  BACKUP_KEY,
  ENTRY_PREFIX,
  readAllByPrefix,
  readAllEntries,
  sortNewestFirst,
  VIEW_PREFIX,
  type BackupRecord,
  type DiaryEnv,
} from './store';

export type { DiaryEnv } from './store';
export { ENTRY_PREFIX, VIEW_PREFIX } from './store';

export const ROUTE_PREFIX = '/diary/';

export const MAX_TITLE_CHARS = 200;
export const MAX_BODY_CHARS = 50_000;
export const SEEN_WINDOW_HOURS = 12;

const MAX_SEEN_IDS = 500;
const MS_PER_HOUR = 3_600_000;
const ENTRY_SUFFIX_BYTES = 3;
const VISIT_SUFFIX_BYTES = 16;
const HTTP_OK_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_NOT_FOUND = 404;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_GONE = 410;
const HTTP_TOO_MANY = 429;
const HTTP_UNAVAILABLE = 503;
const UNKNOWN_IP = 'unknown';
const NO_STORE = 'no-store';
const CORS_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const ENTRIES_ROUTE = 'entries';
const ENTRY_ROUTE_PREFIX = `${ENTRIES_ROUTE}/`;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ENTRY_ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[0-9a-f]{6}$/;
const VISIT_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z_[0-9a-f]{32}$/;

type ClockFn = () => number;
type WaitUntil = Pick<ExecutionContext, 'waitUntil'>;

interface Call {
  readonly request: Request;
  readonly env: DiaryEnv;
  readonly fetchImpl: FetchImpl;
  readonly ctx: WaitUntil;
  readonly now: ClockFn;
  readonly cors: HeaderMap;
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

async function parseJson(request: Request): Promise<unknown> {
  try {
    return JSON.parse(await request.text());
  } catch {
    return null;
  }
}

function randomHex(byteCount: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function noStoreJson(body: unknown, cors: HeaderMap): Response {
  return Response.json(body, { headers: { ...cors, 'Cache-Control': NO_STORE } });
}

function viewFor(request: Request, nowMs: number): DiaryView {
  const cf = request.cf;
  return {
    at: new Date(nowMs).toISOString(),
    city: typeof cf?.city === 'string' ? cf.city : '',
    country: typeof cf?.country === 'string' ? cf.country : '',
    device: deviceLabel(request.headers.get('user-agent') ?? ''),
    read: [],
  };
}

/** The shared limiter step: a missing binding fails closed (503), a refusal is 429. */
async function limitByIp(call: Call, limiter: DiaryEnv['DIARY_ATTEMPTS']): Promise<Response | null> {
  if (limiter === undefined) return failure(HTTP_UNAVAILABLE, 'rate-limiter-unavailable', call.cors);
  const key = call.request.headers.get('cf-connecting-ip') ?? UNKNOWN_IP;
  const { success } = await limiter.limit({ key });
  return success ? null : failure(HTTP_TOO_MANY, 'too-many-tries', call.cors);
}

async function requireOwner(call: Call): Promise<Response | null> {
  const token = bearerToken(call.request);
  if (token === null) return failure(HTTP_UNAUTHORIZED, 'bad-token', call.cors);
  if (!call.env.OWNER_LOGIN) return failure(HTTP_UNAVAILABLE, 'not-configured', call.cors);
  return checkCoachOwner(call.fetchImpl, token, call.env.OWNER_LOGIN, call.cors);
}

function scheduleBackup(call: Call): void {
  call.ctx.waitUntil(backupDiary(call.env, call.fetchImpl, call.now));
}

async function handleUnlock(call: Call): Promise<Response> {
  const { request, env, cors } = call;
  const refusal = await limitByIp(call, env.DIARY_ATTEMPTS);
  if (refusal !== null) return refusal;

  const body = await parseJson(request);
  const password = isRecord(body) && typeof body['password'] === 'string' ? body['password'] : null;
  if (password === null) return failure(HTTP_BAD_REQUEST, 'invalid-request', cors);

  if (!env.DIARY_PASSWORD) return failure(HTTP_UNAVAILABLE, 'not-configured', cors);
  if (!(await isPasswordMatch(password, env.DIARY_PASSWORD)))
    return failure(HTTP_UNAUTHORIZED, 'wrong-password', cors);

  const view = viewFor(request, call.now());
  const visitId = `${view.at}_${randomHex(VISIT_SUFFIX_BYTES)}`;
  await env.INTERVIEWS.put(`${VIEW_PREFIX}${visitId}`, JSON.stringify(view));
  const entries = sortNewestFirst(await readAllEntries(env.INTERVIEWS));
  const response: DiaryUnlockResponse = { visitId, entries };
  return noStoreJson(response, cors);
}

interface SeenInput {
  visitId: string;
  entryIds: string[];
}

function parseSeen(body: unknown): SeenInput | null {
  if (!isRecord(body)) return null;
  const { visitId, entryIds } = body;
  if (typeof visitId !== 'string' || !VISIT_ID_PATTERN.test(visitId)) return null;
  if (!Array.isArray(entryIds) || entryIds.length > MAX_SEEN_IDS) return null;
  if (!entryIds.every((id): id is string => typeof id === 'string')) return null;
  return { visitId, entryIds };
}

async function existingEntryIds(kv: KVNamespace, ids: readonly string[]): Promise<string[]> {
  const candidates = [...new Set(ids)].filter((id) => ENTRY_ID_PATTERN.test(id));
  const found = await Promise.all(candidates.map((id) => kv.get(`${ENTRY_PREFIX}${id}`)));
  return candidates.filter((_id, index) => found[index] !== null);
}

async function handleSeen(call: Call): Promise<Response> {
  const { env, cors } = call;
  const refusal = await limitByIp(call, env.DIARY_SEEN);
  if (refusal !== null) return refusal;

  const input = parseSeen(await parseJson(call.request));
  if (input === null) return failure(HTTP_BAD_REQUEST, 'invalid-request', cors);

  const viewKey = `${VIEW_PREFIX}${input.visitId}`;
  const view = await env.INTERVIEWS.get<DiaryView>(viewKey, 'json');
  if (view === null) return failure(HTTP_NOT_FOUND, 'not-found', cors);
  if (call.now() - Date.parse(view.at) > SEEN_WINDOW_HOURS * MS_PER_HOUR)
    return failure(HTTP_GONE, 'visit-expired', cors);

  const known = await existingEntryIds(env.INTERVIEWS, input.entryIds);
  const read = [...new Set([...view.read, ...known])];
  await env.INTERVIEWS.put(viewKey, JSON.stringify({ ...view, read }));
  return new Response(null, { status: HTTP_OK_NO_CONTENT, headers: cors });
}

async function handleViews(call: Call): Promise<Response> {
  const refusal = await requireOwner(call);
  if (refusal !== null) return refusal;

  const { env, cors } = call;
  const views = (await readAllByPrefix<DiaryView>(env.INTERVIEWS, VIEW_PREFIX)).sort((a, b) =>
    b.at.localeCompare(a.at),
  );
  const backup = await env.INTERVIEWS.get<BackupRecord>(BACKUP_KEY, 'json');
  const response: DiaryViewsResponse = { views, backupAt: backup?.at ?? null };
  return noStoreJson(response, cors);
}

async function handleListEntries(call: Call): Promise<Response> {
  const refusal = await requireOwner(call);
  if (refusal !== null) return refusal;

  const entries = sortNewestFirst(await readAllEntries(call.env.INTERVIEWS));
  const response: DiaryEntriesResponse = { entries };
  return noStoreJson(response, call.cors);
}

function isCalendarDate(text: string): boolean {
  if (!DATE_PATTERN.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(text);
}

function parseEntryInput(body: unknown): DiaryEntryInput | null {
  if (!isRecord(body)) return null;
  const { date, title, body: text } = body;
  if (typeof date !== 'string' || !isCalendarDate(date)) return null;
  if (typeof title !== 'string' || title.length > MAX_TITLE_CHARS) return null;
  if (typeof text !== 'string' || text.trim() === '' || text.length > MAX_BODY_CHARS) return null;
  return { date, title, body: text };
}

/** Owner check, then validation, then upsert and a backup after the response. */
async function saveEntry(call: Call, idFor: (input: DiaryEntryInput) => string | null): Promise<Response> {
  const refusal = await requireOwner(call);
  if (refusal !== null) return refusal;

  const input = parseEntryInput(await parseJson(call.request));
  if (input === null) return failure(HTTP_BAD_REQUEST, 'invalid-entry', call.cors);
  const id = idFor(input);
  if (id === null) return failure(HTTP_NOT_FOUND, 'not-found', call.cors);

  const entry: DiaryEntry = { id, ...input, updatedAt: new Date(call.now()).toISOString() };
  await call.env.INTERVIEWS.put(`${ENTRY_PREFIX}${id}`, JSON.stringify(entry));
  scheduleBackup(call);
  const response: DiarySaveResponse = { entry };
  return noStoreJson(response, call.cors);
}

function handleCreateEntry(call: Call): Promise<Response> {
  return saveEntry(call, (input) => `${input.date}-${randomHex(ENTRY_SUFFIX_BYTES)}`);
}

function handleUpdateEntry(call: Call, id: string): Promise<Response> {
  return saveEntry(call, () => (ENTRY_ID_PATTERN.test(id) ? id : null));
}

async function handleDeleteEntry(call: Call, id: string): Promise<Response> {
  const refusal = await requireOwner(call);
  if (refusal !== null) return refusal;
  if (!ENTRY_ID_PATTERN.test(id)) return failure(HTTP_NOT_FOUND, 'not-found', call.cors);

  await call.env.INTERVIEWS.delete(`${ENTRY_PREFIX}${id}`);
  scheduleBackup(call);
  return new Response(null, { status: HTTP_OK_NO_CONTENT, headers: call.cors });
}

type RouteHandler = (call: Call) => Promise<Response>;
type EntryHandler = (call: Call, id: string) => Promise<Response>;

const ROUTES: Record<string, Partial<Record<string, RouteHandler>>> = {
  unlock: { POST: handleUnlock },
  seen: { POST: handleSeen },
  views: { GET: handleViews },
  [ENTRIES_ROUTE]: { GET: handleListEntries, POST: handleCreateEntry },
};

const ENTRY_ROUTES: Partial<Record<string, EntryHandler>> = {
  PUT: handleUpdateEntry,
  DELETE: handleDeleteEntry,
};

function dispatch(call: Call, route: string): Promise<Response> | Response {
  const { method } = call.request;
  if (route.startsWith(ENTRY_ROUTE_PREFIX)) {
    const entryHandler = ENTRY_ROUTES[method];
    return entryHandler === undefined
      ? failure(HTTP_METHOD_NOT_ALLOWED, 'method-not-allowed', call.cors)
      : entryHandler(call, route.slice(ENTRY_ROUTE_PREFIX.length));
  }
  const methods = ROUTES[route];
  if (methods === undefined) return failure(HTTP_NOT_FOUND, 'not-found', call.cors);
  const handler = methods[method];
  return handler === undefined
    ? failure(HTTP_METHOD_NOT_ALLOWED, 'method-not-allowed', call.cors)
    : handler(call);
}

export async function handle(
  request: Request,
  env: DiaryEnv,
  fetchImpl: FetchImpl,
  ctx: WaitUntil,
  now: ClockFn = Date.now,
): Promise<Response> {
  const cors = gateOrigin(request, env);
  if (cors instanceof Response) return cors;

  if (request.method === 'OPTIONS') return preflight(cors, CORS_METHODS);

  const { pathname } = new URL(request.url);
  return dispatch({ request, env, fetchImpl, ctx, now, cors }, pathname.slice(ROUTE_PREFIX.length));
}
