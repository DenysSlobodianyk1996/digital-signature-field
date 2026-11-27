import { defineConfig } from 'vitest/config';

// Merged by the Angular unit-test builder (`runnerConfig`). The build target needs
// `preserveSymlinks` so the wrapper (linked from packages/angular/dist) uses this app's Angular,
// but Vitest's own dependencies only resolve through real paths under pnpm. So keep real paths
// here and dedupe Angular instead: one copy, from this app.
export default defineConfig({
  resolve: {
    preserveSymlinks: false,
    dedupe: ['@angular/core', '@angular/common', '@angular/forms', '@angular/platform-browser', 'rxjs'],
  },
});
