import { Container, getContainer } from '@cloudflare/containers';
import type { CoachVars } from './handler';

// Imports `cloudflare:workers` through @cloudflare/containers, so only index.coach.ts may
// import this file. Specs inject a fake stub through the handler's deps instead.

const CONTAINER_PORT = 8080;
const IDLE_SLEEP_AFTER = '30m';
const OWNER_INSTANCE_NAME = 'owner';

export class CoachContainer extends Container<CoachVars> {
  defaultPort = CONTAINER_PORT;
  sleepAfter = IDLE_SLEEP_AFTER;

  constructor(ctx: ConstructorParameters<typeof Container>[0], env: CoachVars) {
    super(ctx, env);
    this.envVars = {
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      COACH_GIT_NAME: env.COACH_GIT_NAME,
      COACH_GIT_EMAIL: env.COACH_GIT_EMAIL,
      COACH_TZ: env.COACH_TZ,
    };
  }
}

/** The one container instance, addressed by a fixed name. Getting the stub does not start it. */
export function getCoachStub(binding: DurableObjectNamespace<CoachContainer>) {
  return getContainer(binding, OWNER_INSTANCE_NAME);
}
