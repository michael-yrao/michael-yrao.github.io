import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;
const CI_RETRIES = 1;
const SERVER_START_TIMEOUT_MS = 60_000;

// Smoke tests run against the production build (`npm run build` → dist/progressive-overflow),
// served statically with an SPA fallback so deep links resolve like they do on GitHub Pages.
export default defineConfig({
  testDir: 'e2e',
  retries: process.env['CI'] ? CI_RETRIES : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: BASE_URL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx serve -s dist/progressive-overflow -l ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env['CI'],
    timeout: SERVER_START_TIMEOUT_MS,
  },
});
