// POST /engine/approve-week: removes the draft marker line from a week's schedule file in a
// repo the caller owns.
import {
  bearerToken,
  checkOwner,
  failure,
  isRecord,
  jsonResponse,
  readFileWithSha,
  writeFile,
  type FetchImpl,
  type FileTarget,
  type HeaderMap,
} from '../github/write-file';
import { OWNER_PATTERN, REPO_PATTERN } from '../pattern-sense/validate';

export const APPROVE_PATH = '/engine/approve-week';

const BRANCH = 'main';
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_UNAUTHORIZED = 401;
const WEEK_OF_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONDAY_UTC_DAY = 1;
const DRAFT_MARKER_LINE = /^<!-- status: draft -->\r?\n/m;
const SCHEDULE_DIR = 'docs/foundations/schedules';

interface ApproveRequest {
  readonly target: FileTarget;
  readonly weekOf: string;
}

function isMonday(weekOf: string): boolean {
  const date = new Date(`${weekOf}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== weekOf) return false;
  return date.getUTCDay() === MONDAY_UTC_DAY;
}

function parseRequest(text: string): ApproveRequest | null {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(body)) return null;
  const { owner, repo, weekOf } = body;
  if (typeof owner !== 'string' || !OWNER_PATTERN.test(owner)) return null;
  if (typeof repo !== 'string' || !REPO_PATTERN.test(repo)) return null;
  if (typeof weekOf !== 'string' || !WEEK_OF_PATTERN.test(weekOf) || !isMonday(weekOf)) return null;
  const path = `${SCHEDULE_DIR}/${weekOf.replaceAll('-', '')}_schedule.md`;
  return { target: { owner, repo, branch: BRANCH, path }, weekOf };
}

export async function handleApproveWeek(
  request: Request,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(HTTP_UNAUTHORIZED, 'bad-token', cors);

  const parsed = parseRequest(await request.text());
  if (parsed === null) return failure(HTTP_BAD_REQUEST, 'invalid-request', cors);
  const { target, weekOf } = parsed;

  const refusal = await checkOwner(fetchImpl, token, target, cors);
  if (refusal !== null) return refusal;

  const file = await readFileWithSha(fetchImpl, token, target, cors);
  if (file.kind === 'refused') return file.response;
  if (file.kind === 'missing') return failure(HTTP_NOT_FOUND, 'no-week', cors);
  if (!DRAFT_MARKER_LINE.test(file.text)) return failure(HTTP_CONFLICT, 'not-draft', cors);

  const written = await writeFile(
    fetchImpl,
    token,
    target,
    { message: `chore(schedule): approve week of ${weekOf}`, content: file.text.replace(DRAFT_MARKER_LINE, '') },
    cors,
  );
  if (written.kind === 'refused') return written.response;
  return jsonResponse(HTTP_OK, { status: 'approved' }, cors);
}
