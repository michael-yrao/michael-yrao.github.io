import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Standalone Vitest config for the worker: plain Node, no Angular/jsdom. Kept entirely
// inside worker/ so it never interacts with the Angular app's own vitest run. It runs src/**
// only, so the coach container runtime in worker/coach/ is tested by its own config.
export default defineConfig({
  resolve: {
    alias: {
      // The Workers-only module that @cloudflare/containers imports; see the stub for why.
      'cloudflare:workers': fileURLToPath(new URL('./test-stubs/cloudflare-workers.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    server: { deps: { inline: ['@cloudflare/containers'] } },
  },
});
