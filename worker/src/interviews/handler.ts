import { corsHeaders } from '../cors';
import {
  BODY_MAX_BYTES,
  DIRECTORY_VERSION,
  type CandidateRecordResponse,
  type DirectoryError,
  type DirectoryErrorCode,
  type InterviewerRecordResponse,
  type PutInterviewRequest,
  type PutInterviewResponse,
} from './contract';
import { isValidId, parseBearer, parsePutBody } from './validate';

export const INTERVIEW_TTL_SECONDS = 15_552_000;
export const CANDIDATE_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
export const ROUTE_PREFIX = '/interviews/';
const RETRY_AFTER_SECONDS = '60';
const UNKNOWN_CLIENT = 'unknown';
const ROUTE_SEGMENT_COUNT = 2;
const INTERVIEW_METHODS = 'GET, PUT, DELETE, OPTIONS';
const CANDIDATE_METHODS = 'GET, OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization';
const JSON_TYPE = 'application/json';
const HTTP_INTERNAL_ERROR = 500;
const HTTP_SERVICE_UNAVAILABLE = 503;

const STATUS: Readonly<Record<DirectoryErrorCode, number>> = {
  'bad-id': 400,
  'bad-request': 400,
  unauthorized: 401,
  forbidden: 403,
  'not-found': 404,
  deleted: 410,
  stale: 409,
  'candidate-taken': 409,
  immutable: 409,
  'too-large': 413,
  'unsupported-media-type': 415,
  'rate-limited': 429,
  'method-not-allowed': 405,
};

export interface KvStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export type LimitBucket = 'reads' | 'writes';

export interface InterviewDeps {
  kv: KvStore;
  /** Resolves true when the request may proceed, false when the client is over its limit. */
  limit: (bucket: LimitBucket, key: string) => Promise<boolean>;
  now: () => number;
}

interface InterviewRecord {
  v: 1;
  rev: number;
  tokenHash: string;
  candidateId: string;
  iv: string;
  ciphertext: string;
  cWrittenAt: number;
}

interface DeletedMarker {
  v: 1;
  deleted: true;
  tokenHash: string;
}

interface CandidateRecord {
  v: 1;
  publicRaw: string;
  owner: string;
}

type StoredInterview = InterviewRecord | DeletedMarker;

class HttpError extends Error {
  constructor(
    readonly code: DirectoryErrorCode,
    readonly rev?: number,
  ) {
    super(code);
  }
}

/** Thrown by a `limit` dep whose rate-limit binding is missing: the request is refused, not waved through. */
export class LimiterUnavailableError extends Error {}

function toBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toBase64url(new Uint8Array(digest));
}

/** Constant-time comparison over equal-length strings (both sides are SHA-256 digests). */
function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isDeleted(record: StoredInterview): record is DeletedMarker {
  return 'deleted' in record;
}

