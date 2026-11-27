import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // Tell Vue the tag is a custom element.
    vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'digital-signature-field' } } }),
  ],
  // Sub-path the demo is served from, e.g. `/digital-signature-field/vue/` on GitHub Pages (must end in `/`).
  base: process.env.DSF_DEMO_BASE ?? '/',
  build: { outDir: 'dist', emptyOutDir: true },
});
