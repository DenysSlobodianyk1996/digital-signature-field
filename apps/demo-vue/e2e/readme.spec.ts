import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The README's Vue recipe is copied from this demo; keep them identical.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').trimEnd();

for (const file of ['src/App.vue', 'src/digital-signature-field.d.ts']) {
  test(`README Vue section matches ${file}`, () => {
    expect(read('../../../README.md')).toContain(read(`../${file}`));
  });
}

test('README Vue section matches the isCustomElement setting in vite.config.ts', () => {
  const setting = read('../vite.config.ts').match(/vue\(\{ template: .*\),/)![0];
  expect(read('../../../README.md')).toContain(setting);
});
