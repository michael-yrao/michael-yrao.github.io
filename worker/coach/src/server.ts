import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { MAX_BODY_BYTES } from './config.js';
import { COACH_TOKEN_HEADER, SSE_HEARTBEAT_MS, type CoachStatus } from './contract.js';
import { formatEvent, HEARTBEAT_FRAME } from './sse.js';
import type { Session } from './session.js';
import { runTurn, type TurnDeps, type TurnInput } from './turn.js';
import { parseMessageRequest } from './validate.js';

export interface ServerDeps {
  readonly session: Session;
  readonly turnDeps: TurnDeps;
  /** Clones and syncs the repo ahead of the first message; errors are the caller's to log. */
  readonly warm: (token: string) => Promise<void>;
}

const HTTP_OK = 200;
const HTTP_ACCEPTED = 202;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_TOO_LARGE = 413;
const HTTP_INTERNAL_ERROR = 500;

/** Node lowercases incoming header names. */
const TOKEN_HEADER_KEY = COACH_TOKEN_HEADER.toLowerCase();

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function writeFrame(res: ServerResponse, frame: string): void {
  if (!res.writableEnded && !res.destroyed) res.write(frame);
}

function tokenOf(req: IncomingMessage): string | null {
  const header = req.headers[TOKEN_HEADER_KEY];
  return typeof header === 'string' && header !== '' ? header : null;
}

/** The request body as text, or null when it is larger than the cap. */
async function readBody(req: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return null;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function logError(what: string, error: unknown): void {
  console.error(what, error instanceof Error ? error.message : 'unknown error');
}

async function streamTurn(
  res: ServerResponse,
  deps: ServerDeps,
  input: TurnInput,
): Promise<void> {
  const { session } = deps;
  res.writeHead(HTTP_OK, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    'X-Accel-Buffering': 'no',
  });
  const heartbeat = setInterval(() => writeFrame(res, HEARTBEAT_FRAME), SSE_HEARTBEAT_MS);
  let isFinished = false;
  // A browser that goes away mid-turn stops the turn.
  res.on('close', () => {
    if (!isFinished) session.requestInterrupt().catch((error) => logError('interrupt failed', error));
  });

  try {
    for await (const event of runTurn(input, deps.turnDeps)) writeFrame(res, formatEvent(event));
  } finally {
    isFinished = true;
    clearInterval(heartbeat);
    session.release();
    res.end();
  }
}

async function handleMessage(req: IncomingMessage, res: ServerResponse, deps: ServerDeps): Promise<void> {
  const token = tokenOf(req);
  if (token === null) return sendJson(res, HTTP_BAD_REQUEST, { error: 'bad-request' });

  const body = await readBody(req);
  if (body === null) return sendJson(res, HTTP_TOO_LARGE, { error: 'bad-request' });
  const request = parseMessageRequest(parseJson(body));
  if (request === null) return sendJson(res, HTTP_BAD_REQUEST, { error: 'bad-request' });

  if (!deps.session.tryAcquire()) return sendJson(res, HTTP_CONFLICT, { error: 'busy' });
  await streamTurn(res, deps, { request, token });
}

async function handleInterrupt(res: ServerResponse, deps: ServerDeps): Promise<void> {
  await deps.session.requestInterrupt();
  sendJson(res, HTTP_OK, { ok: true });
}

function handleStatus(res: ServerResponse, deps: ServerDeps): void {
  const snapshot = deps.session.snapshot();
  const status: CoachStatus = {
    awake: true,
    busy: snapshot.busy,
    sessionId: snapshot.sessionId,
    repoHead: snapshot.repoHead,
    dirty: snapshot.dirty,
    sessionCostUsd: snapshot.sessionCostUsd,
  };
  sendJson(res, HTTP_OK, status);
}

function handleWake(req: IncomingMessage, res: ServerResponse, deps: ServerDeps): void {
  const token = tokenOf(req);
  if (token === null) return sendJson(res, HTTP_BAD_REQUEST, { error: 'bad-request' });
  if (!deps.session.snapshot().busy) {
    deps.warm(token).catch((error) => logError('warm-up failed', error));
  }
  sendJson(res, HTTP_ACCEPTED, { ok: true });
}

async function route(req: IncomingMessage, res: ServerResponse, deps: ServerDeps): Promise<void> {
  const { pathname } = new URL(req.url ?? '/', 'http://container');
  const key = `${req.method ?? 'GET'} ${pathname}`;
  switch (key) {
    case 'POST /message':
      return handleMessage(req, res, deps);
    case 'POST /interrupt':
      return handleInterrupt(res, deps);
    case 'POST /wake':
      return handleWake(req, res, deps);
    case 'GET /status':
      return handleStatus(res, deps);
    case 'GET /healthz':
      return sendJson(res, HTTP_OK, { ok: true });
    default:
      return sendJson(res, HTTP_NOT_FOUND, { error: 'not-found' });
  }
}

export function createCoachServer(deps: ServerDeps): Server {
  return createServer((req, res) => {
    route(req, res, deps).catch((error) => {
      logError('request failed', error);
      if (!res.headersSent) sendJson(res, HTTP_INTERNAL_ERROR, { error: 'sdk-error' });
      else res.end();
    });
  });
}
