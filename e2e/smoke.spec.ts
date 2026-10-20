import { expect, test } from '@playwright/test';

const MIN_PRACTICE_ROWS = 100;
const LOCAL_HOSTNAME = 'localhost';
const SESSION_KEY = 'po-auth-session';
const OWNER_SESSION = JSON.stringify({
  token: 'e2e',
  login: 'michael-yrao',
  expiresAt: null,
  refreshToken: null,
  refreshExpiresAt: null,
});
const COACH_CHIPS = ["I'm stuck", 'Done with this one', 'Close out the day', 'Close out the week'];

// Smoke tests must not depend on the network: abort anything that is not the local server
// (the GitHub contract fetches, fonts) so the page settles on its bundled data.
test.beforeEach(async ({ page }) => {
  await page.route(
    (url) => url.hostname !== LOCAL_HOSTNAME,
    (route) => route.abort(),
  );
});

test('the home page shows the top nav', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /progressive.*overflow.*home/i })).toBeVisible();
});

test('the practice list shows at least 100 problems', async ({ page }) => {
  await page.goto('/practice');
  await expect
    .poll(() => page.locator('.practice-list__row').count())
    .toBeGreaterThanOrEqual(MIN_PRACTICE_ROWS);
});

test('a practice page shows the problem title', async ({ page }) => {
  await page.goto('/practice/1');
  await expect(page.getByRole('heading', { level: 1, name: /Two Sum/ })).toBeVisible();
});

test('the coach toggle opens the panel with its four chips', async ({ page }) => {
  // The init script runs in the page, so the key and value travel as its argument, not as closure variables.
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: SESSION_KEY,
    value: OWNER_SESSION,
  });
  // The free deploy answers enabled:false and hides the toggle; the smoke stubs an enabled coach.
  await page.route('**/coach/status', (route) =>
    route.fulfill({
      json: { enabled: true, awake: false, busy: false, sessionId: null, repoHead: null, dirty: false, sessionCostUsd: 0 },
    }),
  );
  await page.goto('/practice/1');
  await page.getByRole('button', { name: 'Open coach' }).click();
  const panel = page.locator('#po-coach');
  await expect(panel).toBeVisible();
  for (const chip of COACH_CHIPS) await expect(panel).toContainText(chip);
});

test('the solution page steps forward once', async ({ page }) => {
  await page.goto('/practice/1/solution');
  await page.getByRole('button', { name: /Start Visualization/ }).click();
  await expect(page.getByText(/^Step 1 \/ \d+$/)).toBeVisible();
  await page.getByRole('button', { name: 'Step forward' }).click();
  await expect(page.getByText(/^Step 2 \/ \d+$/)).toBeVisible();
});