/** Reads the body, abandoning the stream as soon as it passes BODY_MAX_BYTES. */
async function readCappedBody(request: Request): Promise<string> {
  if (!request.body) {
    return '';
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > BODY_MAX_BYTES) {
      await reader.cancel();
      throw new HttpError('too-large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

async function readPutBody(request: Request): Promise<PutInterviewRequest> {
  const contentType = request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase();
  if (contentType !== JSON_TYPE) {
    throw new HttpError('unsupported-media-type');
  }
  const declared = request.headers.get('Content-Length');
  if (declared !== null && Number(declared) > BODY_MAX_BYTES) {
    throw new HttpError('too-large');
  }
  const text = await readCappedBody(request);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError('bad-request');
  }
  const body = parsePutBody(parsed);
  if (!body) {
    throw new HttpError('bad-request');
  }
  return body;
}

function requireToken(request: Request): string {
  const token = parseBearer(request.headers.get('Authorization'));
  if (!token) {
    throw new HttpError('unauthorized');
  }
  return token;
}

function jsonResponse(status: number, body: object): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': JSON_TYPE } });
}

function methodNotAllowed(allow: string): Response {
  const body: DirectoryError = { error: 'method-not-allowed' };
  const response = jsonResponse(STATUS['method-not-allowed'], body);
  response.headers.set('Allow', allow);
  return response;
}

function limiterUnavailableResponse(): Response {
  return jsonResponse(HTTP_SERVICE_UNAVAILABLE, { error: 'rate-limiter-unavailable' });
}

function internalErrorResponse(): Response {
  return jsonResponse(HTTP_INTERNAL_ERROR, { error: 'internal' });
}

function errorResponse(error: HttpError): Response {
  const body: DirectoryError =
    error.rev === undefined ? { error: error.code } : { error: error.code, rev: error.rev };
  const response = jsonResponse(STATUS[error.code], body);
  if (error.code === 'rate-limited') {
    response.headers.set('Retry-After', RETRY_AFTER_SECONDS);
  }
  return response;
}

/**
 * The interview directory's request handler, with its KV store, rate limiter and clock
 * injected so tests drive every branch with an in-memory fake. KV has no compare-and-set and
 * is eventually consistent, so the ownership and revision checks are best-effort by design.
 */
export function createInterviewHandler(deps: InterviewDeps) {
  const { kv, now } = deps;

  async function readInterview(id: string): Promise<StoredInterview | null> {
    const raw = await kv.get(`i:${id}`);
    return raw === null ? null : (JSON.parse(raw) as StoredInterview);
  }

  async function readCandidate(id: string): Promise<CandidateRecord | null> {
    const raw = await kv.get(`c:${id}`);
    return raw === null ? null : (JSON.parse(raw) as CandidateRecord);
  }

  function writeInterview(id: string, record: StoredInterview): Promise<void> {
    return kv.put(`i:${id}`, JSON.stringify(record), { expirationTtl: INTERVIEW_TTL_SECONDS });
  }

  function writeCandidate(id: string, record: CandidateRecord): Promise<void> {
    return kv.put(`c:${id}`, JSON.stringify(record), { expirationTtl: INTERVIEW_TTL_SECONDS });
  }

  async function getCandidate(id: string): Promise<CandidateRecordResponse> {
    const record = await readCandidate(id);
    if (!record) {
      throw new HttpError('not-found');
    }
    return { v: DIRECTORY_VERSION, publicRaw: record.publicRaw };
  }

  async function getInterview(id: string): Promise<InterviewerRecordResponse> {
    const record = await readInterview(id);
    if (!record) {
      throw new HttpError('not-found');
    }
    if (isDeleted(record)) {
      throw new HttpError('deleted');
    }
    return { v: DIRECTORY_VERSION, rev: record.rev, iv: record.iv, ciphertext: record.ciphertext };
  }

  async function createInterview(id: string, tokenHash: string, body: PutInterviewRequest): Promise<Response> {
    const existing = await readCandidate(body.candidateId);
    if (existing && existing.owner !== id) {
      throw new HttpError('candidate-taken');
    }
    await writeCandidate(body.candidateId, { v: DIRECTORY_VERSION, publicRaw: body.publicRaw, owner: id });
    await writeInterview(id, {
      v: DIRECTORY_VERSION,
      rev: body.rev,
      tokenHash,
      candidateId: body.candidateId,
      iv: body.iv,
      ciphertext: body.ciphertext,
      cWrittenAt: now(),
    });
    const created: PutInterviewResponse = { rev: body.rev };
    return jsonResponse(201, created);
  }

  async function updateInterview(
    id: string,
    tokenHash: string,
    stored: InterviewRecord,
    body: PutInterviewRequest,
  ): Promise<Response> {
    if (!tokensMatch(tokenHash, stored.tokenHash)) {
      throw new HttpError('forbidden');
    }
    const candidate = await readCandidate(stored.candidateId);
    if (body.candidateId !== stored.candidateId || (candidate !== null && candidate.publicRaw !== body.publicRaw)) {
      throw new HttpError('immutable');
    }
    if (body.rev <= stored.rev) {
      throw new HttpError('stale', stored.rev);
    }
    const timestamp = now();
    const isRefreshDue = candidate === null || timestamp - stored.cWrittenAt > CANDIDATE_REFRESH_MS;
    if (isRefreshDue) {
      await writeCandidate(stored.candidateId, { v: DIRECTORY_VERSION, publicRaw: body.publicRaw, owner: id });
    }
    await writeInterview(id, {
      ...stored,
      rev: body.rev,
      iv: body.iv,
      ciphertext: body.ciphertext,
      cWrittenAt: isRefreshDue ? timestamp : stored.cWrittenAt,
    });
    const updated: PutInterviewResponse = { rev: body.rev };
    return jsonResponse(200, updated);
  }

  async function putInterview(id: string, request: Request): Promise<Response> {
    const token = requireToken(request);
    const body = await readPutBody(request);
    const stored = await readInterview(id);
    if (stored && isDeleted(stored)) {
      throw new HttpError('deleted');
    }
    const tokenHash = await hashToken(token);
    return stored ? updateInterview(id, tokenHash, stored, body) : createInterview(id, tokenHash, body);
  }

  async function deleteInterview(id: string, request: Request): Promise<Response> {
    const token = requireToken(request);
    const stored = await readInterview(id);
    if (!stored) {
      throw new HttpError('not-found');
    }
    if (!tokensMatch(await hashToken(token), stored.tokenHash)) {
      throw new HttpError('forbidden');
    }
    if (!isDeleted(stored)) {
      await kv.delete(`c:${stored.candidateId}`);
      await writeInterview(id, { v: DIRECTORY_VERSION, deleted: true, tokenHash: stored.tokenHash });
    }
    return new Response(null, { status: 204 });
  }

  function route(request: Request, kind: string, id: string): Promise<Response> | Response {
    const { method } = request;
    if (kind === 'c') {
      return method === 'GET' ? getCandidate(id).then((r) => jsonResponse(200, r)) : methodNotAllowed(CANDIDATE_METHODS);
    }
    if (method === 'GET') {
      return getInterview(id).then((r) => jsonResponse(200, r));
    }
    if (method === 'PUT') {
      return putInterview(id, request);
    }
    if (method === 'DELETE') {
      return deleteInterview(id, request);
    }
    return methodNotAllowed(INTERVIEW_METHODS);
  }

  async function guarded(request: Request): Promise<Response> {
    const segments = new URL(request.url).pathname.slice(ROUTE_PREFIX.length).split('/');
    const [kind, id] = segments;
    if (segments.length !== ROUTE_SEGMENT_COUNT || (kind !== 'c' && kind !== 'i') || id === undefined) {
      throw new HttpError('not-found');
    }
    const bucket: LimitBucket = request.method === 'GET' ? 'reads' : 'writes';
    const client = request.headers.get('CF-Connecting-IP') ?? UNKNOWN_CLIENT;
    if (!(await deps.limit(bucket, client))) {
      throw new HttpError('rate-limited');
    }
    if (!isValidId(id)) {
      throw new HttpError('bad-id');
    }
    return route(request, kind, id);
  }

  function errorToResponse(error: unknown): Response {
    if (error instanceof HttpError) {
      return errorResponse(error);
    }
    if (error instanceof LimiterUnavailableError) {
      return limiterUnavailableResponse();
    }
    console.error('interview handler failed', error);
    return internalErrorResponse();
  }

  async function handle(request: Request): Promise<Response> {
    const cors = corsHeaders(request.headers.get('Origin'), INTERVIEW_METHODS, CORS_HEADERS);
    let response: Response;
    if (request.method === 'OPTIONS') {
      response = new Response(null, { status: 204 });
    } else {
      try {
        response = await guarded(request);
      } catch (error) {
        response = errorToResponse(error);
      }
    }
    for (const [name, value] of cors) {
      response.headers.set(name, value);
    }
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }

  return { handle };
}
