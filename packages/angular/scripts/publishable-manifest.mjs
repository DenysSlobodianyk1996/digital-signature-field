// Runs after ng-packagr: makes dist/package.json the manifest that gets published (#18).
// ng-packagr copies the workspace manifest, which only makes sense inside this repo:
// - publishConfig.directory/linkDirectory point pnpm's workspace link at dist (see CLAUDE.md);
// - `workspace:*` pins the element to this repo's copy.
// Both are replaced: the element dependency becomes its exact current version, which `nx release`
// keeps equal to this package's version (one fixed version for both packages, ADR-0009).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const manifestPath = new URL('../dist/package.json', import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const require = createRequire(new URL('../package.json', import.meta.url));

for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const [name, range] of Object.entries(manifest[field] ?? {})) {
    if (range.startsWith('workspace:')) {
      manifest[field][name] = require(`${name}/package.json`).version;
    }
  }
}

delete manifest.publishConfig?.directory;
delete manifest.publishConfig?.linkDirectory;
delete manifest.scripts;

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
