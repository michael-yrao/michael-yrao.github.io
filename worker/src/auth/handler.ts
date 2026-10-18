import {
  failure,
  fetchUser,
  gateOrigin,
  HTTP_OK,
  isRecord,
  jsonResponse,
  preflight,
  readJson,
  type FetchImpl,
  type HeaderMap,
  type PatternSenseEnv,
} from '../pattern-sense/handler';

export const ROUTE_PREFIX = '/auth/';

const EXCHANGE_URL = 'https://github.com/login/oauth/access_token';
const MS_PER_SECOND = 1000;
const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const HTTP_METHOD_NOT_ALLOWED = 405;
const HTTP_BAD_GATEWAY = 502;

type FormParams = Record<string, string>;

/** The string value of a non-empty string field on a JSON body, else undefined. */
async function readStringField(request: Request, field: string): Promise<string | undefined> {
  const body: unknown = await request.json().catch(() => null);
  const value = isRecord(body) ? body[field] : undefined;
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** An ISO time `seconds` from now, or null when GitHub omitted the field. */
function expiryFrom(seconds: unknown): string | null {
  return typeof seconds === 'number'
    ? new Date(Date.now() + seconds * MS_PER_SECOND).toISOString()
    : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Posts the params to GitHub's token endpoint, then looks up the login; the shared body of token and refresh. */
async function exchange(
  env: PatternSenseEnv,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
  params: FormParams,
): Promise<Response> {
  const upstream = await fetchImpl(EXCHANGE_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      ...params,
    }),
  });
  const exchanged = upstream.status === HTTP_OK ? await readJson(upstream) : null;
  if (!isRecord(exchanged) || typeof exchanged['access_token'] !== 'string') {
    return failure(HTTP_BAD_GATEWAY, 'exchange-failed', cors);
  }
  const token = exchanged['access_token'];

  const user = await fetchUser(fetchImpl, token);
  if (user.kind !== 'ok') return failure(HTTP_BAD_GATEWAY, 'exchange-failed', cors);
  return jsonResponse(
    HTTP_OK,
    {
      token,
      login: user.login,
      expiresAt: expiryFrom(exchanged['expires_in']),
      refreshToken: optionalString(exchanged['refresh_token']),
      refreshExpiresAt: expiryFrom(exchanged['refresh_token_expires_in']),
    },
    cors,
  );
}

async function handleToken(
  request: Request,
  env: PatternSenseEnv,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const code = await readStringField(request, 'code');
  if (code === undefined) return failure(HTTP_BAD_REQUEST, 'missing-code', cors);
  return exchange(env, fetchImpl, cors, { code });
}

async function handleRefresh(
  request: Request,
  env: PatternSenseEnv,
  fetchImpl: FetchImpl,
  cors: HeaderMap,
): Promise<Response> {
  const refreshToken = await readStringField(request, 'refreshToken');
  if (refreshToken === undefined) return failure(HTTP_BAD_REQUEST, 'missing-refresh-token', cors);
  return exchange(env, fetchImpl, cors, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
}

export async function handle(
  request: Request,
  env: PatternSenseEnv,
  fetchImpl: FetchImpl,
): Promise<Response> {
  const cors = gateOrigin(request, env);
  if (cors instanceof Response) return cors;

  if (request.method === 'OPTIONS') return preflight(cors);
  if (request.method !== 'POST') return failure(HTTP_METHOD_NOT_ALLOWED, 'method-not-allowed', cors);

  const { pathname } = new URL(request.url);
  if (pathname === `${ROUTE_PREFIX}token`) return handleToken(request, env, fetchImpl, cors);
  if (pathname === `${ROUTE_PREFIX}refresh`) return handleRefresh(request, env, fetchImpl, cors);
  return failure(HTTP_NOT_FOUND, 'not-found', cors);
}
