import { expect, test } from '@playwright/test';

const MIN_PRACTICE_ROWS = 100;
const LOCAL_HOSTNAME = 'localhost';

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

test('the solution page steps forward once', async ({ page }) => {
  await page.goto('/practice/1/solution');
  await page.getByRole('button', { name: /Start Visualization/ }).click();
  await expect(page.getByText(/^Step 1 \/ \d+$/)).toBeVisible();
  await page.getByRole('button', { name: 'Step forward' }).click();
  await expect(page.getByText(/^Step 2 \/ \d+$/)).toBeVisible();
});
