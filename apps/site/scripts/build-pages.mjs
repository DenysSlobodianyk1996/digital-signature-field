// Assembles the GitHub Pages site (ADR-0010): builds each demo app with its base path set to
// its Pages sub-path, copies the builds into one site directory (apps/site/dist), and adds the
// site index and the 404.html fallback that sends deep links back to the right demo.
import { execFileSync } from 'node:child_process';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('../../../', import.meta.url));
const src = new URL('../src/', import.meta.url);
const out = fileURLToPath(new URL('../dist/', import.meta.url));

// Where GitHub Pages serves the project site (https://<owner>.github.io/<repo>/). Must end in `/`.
const siteBase = process.env.DSF_SITE_BASE ?? '/digital-signature-field/';

/** Pages sub-path -> Nx project and its build output (the directory holding index.html). */
const demos = [
  { path: 'angular', project: 'demo-angular', dist: 'apps/demo-angular/dist/browser' },
  { path: 'angular-17', project: 'demo-angular-17', dist: 'apps/demo-angular-17/dist/browser' },
  { path: 'react', project: 'demo-react', dist: 'apps/demo-react/dist' },
  { path: 'vue', project: 'demo-vue', dist: 'apps/demo-vue/dist' },
];

// Runs first in every demo page: restores the deep link that 404.html folded into `?dsf-route=`,
// before the app (and any client-side router) reads the URL.
const restoreRoute = `<script>(function(){var q=new URLSearchParams(location.search),r=q.get('dsf-route');if(r!==null)history.replaceState(null,'',location.pathname+r.replace(/^\\//,'')+location.hash);})();</script>`;

await rm(out, { recursive: true, force: true });

for (const demo of demos) {
  const base = `${siteBase}${demo.path}/`;
  console.log(`\nBuilding ${demo.project} for ${base}`);
  execFileSync('pnpm', ['nx', 'build', demo.project, '--outputStyle=static'], {
    cwd: workspace,
    stdio: 'inherit',
    env: { ...process.env, DSF_DEMO_BASE: base },
  });
  const target = `${out}${demo.path}`;
  await cp(`${workspace}${demo.dist}`, target, { recursive: true });
  const index = `${target}/index.html`;
  const html = await readFile(index, 'utf8');
  if (!html.includes('<head>')) throw new Error(`${demo.project}: no <head> in ${index}`);
  await writeFile(index, html.replace('<head>', `<head>\n    ${restoreRoute}`));
}

const fill = (html) =>
  html.replaceAll('%SITE_BASE%', siteBase).replaceAll('%DEMO_PATHS%', JSON.stringify(demos.map((d) => d.path)));
await writeFile(`${out}index.html`, fill(await readFile(new URL('index.html', src), 'utf8')));
await writeFile(`${out}404.html`, fill(await readFile(new URL('404.html', src), 'utf8')));
// Serve files as-is (no Jekyll processing of the build output).
await writeFile(`${out}.nojekyll`, '');

console.log(`\nPages site assembled in ${out} for ${siteBase}`);
