import { defineConfig, devices } from '@playwright/test';

// Smoke test (seam 3) against the assembled page in dist/, served statically under the same base path.
const port = 4339;
const base = process.env.DSF_DEMO_BASE ?? '/';

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
    // vite is used only as a static file server here; the page itself is not bundled.
    command: `vite preview --outDir dist --base ${base} --port ${port} --strictPort`,
    url: `http://localhost:${port}${base}`,
    reuseExistingServer: !process.env.CI,
  },
});
