import { buildFetch } from './worker';

// The default deploy: no coach runtime. This entry must never import coach/container.ts, directly or
// transitively, so the free-plan bundle carries no Durable Object or container code.
export default { fetch: buildFetch(null) };
