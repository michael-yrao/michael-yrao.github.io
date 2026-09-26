import { defineConfig } from 'vitest/config';

// Standalone Vitest config for the worker: plain Node, no Angular/jsdom. Kept entirely
// inside worker/ so it never interacts with the Angular app's own vitest run.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
