# digital-signature-field

A hand-drawn signature as a real form field: a framework-free web component (`<digital-signature-field>`) with an Angular wrapper, usable from Angular, React, Vue and plain HTML.

[![npm: @digital-signature-field/element](https://img.shields.io/npm/v/@digital-signature-field/element?label=%40digital-signature-field%2Felement)](https://www.npmjs.com/package/@digital-signature-field/element)
[![npm: @digital-signature-field/angular](https://img.shields.io/npm/v/@digital-signature-field/angular?label=%40digital-signature-field%2Fangular)](https://www.npmjs.com/package/@digital-signature-field/angular)
[![CI](https://github.com/DenysSlobodianyk1996/digital-signature-field/actions/workflows/ci.yml/badge.svg)](https://github.com/DenysSlobodianyk1996/digital-signature-field/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@digital-signature-field/element)](LICENSE)

- **Works as a form field everywhere.** It joins native `<form>`s (`name`, `required`, reset). Angular forms work in every flavour (signal, reactive and template-driven). React and Vue use the element directly.
- **Draws with native Pointer Events, no dependencies.** Mouse, touch and pen, with smoothing and optional pressure.
- **Configurable value**: SVG data URL (default), PNG data URL, or lossless JSON. `null` when empty, with a configurable background (`#fff` by default).
- **Undo / redo / clear**, kept outside the drawing area. Use the built-in buttons, your own buttons in slots, or a fully external toolbar.
- **Shadow DOM, still styleable**: CSS custom properties, `::part()`, and injected style sheets.
- **Accessible**: keyboard shortcuts, ARIA labels and live status, RTL.

## Demos

| Framework | Demo | Source |
| --- | --- | --- |
| Angular (latest) — signal + reactive forms | [https://denysslobodianyk1996.github.io/digital-signature-field/angular/](https://denysslobodianyk1996.github.io/digital-signature-field/angular/) | [`apps/demo-angular`](apps/demo-angular) |
| Angular 17 — CVA mode | [https://denysslobodianyk1996.github.io/digital-signature-field/angular-17/](https://denysslobodianyk1996.github.io/digital-signature-field/angular-17/) | [`apps/demo-angular-17`](apps/demo-angular-17) |
| React 19 | [https://denysslobodianyk1996.github.io/digital-signature-field/react/](https://denysslobodianyk1996.github.io/digital-signature-field/react/) | [`apps/demo-react`](apps/demo-react) |
| Vue 3 | [https://denysslobodianyk1996.github.io/digital-signature-field/vue/](https://denysslobodianyk1996.github.io/digital-signature-field/vue/) | [`apps/demo-vue`](apps/demo-vue) |

All four are deployed as one GitHub Pages site ([index](https://denysslobodianyk1996.github.io/digital-signature-field/)) on every push to `main` (`.github/workflows/pages.yml`, ADR-0010).

## Packages

| Package | What | Peer deps |
| --- | --- | --- |
| `@digital-signature-field/element` | The `<digital-signature-field>` custom element | none |
| `@digital-signature-field/angular` | `<dsf-signature>` component + `dsfCva` directive | `@angular/core` & `@angular/forms` `>=17.2` |

Both packages are always released together with the same version, from GitHub Actions with npm provenance ([CHANGELOG](CHANGELOG.md)).

## Install

### Vanilla JS

```bash
npm i @digital-signature-field/element
```

```html
<form id="consent">
  <digital-signature-field name="signature" required></digital-signature-field>
  <button>Submit</button>
</form>

<script type="module">
  import '@digital-signature-field/element'; // registers <digital-signature-field>

  const form = document.querySelector('#consent');
  const sig = form.querySelector('digital-signature-field');

  sig.addEventListener('change', (e) => console.log(e.detail.value));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;            // `required` → blocked while empty
    const signature = new FormData(form).get('signature'); // "data:image/svg+xml;base64,…"
  });
</script>
```

No bundler? Load it from a CDN: `<script type="module" src="https://cdn.jsdelivr.net/npm/@digital-signature-field/element@1/+esm"></script>`.

### Angular

```bash
npm i @digital-signature-field/angular
```

```ts
import { Component, inject, signal } from '@angular/core';
import { form, required, FormField } from '@angular/forms/signals';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DsfSignature } from '@digital-signature-field/angular';

@Component({
  selector: 'app-consent',
  imports: [DsfSignature, FormField, ReactiveFormsModule],
  template: `
    <!-- Signal forms -->
    <dsf-signature [formField]="consent.signature" valueFormat="png" />

    <!-- Reactive forms -->
    <form [formGroup]="legacy">
      <dsf-signature formControlName="signature" />
    </form>

    <!-- No forms: two-way binding -->
    <dsf-signature [(value)]="draft" actions="undo redo clear" />
  `,
})
export class ConsentComponent {
  model = signal({ signature: null as string | null });
  consent = form(this.model, (p) => required(p.signature));

  legacy = inject(FormBuilder).group({ signature: [null, Validators.required] });
  draft = signal<string | null>(null);
}
```

> **Angular 17–21: add the `dsfCva` attribute.** Before Angular 22, Angular forms (`formControlName`, `[formControl]`, `ngModel`) can only bind to components that provide a `ControlValueAccessor`. Adding `dsfCva` turns on **CVA mode**: a small directive that provides one for `<dsf-signature>`. Import `DsfSignatureCva` next to `DsfSignature` and write `<dsf-signature dsfCva formControlName="signature" />`. On Angular 22+ leave it off: the component already works with every forms flavour. Never combine `dsfCva` with `[formField]`.

### React 19

```bash
npm i @digital-signature-field/element
```

```tsx
import '@digital-signature-field/element';
import type { DigitalSignatureFieldElement } from '@digital-signature-field/element';
import { useEffect, useRef } from 'react';

export function SignatureInput({ onChange }: { onChange: (v: string | null) => void }) {
  const ref = useRef<DigitalSignatureFieldElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const handle = (e: Event) => onChange((e as CustomEvent).detail.value);
    el.addEventListener('change', handle);
    return () => el.removeEventListener('change', handle);
  }, [onChange]);

  return (
    <digital-signature-field
      ref={ref}
      name="signature"
      required
      actions="undo redo clear"
      labels={{ clear: 'Start over' }}
    />
  );
}
```

Inside a plain `<form>`, the value is in `FormData` on submit, and `required` blocks submitting while the field is empty:

```tsx
import { useState, type FormEvent } from 'react';
import { SignatureInput } from './SignatureInput';

export function App() {
  const [signature, setSignature] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<FormDataEntryValue | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); // `required` has already blocked submits while the field was empty
    setSubmitted(new FormData(e.currentTarget).get('signature'));
  }

  return (
    <form onSubmit={onSubmit}>
      <SignatureInput onChange={setSignature} />
      {signature && <img src={signature} alt="Your signature" />}
      <button>Submit</button>
      {submitted && <output>{String(submitted)}</output>}
    </form>
  );
}
```

- Bind with a `ref` and listen to `change` with `addEventListener`. React's `onChange` prop is for its own synthetic events, not the element's `change`.
- React 19 passes props to custom elements as **properties** when the element has one, so objects and arrays work directly: `labels={{…}}`, `penColors={[…]}`.
- JSX types: add `"types": ["@digital-signature-field/element/jsx-react"]` to `tsconfig.json` (needs `@types/react` 19).

Full demo: [`apps/demo-react`](apps/demo-react).

### Vue 3

```bash
npm i @digital-signature-field/element
```

```ts
// vite.config.ts — tell Vue the tag is a custom element
vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'digital-signature-field' } } }),
```

```vue
<script setup lang="ts">
import '@digital-signature-field/element';
import { ref } from 'vue';

const signature = ref<string | null>(null);
const submitted = ref<FormDataEntryValue | null>(null);

function onSubmit(event: SubmitEvent) {
  submitted.value = new FormData(event.target as HTMLFormElement).get('signature');
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <digital-signature-field
      :value="signature"
      @change="signature = $event.detail.value"
      name="signature"
      required
      actions="undo redo clear"
      :labels.prop="{ clear: 'Start over' }"
    />
    <img v-if="signature" :src="signature" alt="Your signature" />
    <button>Submit</button>
    <output v-if="submitted">{{ submitted }}</output>
  </form>
</template>
```

- `:value` + `@change` is the `v-model` equivalent. Writing back the value the field just emitted does nothing, so undo history is kept.
- Use `.prop` for objects and arrays: `:labels.prop="{ clear: 'Start over' }"`.
- Types for templates: declare the tag in `GlobalComponents` (in any `.d.ts` file your `tsconfig.json` includes). `$event` in `@change` is then typed.

```ts
// Declares <digital-signature-field> for Vue templates, so props and `$event` are type-checked.
import type { HistoryState, Labels, SignatureData } from '@digital-signature-field/element';
import type { HTMLAttributes } from 'vue';

interface DigitalSignatureFieldProps extends HTMLAttributes {
  value?: string | SignatureData | null;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  actions?: string;
  labels?: Partial<Labels>;
  penColors?: readonly string[];
  onChange?: (event: CustomEvent<{ value: string | null }>) => void;
  'onDsf-history-change'?: (event: CustomEvent<HistoryState>) => void;
}

declare module 'vue' {
  interface GlobalComponents {
    'digital-signature-field': new () => { $props: DigitalSignatureFieldProps };
  }
}
```

Full demo: [`apps/demo-vue`](apps/demo-vue).

## Customise

```css
digital-signature-field {
  --dsf-height: 240px;
  --dsf-area-bg: #fffdf5;
  --dsf-radius: 12px;
}
digital-signature-field::part(action-clear) { color: crimson; }
```

```js
sig.styles = `.area { background-image: url(paper.png); }`; // escape hatch, not covered by semver
```

| Want | Set |
| --- | --- |
| Which buttons | `actions="undo redo clear"` · `"none"` for headless |
| Where | `actions-position="bottom|top|start|end"` |
| Value type | `value-format="svg|png|json"` |
| Export background | `background="#fff"` · `"transparent"` |
| Pen | `pen-color`, `pen-width`, `pressure`, `smoothing` |
| Validity | `required`, `min-strokes`, `min-stroke-length` |
| Translations | `labels` property |

See the five layout variants in [docs/variants](docs/variants/README.md) and the full [API reference](docs/api.md).

## Documentation

- [GLOSSARY.md](GLOSSARY.md) — the domain language
- [docs/api.md](docs/api.md) — properties, methods, events, parts, Angular wrapper
- [docs/variants](docs/variants/README.md) — five layout and integration variants with wireframes and code
- [docs/adr](docs/adr) — architecture decisions
- [docs/legacy-analysis.md](docs/legacy-analysis.md) — what the original Angular 9 component did and the bugs this design fixes

## Development

Nx + pnpm monorepo:

```
packages/element      packages/angular
apps/demo-angular     apps/demo-angular-17     apps/demo-react     apps/demo-vue
apps/site              # GitHub Pages site: assembles the four demos under their sub-paths
```

```bash
pnpm install
pnpm nx serve demo-angular        # or demo-react / demo-vue / demo-angular-17
pnpm nx run-many -t test e2e
pnpm nx e2e-pages site            # build the Pages site into apps/site/dist and check it
pnpm nx run-many -t pack          # npm pack --dry-run: what each package would publish
```

Releases run from GitHub Actions only (`.github/workflows/release.yml`), automatically on every push to `main`. The first release is `1.0.0`; after that `nx release` picks the next version from the conventional commits since the last tag (`fix` → patch, `feat` → minor, `!` or `BREAKING CHANGE` → major; `chore`, `docs`, `test` and `ci` alone release nothing), updates `CHANGELOG.md`, tags `v<version>`, and publishes both packages with one shared version and npm provenance through npm trusted publishing (ADR-0009). **Actions → Release → Run workflow** gives a dry run or an explicit version; pushing a `v*` tag publishes that tag's versions.

## License

[MIT](LICENSE)
