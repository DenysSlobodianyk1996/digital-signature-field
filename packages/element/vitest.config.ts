import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

type Browser = 'chromium' | 'firefox' | 'webkit';

// Seam 1: the element's public contract, tested in real browsers.
// All three engines by default (as CI runs them). Narrow locally with
// DSF_BROWSERS=chromium,webkit when an engine can't launch on your machine.
const browsers = (process.env['DSF_BROWSERS'] ?? 'chromium,firefox,webkit')
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean) as Browser[];

export default defineConfig({
  resolve: {
    // Tests import the package by its public name; resolve it to the source.
    alias: {
      '@digital-signature-field/element': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      screenshotFailures: false,
      instances: browsers.map((browser) => ({ browser })),
    },
  },
});
