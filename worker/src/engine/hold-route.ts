// POST /engine/hold: set or release a learner-requested deferral in the repo's holds.yml.
// Read tracker row, then read-modify-write holds.yml; one retry when the file moved underneath.
import {
  bearerToken,
  checkOwner,
  failure,
  jsonResponse,
  readFileWithSha,
  putFile,
  type FetchImpl,
  type FileTarget,
  type HeaderMap,
} from '../github/write-file';
import {
  HOLDS_PATH,
  parseHoldRequest,
  removeHold,
  trackerRow,
  TRACKER_PATH,
  upsertHold,
  type HoldEdit,
  type HoldRequest,
} from './hold';

export const HOLD_PATH = '/engine/hold';
const BRANCH = 'main';
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const ISO_DATE_LENGTH = 'YYYY-MM-DD'.length;

interface Ctx {
  readonly fetchImpl: FetchImpl;
  readonly token: string;
  readonly request: HoldRequest;
  readonly row: string;
  readonly cors: HeaderMap;
}

type Attempt = { readonly kind: 'done'; readonly response: Response } | { readonly kind: 'conflict' };

function parseBody(text: string, utcToday: string): ReturnType<typeof parseHoldRequest> {
  try {
    return parseHoldRequest(JSON.parse(text), utcToday);
  } catch {
    return { error: 'invalid-request' };
  }
}

function fileTarget(request: HoldRequest, path: string): FileTarget {
  return { owner: request.owner, repo: request.repo, branch: BRANCH, path };
}

function editFor(ctx: Ctx, holdsText: string | null): HoldEdit {
  const { until, today } = ctx.request;
  return until === null
    ? removeHold(holdsText, ctx.row)
    : upsertHold(holdsText, { row: ctx.row, until, since: today });
}

function commitMessage(request: HoldRequest): string {
  return request.until === null
    ? `chore(hold): ${request.number} released`
    : `chore(hold): ${request.number} until ${request.until}`;
}

function successBody(request: HoldRequest): Record<string, string> {
  return request.until === null ? { status: 'released' } : { status: 'held', until: request.until };
}

function done(response: Response): Attempt {
  return { kind: 'done', response };
}

/** One read-edit-write of holds.yml. */
async function attemptWrite(ctx: Ctx): Promise<Attempt> {
  const { fetchImpl, token, request, cors } = ctx;
  const target = fileTarget(request, HOLDS_PATH);
  const holds = await readFileWithSha(fetchImpl, token, target, cors);
  if (holds.kind === 'refused') return done(holds.response);

  const found = holds.kind === 'found';
  const edit = editFor(ctx, found ? holds.text : null);
  if (edit.kind === 'owned') return done(failure(HTTP_CONFLICT, 'hold-owned-by-decision', cors));
  if (edit.kind === 'unchanged') return done(jsonResponse(HTTP_OK, { status: 'unchanged' }, cors));

  const commit = { message: commitMessage(request), content: edit.text };
  const put = await putFile(fetchImpl, token, target, commit, found ? holds.sha : undefined, cors);
  if (put.kind === 'conflict') return { kind: 'conflict' };
  if (put.kind === 'refused') return done(put.response);
  return done(jsonResponse(HTTP_OK, successBody(request), cors));
}

async function writeWithRetry(ctx: Ctx): Promise<Response> {
  const first = await attemptWrite(ctx);
  if (first.kind === 'done') return first.response;
  const second = await attemptWrite(ctx);
  return second.kind === 'done' ? second.response : failure(HTTP_CONFLICT, 'conflict', ctx.cors);
}

type RowLookup = { readonly row: string } | { readonly response: Response };

async function lookupRow(
  fetchImpl: FetchImpl,
  token: string,
  request: HoldRequest,
  cors: HeaderMap,
): Promise<RowLookup> {
  const tracker = await readFileWithSha(fetchImpl, token, fileTarget(request, TRACKER_PATH), cors);
  if (tracker.kind === 'refused') return { response: tracker.response };
  const row = tracker.kind === 'found' ? trackerRow(tracker.text, request.number, request.title) : null;
  return row === null ? { response: failure(HTTP_NOT_FOUND, 'no-row', cors) } : { row };
}

export async function handleHold(
  request: Request,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(401, 'bad-token', cors);

  const utcToday = new Date().toISOString().slice(0, ISO_DATE_LENGTH);
  const parsed = parseBody(await request.text(), utcToday);
  if ('error' in parsed) return failure(HTTP_BAD_REQUEST, parsed.error, cors);

  const hold = parsed.ok;
  const refusal = await checkOwner(fetchImpl, token, { owner: hold.owner, repo: hold.repo, branch: BRANCH }, cors);
  if (refusal !== null) return refusal;

  const lookup = await lookupRow(fetchImpl, token, hold, cors);
  if ('response' in lookup) return lookup.response;
  return writeWithRetry({ fetchImpl, token, request: hold, row: lookup.row, cors });
}
