// Stand-in for the `cloudflare:workers` module, which only exists inside the Workers runtime.
// vitest.config.ts aliases the module here so specs that import index.ts (which re-exports the
// CoachContainer class) can load under plain Node. Nothing in a spec runs these classes.

export class DurableObject {
  constructor(
    readonly ctx: unknown,
    readonly env: unknown,
  ) {}
}

export class WorkerEntrypoint {}
