import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The README's React recipe is copied from this demo; keep them identical.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').trimEnd();

for (const file of ['src/SignatureInput.tsx', 'src/App.tsx']) {
  test(`README React section matches ${file}`, () => {
    expect(read('../../../README.md')).toContain(read(`../${file}`));
  });
}
