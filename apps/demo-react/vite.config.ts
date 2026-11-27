import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Sub-path the demo is served from, e.g. `/digital-signature-field/react/` on GitHub Pages (must end in `/`).
  base: process.env.DSF_DEMO_BASE ?? '/',
  build: { outDir: 'dist', emptyOutDir: true },
});
