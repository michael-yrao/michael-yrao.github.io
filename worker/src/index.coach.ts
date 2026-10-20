import { CoachContainer, getCoachStub } from './coach/container';
import type { CoachVars, CoachWiring } from './coach/handler';
import { LimiterUnavailableError } from './interviews/handler';
import { buildFetch, type Env, type RateLimiter } from './worker';

// Wrangler finds the Durable Object class on the main module's exports.
export { CoachContainer };

/** The bindings only the coach deploy (wrangler.coach.toml) declares. */
export interface CoachWorkerEnv extends Env, Partial<CoachVars> {
  COACH?: DurableObjectNamespace<CoachContainer>;
  COACH_REQUESTS?: RateLimiter;
}

/** The coach wiring for one request; null when the container binding or the owner login is missing. */
function coachWiringFor(env: CoachWorkerEnv): CoachWiring | null {
  const { COACH: binding, COACH_REQUESTS: limiter, OWNER_LOGIN: ownerLogin } = env;
  if (binding === undefined || ownerLogin === undefined) return null;
  return {
    stub: getCoachStub(binding),
    ownerLogin,
    limit: async (key: string) => {
      // Fail closed, like the interview limiters: no binding means no request.
      if (limiter === undefined) throw new LimiterUnavailableError();
      return (await limiter.limit({ key })).success;
    },
  };
}

export default { fetch: buildFetch(coachWiringFor) };
