import { defineConfig, devices } from '@playwright/test';

// End-to-end check of the assembled GitHub Pages site (`nx build-pages site` runs first),
// served by a local server that mimics GitHub Pages (sub-path, directory redirects, 404.html fallback).
const port = 4390;
const base = process.env.DSF_SITE_BASE ?? '/digital-signature-field/';

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${port}${base}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node e2e/pages-server.mjs`,
    url: `http://localhost:${port}${base}`,
    env: { PORT: String(port), DSF_SITE_BASE: base },
    reuseExistingServer: !process.env.CI,
  },
});
