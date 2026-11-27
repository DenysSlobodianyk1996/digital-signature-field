import { expect, test, type Page } from '@playwright/test';

// The assembled Pages site, served the way GitHub Pages serves it (see pages-server.mjs).
const demos = [
  { path: 'angular', link: 'Angular', heading: 'digital-signature-field · Angular' },
  { path: 'angular-17', link: 'Angular 17', heading: 'digital-signature-field · Angular 17' },
  { path: 'react', link: 'React 19', heading: 'digital-signature-field · React 19' },
  { path: 'vue', link: 'Vue 3', heading: 'digital-signature-field · Vue 3' },
];

/**
 * Collects failed asset requests (missing files under the sub-path). Documents are left out:
 * a deep link's first response is GitHub Pages' 404.html, which is how the fallback works.
 */
function failedRequests(page: Page): string[] {
  const failed: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400 && response.request().resourceType() !== 'document')
      failed.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', (request) => failed.push(`failed ${request.url()}`));
  return failed;
}

/** The demo booted: its heading rendered and the custom element upgraded (its shadow root holds the drawing area). */
async function expectDemo(page: Page, heading: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await expect(page.locator('digital-signature-field [part~="area"]').first()).toBeVisible();
}

test('the site root links all four demos', async ({ page }) => {
  await page.goto('./');
  for (const demo of demos) {
    await expect(page.getByRole('link', { name: demo.link, exact: true })).toHaveAttribute('href', `${demo.path}/`);
  }
});

for (const demo of demos) {
  test.describe(`/${demo.path}/`, () => {
    test('opens from the index with every asset loading under the sub-path', async ({ page }) => {
      const failed = failedRequests(page);
      await page.goto('./');
      await page.getByRole('link', { name: demo.link, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/digital-signature-field/${demo.path}/$`));
      await expectDemo(page, demo.heading);
      expect(failed).toEqual([]);
    });

    test('a deep link loads the demo and keeps its URL', async ({ page }) => {
      const failed = failedRequests(page);
      await page.goto(`./${demo.path}/some/deep/route?tab=2#sign`);
      await expectDemo(page, demo.heading);
      expect(new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash).toBe(
        `/digital-signature-field/${demo.path}/some/deep/route?tab=2#sign`,
      );
      expect(failed).toEqual([]);
    });

    test('refreshing a deep link still loads the demo', async ({ page }) => {
      await page.goto(`./${demo.path}/some/deep/route`);
      await expectDemo(page, demo.heading);
      await page.reload();
      await expectDemo(page, demo.heading);
      expect(new URL(page.url()).pathname).toBe(`/digital-signature-field/${demo.path}/some/deep/route`);
    });
  });
}

test('an unknown path outside the demos shows a not-found page linking home', async ({ page }) => {
  const response = await page.goto('./no-such-demo/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'All demos' }).click();
  await expect(page).toHaveURL(/\/digital-signature-field\/$/);
});
