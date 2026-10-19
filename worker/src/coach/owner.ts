import { failure, fetchUser, type FetchImpl, type HeaderMap } from '../github/write-file';

/**
 * Null when the token belongs to the owner (login compared case-insensitively); else the refusing
 * response: 401 bad-token, 502 github-error, 403 not-owner.
 */
export async function checkCoachOwner(
  fetchImpl: FetchImpl,
  token: string,
  ownerLogin: string,
  cors: HeaderMap,
): Promise<Response | null> {
  const user = await fetchUser(fetchImpl, token);
  if (user.kind === 'bad-token') return failure(401, 'bad-token', cors);
  if (user.kind === 'error') return failure(502, 'github-error', cors);
  return user.login.toLowerCase() === ownerLogin.toLowerCase() ? null : failure(403, 'not-owner', cors);
}
