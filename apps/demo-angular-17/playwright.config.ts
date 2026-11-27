import { defineConfig, devices } from '@playwright/test';

const port = 4317;

// Seam 3: smoke test against the production build (`nx build demo-angular-17` runs first).
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  forbidOnly: !!process.env['CI'],
  reporter: process.env['CI'] ? 'line' : 'list',
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `vite preview --outDir dist/browser --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env['CI'],
  },
});
