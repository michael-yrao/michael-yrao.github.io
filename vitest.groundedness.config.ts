import { defineConfig } from 'vitest/config';

// Standalone Vitest config for the groundedness CI gate (ci/groundedness.check.ts). This is
// separate from the Angular unit-test builder's own Vitest run: the check imports only plain
// TS/data modules (no Angular, no DOM), so it runs under plain Node instead of jsdom.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['ci/**/*.check.ts'],
  },
});
