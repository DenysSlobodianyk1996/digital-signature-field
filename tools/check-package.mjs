#!/usr/bin/env node
// Checks what `npm publish` would upload for one package directory (the published root):
// `node tools/check-package.mjs <dir>`. Runs `npm pack --dry-run` and fails when the tarball
// holds anything besides build output, types, README and LICENSE, or when the manifest is not
// publishable (workspace: protocols, pnpm's publishConfig.directory, missing metadata, sibling
// packages at a different version). Used by each package's `pack` target in CI (#18).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPOSITORY = 'https://github.com/DenysSlobodianyk1996/digital-signature-field';
const HOMEPAGE = 'https://denysslobodianyk1996.github.io/digital-signature-field/';
const SCOPE = '@digital-signature-field/';

const dir = resolve(process.argv[2] ?? '.');
const manifest = JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8'));
const errors = [];

const [pack] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: dir, encoding: 'utf8' }),
);
const files = pack.files.map((f) => f.path);

const isAllowed = (path) =>
  ['package.json', 'README.md', 'LICENSE'].includes(path) ||
  (/\.(m?js|d\.m?ts|map)$/.test(path) && !/(^|\/)(src|test|e2e)\//.test(path) && !/\.(test|spec)\.|test-utils/.test(path));

for (const path of files) if (!isAllowed(path)) errors.push(`unexpected file in tarball: ${path}`);
for (const required of ['package.json', 'README.md', 'LICENSE']) {
  if (!files.includes(required)) errors.push(`missing from tarball: ${required}`);
}
if (!files.some((path) => /\.m?js$/.test(path))) errors.push('no JavaScript build output in tarball');
if (!files.some((path) => /\.d\.m?ts$/.test(path))) errors.push('no type declarations in tarball');

if (manifest.private) errors.push('package is private');
if (manifest.license !== 'MIT') errors.push(`license is ${manifest.license}, expected MIT`);
if (manifest.repository?.url !== REPOSITORY) {
  errors.push(`repository.url must be exactly ${REPOSITORY} (npm trusted publishing), got ${manifest.repository?.url}`);
}
if (manifest.homepage !== HOMEPAGE) errors.push(`homepage must be ${HOMEPAGE}, got ${manifest.homepage}`);
if (!manifest.bugs?.url) errors.push('bugs.url is missing');
if (!manifest.description) errors.push('description is missing');
if (!Array.isArray(manifest.keywords) || manifest.keywords.length === 0) errors.push('keywords are missing');
if (manifest.publishConfig?.directory || manifest.publishConfig?.linkDirectory) {
  errors.push('publishConfig.directory/linkDirectory are workspace-only settings and must not be published');
}
if (manifest.publishConfig?.access !== 'public') errors.push('publishConfig.access must be "public"');

for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
  for (const [name, range] of Object.entries(manifest[field] ?? {})) {
    if (range.startsWith('workspace:')) errors.push(`${field}.${name} uses the unpublishable range "${range}"`);
    else if (name.startsWith(SCOPE) && range !== manifest.version) {
      errors.push(`${field}.${name} is "${range}", expected the same version as this package (${manifest.version})`);
    }
  }
}

if (errors.length > 0) {
  console.error(`${manifest.name}@${manifest.version} (${dir}) is not publishable:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`${manifest.name}@${manifest.version}: ${files.length} files OK\n  ${files.join('\n  ')}`);
