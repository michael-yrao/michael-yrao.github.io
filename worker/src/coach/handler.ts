import {
  bearerToken,
  failure,
  jsonResponse,
  type FetchImpl,
  type HeaderMap,
} from '../github/write-file';
import { LimiterUnavailableError } from '../interviews/handler';
import { gateOrigin, preflight, type PatternSenseEnv } from '../pattern-sense/handler';
import type { CoachStatus } from './contract';
import { relay, upstreamRequest, type CoachRoute } from './forward';
import { checkCoachOwner } from './owner';
import { parseCoachRequest } from './validate';

export const ROUTE_PREFIX = '/coach/';

/** The variables the coach routes and the container read from the Worker's env. */
export interface CoachVars {
  readonly OWNER_LOGIN: string;
  readonly COACH_GIT_NAME: string;
  readonly COACH_GIT_EMAIL: string;
  readonly COACH_TZ: string;
  readonly ANTHROPIC_API_KEY: string;
}

/** What the handler needs of the Container stub; the real stub is injected from index.coach.ts. */
export interface CoachStub {
  fetch(request: Request): Promise<Response>;
  /** Reads the stored container state without starting the container. */
  getState(): Promise<{ readonly status: string }>;
}

/** Everything the live coach needs; the handler gets null instead when the coach runtime is not deployed. */
export interface CoachWiring {
  readonly stub: CoachStub;
  /** True when the request may proceed; throws LimiterUnavailableError when the binding is missing. */
  readonly limit: (key: string) => Promise<boolean>;
  /** The one GitHub login the coach serves. */
  readonly ownerLogin: string;
}

interface RouteSpec {
  readonly route: CoachRoute;
  readonly method: 'GET' | 'POST';
}

const ROUTES: Readonly<Record<string, RouteSpec>> = {
  [`${ROUTE_PREFIX}message`]: { route: 'message', method: 'POST' },
  [`${ROUTE_PREFIX}interrupt`]: { route: 'interrupt', method: 'POST' },
  [`${ROUTE_PREFIX}wake`]: { route: 'wake', method: 'POST' },
  [`${ROUTE_PREFIX}status`]: { route: 'status', method: 'GET' },
};

const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const AWAKE_STATES: ReadonlySet<string> = new Set(['running', 'healthy']);
const UNKNOWN_CLIENT_KEY = 'unknown';
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVICE_UNAVAILABLE = 503;
const HTTP_BAD_GATEWAY = 502;

const ASLEEP_STATUS: CoachStatus = {
  awake: false,
  busy: false,
  sessionId: null,
  repoHead: null,
  dirty: false,
  sessionCostUsd: 0,
};

const DISABLED_STATUS: CoachStatus = { ...ASLEEP_STATUS, enabled: false };

async function limitRequest(
  request: Request,
  deps: CoachWiring,
  cors: HeaderMap,
): Promise<Response | null> {
  const key = request.headers.get('CF-Connecting-IP') ?? UNKNOWN_CLIENT_KEY;
  try {
    return (await deps.limit(key)) ? null : failure(HTTP_TOO_MANY_REQUESTS, 'rate-limited', cors);
  } catch (error) {
    if (error instanceof LimiterUnavailableError) {
      return failure(HTTP_SERVICE_UNAVAILABLE, 'rate-limiter-unavailable', cors);
    }
    throw error;
  }
}

async function isAwake(stub: CoachStub): Promise<boolean> {
  try {
    return AWAKE_STATES.has((await stub.getState()).status);
  } catch (error) {
    console.error('coach state read failed', error instanceof Error ? error.message : 'unknown error');
    return false;
  }
}

function asleepResponse(cors: HeaderMap): Response {
  return jsonResponse(200, ASLEEP_STATUS, { ...cors, 'Cache-Control': 'no-store' });
}

/** The answer when no coach runtime is deployed: a status read says so, every other route is refused. */
function disabledResponse(route: CoachRoute, cors: HeaderMap): Response {
  if (route === 'status') return jsonResponse(200, DISABLED_STATUS, { ...cors, 'Cache-Control': 'no-store' });
  return failure(HTTP_SERVICE_UNAVAILABLE, 'coach-disabled', cors);
}

async function forward(
  stub: CoachStub,
  upstream: Request,
  cors: HeaderMap,
): Promise<Response> {
  try {
    return relay(await stub.fetch(upstream), cors);
  } catch (error) {
    console.error('coach container fetch failed', error instanceof Error ? error.message : 'unknown error');
    return failure(HTTP_BAD_GATEWAY, 'container-unavailable', cors);
  }
}

async function handleStatus(token: string, deps: CoachWiring, cors: HeaderMap): Promise<Response> {
  // Asleep or unknown means asleep: the container is never started, or even fetched, for a status read.
  if (!(await isAwake(deps.stub))) return asleepResponse(cors);
  const response = await forward(deps.stub, upstreamRequest('status', token, null), cors);
  return response.ok ? response : asleepResponse(cors);
}

async function handleMessage(
  request: Request,
  token: string,
  deps: CoachWiring,
  cors: HeaderMap,
): Promise<Response> {
  const parsed = parseCoachRequest(await request.text());
  if (parsed === null) return failure(400, 'bad-request', cors);
  const upstream = upstreamRequest('message', token, JSON.stringify(parsed), request.signal);
  return forward(deps.stub, upstream, cors);
}

export async function handle(
  request: Request,
  env: PatternSenseEnv,
  fetchImpl: FetchImpl,
  deps: CoachWiring | null,
): Promise<Response> {
  const cors = gateOrigin(request, env);
  if (cors instanceof Response) return cors;

  if (request.method === 'OPTIONS') return preflight(cors, ALLOWED_METHODS);

  const target = ROUTES[new URL(request.url).pathname];
  if (target === undefined) return failure(404, 'not-found', cors);
  if (request.method !== target.method) return failure(405, 'method-not-allowed', cors);
  if (deps === null) return disabledResponse(target.route, cors);

  const token = bearerToken(request);
  if (token === null) return failure(401, 'bad-token', cors);

  const limited = await limitRequest(request, deps, cors);
  if (limited !== null) return limited;

  const refusal = await checkCoachOwner(fetchImpl, token, deps.ownerLogin, cors);
  if (refusal !== null) return refusal;

  switch (target.route) {
    case 'message':
      return handleMessage(request, token, deps, cors);
    case 'status':
      return handleStatus(token, deps, cors);
    default:
      return forward(deps.stub, upstreamRequest(target.route, token, null), cors);
  }
}
