// The demo has nothing to compile: the build copies the page (src/) and the element's package build
// (packages/element/dist, as dist/element/) into dist/, which any static server can serve under any path.
import { cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const app = new URL('../', import.meta.url);
const out = fileURLToPath(new URL('dist/', app));
const element = fileURLToPath(new URL('../../packages/element/dist/', app));

await rm(out, { recursive: true, force: true });
await cp(fileURLToPath(new URL('src/', app)), out, { recursive: true });
await cp(element, `${out}element/`, { recursive: true, filter: (path) => !path.endsWith('.d.ts') });
console.log(`demo-html assembled in ${out}`);
