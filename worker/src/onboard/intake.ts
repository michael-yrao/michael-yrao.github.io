// POST /onboard/intake: writes intake.yml (the learner's name, target, timezone, start date)
// to their own cse-progress repo, unless the repo is already onboarded.
import {
  apiHeaders,
  bearerToken,
  checkRepoOwner,
  contentsUrl,
  failure,
  fetchUser,
  HTTP_FORBIDDEN,
  HTTP_NOT_FOUND,
  HTTP_OK,
  isRecord,
  jsonResponse,
  readJson,
  writeFile,
  type FetchImpl,
  type FileTarget,
  type HeaderMap,
  type RepoTarget,
} from '../github/write-file';
import { LEARNER_REPO } from './validate';

export const INTAKE_PATH = '/onboard/intake';

export const TARGETS = ['fintech_interview', 'faang_interview', 'competitive'] as const;
export type IntakeTarget = (typeof TARGETS)[number];

export const MAX_NAME_CODE_POINTS = 80;
export const START_DATE_WINDOW_DAYS = 30;
// The learner's local today can differ from the Worker's UTC today by a day.
export const LOCAL_DAY_TOLERANCE = 1;

const BRANCH = 'main';
const CONFIG_PATH = 'cse.config.yml';
const INTAKE_FILE = 'intake.yml';
const COMMIT_MESSAGE = 'chore(onboard): intake';
const ISO_DATE_LENGTH = 10;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_INDEX_OFFSET = 1;
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u;
const FIXED_OFFSET_PATTERN = /^[+-]/;

export interface IntakeFields {
  readonly name: string;
  readonly target: IntakeTarget;
  readonly timezone: string;
  readonly startDate: string;
}

export type IntakeCode =
  | 'invalid-request'
  | 'invalid-name'
  | 'invalid-target'
  | 'invalid-timezone'
  | 'invalid-start-date';

export type IntakeParse = { readonly ok: IntakeFields } | { readonly error: IntakeCode };

/**
 * The runtime's canonical name for a timezone, or null when it does not know the zone.
 * Fixed offsets such as "+01:00" resolve but are not zones Python's ZoneInfo accepts, so they are refused.
 */
export function canonicalTimezone(value: string): string | null {
  if (value === '') return null;
  try {
    const name = new Intl.DateTimeFormat('en', { timeZone: value }).resolvedOptions().timeZone;
    return FIXED_OFFSET_PATTERN.test(name) ? null : name;
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}

export function dayNumber(isoDate: string): number | null {
  const match = ISO_DATE_PATTERN.exec(isoDate);
  if (match === null) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const ms = Date.UTC(year, month - MONTH_INDEX_OFFSET, day);
  const isRealDate = new Date(ms).toISOString().slice(0, ISO_DATE_LENGTH) === isoDate;
  return isRealDate ? Math.round(ms / MS_PER_DAY) : null;
}

function isStartDateInWindow(startDate: string, todayIso: string): boolean {
  const start = dayNumber(startDate);
  const today = dayNumber(todayIso);
  if (start === null || today === null) return false;
  return Math.abs(start - today) <= START_DATE_WINDOW_DAYS + LOCAL_DAY_TOLERANCE;
}

function isTarget(value: unknown): value is IntakeTarget {
  return (TARGETS as readonly unknown[]).includes(value);
}

function parseName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (CONTROL_CHARACTER_PATTERN.test(trimmed)) return null;
  const length = [...trimmed].length;
  return length >= 1 && length <= MAX_NAME_CODE_POINTS ? trimmed : null;
}

export function parseIntake(body: unknown, todayIso: string): IntakeParse {
  if (!isRecord(body)) return { error: 'invalid-request' };

  const name = parseName(body['name']);
  if (name === null) return { error: 'invalid-name' };

  const target = body['target'];
  if (!isTarget(target)) return { error: 'invalid-target' };

  const timezoneInput = body['timezone'];
  const timezone = typeof timezoneInput === 'string' ? canonicalTimezone(timezoneInput) : null;
  if (timezone === null) return { error: 'invalid-timezone' };

  const startDate = body['startDate'];
  if (typeof startDate !== 'string' || !isStartDateInWindow(startDate, todayIso))
    return { error: 'invalid-start-date' };

  return { ok: { name, target, timezone, startDate } };
}

/** The four-line file; JSON quoting makes any name a valid double-quoted YAML scalar. */
export function intakeYaml(fields: IntakeFields): string {
  return [
    `name: ${JSON.stringify(fields.name)}`,
    `target: ${fields.target}`,
    `timezone: ${fields.timezone}`,
    `start_date: ${fields.startDate}`,
    '',
  ].join('\n');
}

async function readBody(request: Request): Promise<unknown> {
  try {
    return JSON.parse(await request.text());
  } catch {
    return null;
  }
}

/** Null when no config exists yet (safe to write the intake); else the refusing response. */
async function checkNotOnboarded(
  fetchImpl: FetchImpl,
  token: string,
  target: RepoTarget,
  cors: HeaderMap,
): Promise<Response | null> {
  const url = `${contentsUrl(target, CONFIG_PATH)}?ref=${encodeURIComponent(target.branch)}`;
  const response = await fetchImpl(url, { headers: apiHeaders(token) });
  if (response.status === HTTP_OK) return failure(409, 'already-onboarded', cors);
  if (response.status === HTTP_NOT_FOUND) return null;
  if (response.status === HTTP_FORBIDDEN) return failure(409, 'not-installed', cors);
  return failure(502, 'github-error', cors);
}

export async function handleIntake(
  request: Request,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const token = bearerToken(request);
  if (token === null) return failure(401, 'bad-token', cors);

  const todayIso = new Date().toISOString().slice(0, ISO_DATE_LENGTH);
  const parsed = parseIntake(await readBody(request), todayIso);
  if ('error' in parsed) return failure(400, parsed.error, cors);

  const user = await fetchUser(fetchImpl, token);
  if (user.kind === 'bad-token') return failure(401, 'bad-token', cors);
  if (user.kind === 'error') return failure(502, 'github-error', cors);

  const target: RepoTarget = { owner: user.login, repo: LEARNER_REPO, branch: BRANCH };
  const refusal =
    (await checkRepoOwner(fetchImpl, token, target, user.login, cors)) ??
    (await checkNotOnboarded(fetchImpl, token, target, cors));
  if (refusal !== null) return refusal;

  const file: FileTarget = { ...target, path: INTAKE_FILE };
  const commit = { message: COMMIT_MESSAGE, content: intakeYaml(parsed.ok) };
  const written = await writeFile(fetchImpl, token, file, commit, cors);
  return written.kind === 'refused' ? written.response : jsonResponse(200, { status: 'queued' }, cors);
}
